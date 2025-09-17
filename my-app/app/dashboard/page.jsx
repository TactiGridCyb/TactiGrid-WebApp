'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Navbar from '../components/Navbar.jsx';
import StatsGrid from '../components/statistics/StatsGrid.jsx';
import SalesChart from '../components/statistics/SalesChart.jsx';
import RecentActivity from '../components/statistics/RecentActivity.jsx';
import layout from '../styles/pagesDesign/Dashboard.module.css';

export default function DashboardPage() {
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr]       = useState(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      const res  = await fetch('/api/analytics', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'Failed to load analytics');
      setStats(data);
    } catch (e) {
      setErr(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStats(); }, [fetchStats]);

  return (
    <div className={layout.page}>
      <Navbar />

      {/* Slim, minimal hero */}
      <header className={layout.hero}>
        <div className={layout.heroInner}>
          <h1 className={layout.title}>Dashboard</h1>
          <button
            type="button"
            className={`${layout.btn} ${layout.btnGhost}`}
            onClick={fetchStats}
            aria-label="Refresh analytics"
          >
            ↻ Refresh
          </button>
        </div>
      </header>

      <main className={layout.container}>
        <section className={layout.stack}>
          {/* Wide, single-focus chart */}
          <div className={`${layout.card} ${layout.cardChart}`}>
            <div className={layout.cardHead}><h2 className={layout.cardTitle}>Monthly Trend</h2></div>
            <div className={`${layout.cardBody} ${layout.chartBody}`}>
              {loading ? (
                <div className={layout.chartSkeleton} />
              ) : err ? (
                <div className={layout.errorBox}><strong>Couldn’t load chart.</strong> {String(err.message || err)}</div>
              ) : (
                <SalesChart data={stats?.missionsPerMonth} />
              )}
            </div>
          </div>

          {/* Compact KPI rail (uses your existing StatsGrid) */}
          <div className={`${layout.card} ${layout.cardRail}`}>
            <div className={layout.cardHead}><h2 className={layout.cardTitle}>Quick Numbers</h2></div>
            <div className={`${layout.cardBody} ${layout.kpiRail}`}>
              {loading ? (
                <ul className={layout.railSkeleton}><li/><li/><li/><li/></ul>
              ) : err ? (
                <div className={layout.errorBox}><strong>Couldn’t load KPIs.</strong> {String(err.message || err)}</div>
              ) : (
                <div className={layout.kpiRailInner}>
                  <StatsGrid stats={stats} />
                </div>
              )}
            </div>
          </div>

          {/* Activity — simple, airy list */}
          <div className={layout.card}>
            <div className={layout.cardHead}><h2 className={layout.cardTitle}>Recent Activity</h2></div>
            <div className={layout.cardBody}>
              {loading ? (
                <ul className={layout.activitySkeleton}><li/><li/><li/><li/><li/></ul>
              ) : err ? (
                <div className={layout.errorBox}><strong>Couldn’t load activity.</strong> {String(err.message || err)}</div>
              ) : (
                <RecentActivity items={stats?.recentActivities} />
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
