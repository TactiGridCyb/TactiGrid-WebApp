// app/dashboard/page.js

// This is your DashboardPage, now fetching analytics from the new API and passing into components.
'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '../components/Navbar.js';
import StatsGrid from '../components/statistics/StatsGrid';
import SalesChart from '../components/statistics/SalesChart';
import RecentActivity from '../components/statistics/RecentActivity';
import layout from '../styles/pagesDesign/Dashboard.module.css';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);

  useEffect(() => {
    // Fetch aggregated data from API
    fetch('/api/analytics')
      .then(res => res.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  return (
    <div>
      <Navbar />

      <header className={layout.header}>
        <h1>Dashboard</h1>
      </header>

      <main className={layout.dashboardRoot}>

        {/* four small cards */}
        <section className={layout.sectionGrid}>
          <StatsGrid stats={stats} />
        </section>

        {/* chart + activity */}
        <section className={layout.twoThirdOneThird}>
          <SalesChart data={stats?.missionsPerMonth} />
          <RecentActivity items={stats?.recentActivities} />
        </section>

      </main>
    </div>
  );
}