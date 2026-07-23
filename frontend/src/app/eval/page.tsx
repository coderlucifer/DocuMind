/* =============================================================================
   DocuMind — Evaluation Dashboard Page
   Charts showing Ragas metrics (faithfulness, precision, recall) over time
   ============================================================================= */

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import { getEvaluationMetrics, getCacheStats, EvaluationMetrics } from "@/lib/api";
import { 
  Brain, 
  MessageSquare, 
  BarChart2, 
  AlertTriangle, 
  Target, 
  TrendingUp, 
  FileText,
  Loader2
} from "lucide-react";

export default function EvalDashboard() {
  const [metrics, setMetrics] = useState<EvaluationMetrics | null>(null);
  const [cacheStats, setCacheStats] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const [evalData, cache] = await Promise.all([
          getEvaluationMetrics(),
          getCacheStats(),
        ]);
        setMetrics(evalData);
        setCacheStats(cache);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load metrics");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatPercent = (value: number | null | undefined) => {
    if (value == null) return "—";
    return `${(value * 100).toFixed(1)}%`;
  };

  // Prepare radar chart data
  const radarData = metrics?.summary
    ? [
        { metric: "Faithfulness", value: (metrics.summary.avg_faithfulness || 0) * 100 },
        { metric: "Relevancy", value: (metrics.summary.avg_answer_relevancy || 0) * 100 },
        { metric: "Precision", value: (metrics.summary.avg_context_precision || 0) * 100 },
        { metric: "Recall", value: (metrics.summary.avg_context_recall || 0) * 100 },
      ]
    : [];

  // Prepare timeline data for charts
  const timelineData = (metrics?.timeline || [])
    .slice()
    .reverse()
    .map((t, i) => ({
      index: i + 1,
      faithfulness: t.faithfulness ? +(t.faithfulness * 100).toFixed(1) : null,
      relevancy: t.answer_relevancy ? +(t.answer_relevancy * 100).toFixed(1) : null,
      precision: t.context_precision ? +(t.context_precision * 100).toFixed(1) : null,
      recall: t.context_recall ? +(t.context_recall * 100).toFixed(1) : null,
      overall: t.overall_score ? +(t.overall_score * 100).toFixed(1) : null,
    }));

  return (
    <div className="app-layout" style={{ flexDirection: "column" }}>
      {/* Header */}
      <header className="header">
        <div className="header-brand">
          <span className="logo"><Brain size={20} /></span>
          <h1>DocuMind</h1>
        </div>
        <nav className="header-nav">
          <Link href="/chat" className="nav-link">
            <MessageSquare size={16} /> Chat
          </Link>
          <Link href="/eval" className="nav-link active">
            <BarChart2 size={16} /> Eval Dashboard
          </Link>
        </nav>
      </header>

      {/* Dashboard Content */}
      <div className="eval-page">
        <div className="eval-header">
          <h1><BarChart2 size={24} /> Evaluation Dashboard</h1>
          <p>
            RAG quality metrics powered by Ragas evaluation framework. Every query
            is automatically scored for faithfulness, relevancy, and precision.
          </p>
        </div>

        {loading ? (
          <div className="empty-state">
            <Loader2 className="spinner-icon" size={40} style={{ margin: "0 auto 16px" }} />
            <p>Loading metrics...</p>
          </div>
        ) : error ? (
          <div className="empty-state">
            <div className="empty-state-icon"><AlertTriangle size={32} /></div>
            <h3>Connection Error</h3>
            <p>{error}</p>
            <p style={{ marginTop: 8, fontSize: 12, color: "var(--text-tertiary)" }}>
              Make sure the backend is running at {process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"}
            </p>
          </div>
        ) : !metrics || metrics.summary.total_queries === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon"><BarChart2 size={48} /></div>
            <h3>No Evaluations Yet</h3>
            <p>
              Start asking questions in the Chat tab. Each query will be automatically
              evaluated and metrics will appear here.
            </p>
          </div>
        ) : (
          <>
            {/* Metric Cards */}
            <div className="eval-grid">
              <div className="eval-metric-card">
                <div className="eval-metric-label">Total Queries</div>
                <div className="eval-metric-value">{metrics.summary.total_queries}</div>
              </div>
              <div className="eval-metric-card">
                <div className="eval-metric-label">Avg. Faithfulness</div>
                <div className="eval-metric-value">
                  {formatPercent(metrics.summary.avg_faithfulness)}
                </div>
                <div className="eval-metric-bar">
                  <div
                    className="eval-metric-bar-fill"
                    style={{ width: `${(metrics.summary.avg_faithfulness || 0) * 100}%` }}
                  />
                </div>
              </div>
              <div className="eval-metric-card">
                <div className="eval-metric-label">Avg. Relevancy</div>
                <div className="eval-metric-value">
                  {formatPercent(metrics.summary.avg_answer_relevancy)}
                </div>
                <div className="eval-metric-bar">
                  <div
                    className="eval-metric-bar-fill"
                    style={{ width: `${(metrics.summary.avg_answer_relevancy || 0) * 100}%` }}
                  />
                </div>
              </div>
              <div className="eval-metric-card">
                <div className="eval-metric-label">Avg. Precision</div>
                <div className="eval-metric-value">
                  {formatPercent(metrics.summary.avg_context_precision)}
                </div>
                <div className="eval-metric-bar">
                  <div
                    className="eval-metric-bar-fill"
                    style={{ width: `${(metrics.summary.avg_context_precision || 0) * 100}%` }}
                  />
                </div>
              </div>
              <div className="eval-metric-card">
                <div className="eval-metric-label">Avg. Overall</div>
                <div className="eval-metric-value">
                  {formatPercent(metrics.summary.avg_overall_score)}
                </div>
                <div className="eval-metric-bar">
                  <div
                    className="eval-metric-bar-fill"
                    style={{ width: `${(metrics.summary.avg_overall_score || 0) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Cache Stats */}
            {cacheStats && cacheStats.status === "active" && (
              <div className="eval-grid" style={{ marginBottom: 32 }}>
                <div className="eval-metric-card">
                  <div className="eval-metric-label">Cache Entries</div>
                  <div className="eval-metric-value">{String(cacheStats.total_entries || 0)}</div>
                </div>
                <div className="eval-metric-card">
                  <div className="eval-metric-label">Cache Hits</div>
                  <div className="eval-metric-value">{String(cacheStats.total_hits || 0)}</div>
                </div>
                <div className="eval-metric-card">
                  <div className="eval-metric-label">Hit Rate</div>
                  <div className="eval-metric-value">{String(cacheStats.hit_rate || 0)}%</div>
                </div>
              </div>
            )}

            {/* Quality Radar Chart */}
            {radarData.length > 0 && (
              <div className="eval-chart-card">
                <div className="eval-chart-title"><Target size={16} /> Quality Radar</div>
                <ResponsiveContainer width="100%" height={350}>
                  <RadarChart data={radarData}>
                    <PolarGrid stroke="var(--border-color)" />
                    <PolarAngleAxis
                      dataKey="metric"
                      tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
                    />
                    <PolarRadiusAxis
                      domain={[0, 100]}
                      tick={{ fill: "var(--text-tertiary)", fontSize: 10 }}
                    />
                    <Radar
                      dataKey="value"
                      stroke="#ffffff"
                      fill="#ffffff"
                      fillOpacity={0.1}
                      strokeWidth={2}
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Metrics Over Time */}
            {timelineData.length > 0 && (
              <div className="eval-chart-card">
                <div className="eval-chart-title"><TrendingUp size={16} /> Metrics Over Time</div>
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={timelineData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis
                      dataKey="index"
                      tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
                      label={{ value: "Query #", fill: "var(--text-tertiary)", fontSize: 11, position: "insideBottom", offset: -5 }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
                      label={{ value: "Score %", fill: "var(--text-tertiary)", fontSize: 11, angle: -90, position: "insideLeft" }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: 8,
                        color: "var(--text-primary)",
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: 12, color: "var(--text-secondary)" }}
                    />
                    <Line type="monotone" dataKey="faithfulness" stroke="#ffffff" strokeWidth={2} dot={{ r: 3 }} name="Faithfulness" />
                    <Line type="monotone" dataKey="relevancy" stroke="#a3a3a3" strokeWidth={2} dot={{ r: 3 }} name="Relevancy" />
                    <Line type="monotone" dataKey="precision" stroke="#737373" strokeWidth={2} dot={{ r: 3 }} name="Precision" />
                    <Line type="monotone" dataKey="recall" stroke="#525252" strokeWidth={2} dot={{ r: 3 }} name="Recall" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Bar Chart: Per-Query Comparison */}
            {timelineData.length > 0 && (
              <div className="eval-chart-card">
                <div className="eval-chart-title"><BarChart2 size={16} /> Per-Query Score Comparison</div>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={timelineData.slice(-20)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                    <XAxis
                      dataKey="index"
                      tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
                    />
                    <YAxis
                      domain={[0, 100]}
                      tick={{ fill: "var(--text-tertiary)", fontSize: 11 }}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--bg-secondary)",
                        border: "1px solid var(--border-color)",
                        borderRadius: 8,
                        color: "var(--text-primary)",
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="faithfulness" fill="#ffffff" name="Faithfulness" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="relevancy" fill="#a3a3a3" name="Relevancy" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="overall" fill="#525252" name="Overall" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Query History Table */}
            <div className="eval-chart-card">
              <div className="eval-chart-title"><FileText size={16} /> Recent Evaluations</div>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>#</th>
                      <th style={thStyle}>Faithfulness</th>
                      <th style={thStyle}>Relevancy</th>
                      <th style={thStyle}>Precision</th>
                      <th style={thStyle}>Recall</th>
                      <th style={thStyle}>Overall</th>
                      <th style={thStyle}>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.evaluations.slice(0, 20).map((e, i) => (
                      <tr key={e.id} style={{ borderBottom: "1px solid var(--border-color)" }}>
                        <td style={tdStyle}>{i + 1}</td>
                        <td style={tdStyle}>{formatPercent(e.faithfulness)}</td>
                        <td style={tdStyle}>{formatPercent(e.answer_relevancy)}</td>
                        <td style={tdStyle}>{formatPercent(e.context_precision)}</td>
                        <td style={tdStyle}>{formatPercent(e.context_recall)}</td>
                        <td style={{ ...tdStyle, fontWeight: 600, color: "var(--text-primary)" }}>
                          {formatPercent(e.overall_score)}
                        </td>
                        <td style={tdStyle}>
                          {e.created_at
                            ? new Date(e.created_at).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "10px 12px",
  color: "var(--text-tertiary)",
  fontWeight: 600,
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: "0.5px",
  borderBottom: "1px solid var(--border-color)",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  color: "var(--text-secondary)",
};
