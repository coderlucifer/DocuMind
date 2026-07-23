/* =============================================================================
   DocuMind — Usage Banner Component
   Displays current tier, queries used, and upgrade button
   ============================================================================= */

"use client";

import { useEffect, useState, useCallback } from "react";
import { getUsage, upgradeTier, UsageResponse } from "@/lib/api";
import { Zap, Crown, Loader2, RefreshCw } from "lucide-react";

export default function UsageBanner() {
  const [usage, setUsage] = useState<UsageResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const fetchUsage = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await getUsage();
      setUsage(data);
    } catch (e) {
      console.error("Failed to fetch usage", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchUsage();
    
    // Set up an interval to periodically refresh usage (e.g., every 30 seconds)
    // In a real app, you might use SWR or React Query or listen to events
    const intervalId = setInterval(() => fetchUsage(true), 30000);
    return () => clearInterval(intervalId);
  }, [fetchUsage]);

  // Also refresh usage when this component receives focus/becomes visible
  useEffect(() => {
    const handleFocus = () => fetchUsage(true);
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchUsage]);

  const handleUpgrade = async () => {
    setUpgrading(true);
    try {
      await upgradeTier("pro");
      await fetchUsage(true);
    } catch (e) {
      console.error("Failed to upgrade", e);
    } finally {
      setUpgrading(false);
    }
  };

  const handleDowngrade = async () => {
    setUpgrading(true);
    try {
      await upgradeTier("free");
      await fetchUsage(true);
    } catch (e) {
      console.error("Failed to downgrade", e);
    } finally {
      setUpgrading(false);
    }
  }

  if (loading && !usage) {
    return (
      <div className="usage-banner loading">
        <Loader2 className="spinner" size={16} /> Loading usage...
      </div>
    );
  }

  if (!usage) return null;

  const isPro = usage.tier === "pro";
  const percentage = isPro ? 0 : Math.min(100, (usage.daily_used / usage.daily_limit) * 100);
  const isNearLimit = percentage >= 80;

  return (
    <div className={`usage-banner ${isPro ? "pro-tier" : ""}`}>
      <div className="usage-header">
        <div className="tier-badge">
          {isPro ? <Crown size={12} className="pro-icon" /> : <Zap size={12} />}
          {isPro ? "Pro Plan" : "Free Plan"}
        </div>
        <button 
          className="refresh-btn" 
          onClick={() => fetchUsage(true)} 
          disabled={refreshing}
          title="Refresh Usage"
        >
          <RefreshCw size={12} className={refreshing ? "spinner" : ""} />
        </button>
      </div>

      <div className="usage-stats">
        <div className="usage-text">
          {isPro ? (
            <span>Unlimited queries</span>
          ) : (
            <span>
              {usage.daily_used} / {usage.daily_limit} queries today
            </span>
          )}
        </div>
        
        {!isPro && (
          <div className="progress-bar-bg">
            <div 
              className={`progress-bar-fill ${isNearLimit ? "warning" : ""}`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        )}
      </div>

      {!isPro ? (
        <button 
          className="upgrade-btn" 
          onClick={handleUpgrade}
          disabled={upgrading}
        >
          {upgrading ? (
            <><Loader2 className="spinner" size={14} /> Upgrading...</>
          ) : (
            <>Upgrade to Pro</>
          )}
        </button>
      ) : (
        <button 
          className="downgrade-btn" 
          onClick={handleDowngrade}
          disabled={upgrading}
          title="For demo purposes: downgrade to Free"
        >
          {upgrading ? "Reverting..." : "Downgrade to Free (Demo)"}
        </button>
      )}
    </div>
  );
}
