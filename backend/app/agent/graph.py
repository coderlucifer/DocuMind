# =============================================================================
# DocuMind — LangGraph Agent Graph
# Multi-step agentic RAG pipeline with self-reflection loop
# =============================================================================
#
# Graph Flow:
#   Query → Planner → Retriever → Generator → Critic
#                         ↑                        │
#                         └── (if low confidence) ──┘
#
# =============================================================================

import uuid
import time
import structlog
import asyncio
from typing import AsyncGenerator, Dict, Any, Optional
from dataclasses import asdict
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.state import AgentState
from app.agent.nodes.planner import plan_query
from app.agent.nodes.retriever import retrieve
from app.agent.nodes.generator import generate_answer
from app.agent.nodes.critic import critique_answer
from app.models import QueryHistory
from app.config import settings
from app.services.evaluation import evaluate_query
from app.database import async_session

async def run_eval_bg(query_id: uuid.UUID, query_text: str, answer_text: str, contexts: list, document_id: uuid.UUID):
    async with async_session() as session:
        await evaluate_query(query_id, query_text, answer_text, contexts, document_id, session)

logger = structlog.get_logger(__name__)


async def run_agent_pipeline(
    query: str,
    document_id: uuid.UUID,
    db: AsyncSession,
    user_id: str,
    conversation_id: uuid.UUID | None = None,
) -> AgentState:
    """
    Execute the full agentic RAG pipeline.

    Flow:
    1. PLAN: Analyze query complexity, decompose if needed
    2. RETRIEVE: Hybrid search (semantic + BM25 + RRF)
    3. GENERATE: Synthesize answer with citations
    4. CRITIQUE: Self-evaluate for hallucination/confidence
    5. (Loop back to 2 if quality is low)

    Args:
        query: User's question
        document_id: UUID of the document to query
        db: Async database session

    Returns:
        Final AgentState with answer, citations, and agent steps
    """
    start_time = time.time()

    # Initialize state
    state = AgentState(
        original_query=query,
        document_id=document_id,
        max_iterations=settings.max_retrieval_iterations,
    )

    logger.info("Agent pipeline started", query=query[:100], document_id=str(document_id))

    # ── Step 1: Plan ─────────────────────────────────────────────────────
    state = await plan_query(state)

    # ── Steps 2-4: Retrieve → Generate → Critique (with loop) ───────────
    while True:
        # Step 2: Retrieve
        state = await retrieve(state, db)

        # Step 3: Generate
        state = await generate_answer(state)

        # Step 4: Critique
        state = await critique_answer(state)

        # Check if we should re-retrieve
        if not state.needs_re_retrieval:
            break

        logger.info(
            "Re-retrieval loop",
            iteration=state.iteration_count,
            confidence=state.confidence_score,
        )

    # Calculate latency
    latency_ms = int((time.time() - start_time) * 1000)

    # ── Save query history ───────────────────────────────────────────────
    query_record = QueryHistory(
        user_id=user_id,
        document_id=document_id,
        conversation_id=conversation_id,
        query_text=query,
        answer_text=state.answer,
        citations=state.citations,
        agent_steps=state.agent_steps,
        sub_queries=state.sub_queries,
        latency_ms=latency_ms,
        cached=False,
    )
    db.add(query_record)
    await db.flush()
    await db.refresh(query_record)
    await db.commit()

    contexts = [c.get("text_snippet", "") for c in state.citations]
    asyncio.create_task(run_eval_bg(query_record.id, query, state.answer, contexts, document_id))

    state.log_step(
        "complete",
        f"Pipeline finished in {latency_ms}ms with {state.iteration_count} re-retrieval(s)",
        latency_ms=latency_ms,
        query_id=str(query_record.id),
    )

    logger.info(
        "Agent pipeline complete",
        latency_ms=latency_ms,
        iterations=state.iteration_count,
        confidence=state.confidence_score,
        citation_count=len(state.citations),
    )

    return state


async def stream_agent_pipeline(
    query: str,
    document_id: uuid.UUID,
    db: AsyncSession,
    user_id: str,
    conversation_id: uuid.UUID | None = None,
) -> AsyncGenerator[Dict[str, Any], None]:
    """
    Stream the agent pipeline execution via SSE.

    Yields events for each step so the frontend can show real-time progress:
    - planning: Query decomposition result
    - retrieving: Search results being fetched
    - generating: Answer being constructed
    - critiquing: Self-evaluation result
    - re_retrieving: Re-retrieval triggered
    - complete: Final answer with citations

    Args:
        query: User's question
        document_id: UUID of the document
        db: Async database session

    Yields:
        Dict events for SSE streaming
    """
    start_time = time.time()

    state = AgentState(
        original_query=query,
        document_id=document_id,
        max_iterations=settings.max_retrieval_iterations,
    )

    # ── Single-Pass Retrieval ────────────────────────────────────────────
    yield {
        "event": "retrieving",
        "data": {
            "status": "Searching documents...",
            "sub_queries": [query],
        },
    }

    state.sub_queries = [query]
    state = await retrieve(state, db)

    yield {
        "event": "retrieved",
        "data": {
            "chunk_count": len(state.retrieved_chunks),
            "top_score": state.retrieved_chunks[0]["score"] if state.retrieved_chunks else 0,
        },
    }

    # ── Single-Pass Generation with Token Streaming ──────────────────────
    yield {
        "event": "generating",
        "data": {"status": "Synthesizing answer..."},
    }
    
    if not state.retrieval_context:
        state.answer = (
            "I couldn't find any relevant information in the document to answer "
            "this question. Please try rephrasing your query or ensure the "
            "document contains relevant content."
        )
        yield {"event": "token", "data": {"token": state.answer}}
    else:
        from app.agent.nodes.generator import generator_llm, GENERATOR_SYSTEM_PROMPT, GENERATOR_HUMAN_TEMPLATE
        from langchain_core.messages import SystemMessage, HumanMessage
        
        messages = [
            SystemMessage(content=GENERATOR_SYSTEM_PROMPT),
            HumanMessage(content=GENERATOR_HUMAN_TEMPLATE.format(
                query=state.original_query,
                context=state.retrieval_context,
            )),
        ]
        
        state.answer = ""
        # Stream the LLM response chunk by chunk
        async for chunk in generator_llm.astream(messages):
            if chunk.content:
                state.answer += chunk.content
                yield {
                    "event": "token",
                    "data": {"token": chunk.content}
                }
                
    state.confidence_score = 1.0 # Bypassing critic
    state.iteration_count = 1

    # ── Save and Complete ────────────────────────────────────────────────
    latency_ms = int((time.time() - start_time) * 1000)

    query_record = QueryHistory(
        user_id=user_id,
        document_id=document_id,
        conversation_id=conversation_id,
        query_text=query,
        answer_text=state.answer,
        citations=state.citations,
        agent_steps=state.agent_steps,
        sub_queries=state.sub_queries,
        latency_ms=latency_ms,
        cached=False,
    )
    db.add(query_record)
    await db.flush()
    await db.refresh(query_record)
    await db.commit()

    contexts = [c.get("text_snippet", "") for c in state.citations]
    asyncio.create_task(run_eval_bg(query_record.id, query, state.answer, contexts, document_id))

    yield {
        "event": "complete",
        "data": {
            "query_id": str(query_record.id),
            "answer": state.answer,
            "citations": state.citations,
            "sub_queries": state.sub_queries,
            "agent_steps": state.agent_steps,
            "confidence_score": state.confidence_score,
            "latency_ms": latency_ms,
            "iterations": state.iteration_count,
            "cached": False,
        },
    }
