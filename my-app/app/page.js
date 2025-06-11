// app/page.js

'use client';

import React, { useState, useEffect } from 'react';
import Navbar         from './components/Navbar';
import StatsGrid      from './components/statistics/StatsGrid';
import SalesChart     from './components/statistics/SalesChart';
import RecentActivity from './components/statistics/RecentActivity';

export default function Home() {
  const [stats, setStats] = useState(null);

  // Fetch analytics on mount
  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(setStats)
      .catch(console.error);
  }, []);

  return (
    <div style={{ background: '#c4d3e3', minHeight: '100vh' }}>
      <Navbar />

      <header style={{ textAlign: 'center', padding: '2rem 0' }}>
        <h1 style={{ fontSize: '3rem', margin: 0 }}>TactiGrid</h1>
      </header>

      <main style={{ padding: '0 2rem 4rem' }}>
        {/* Stats cards row */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1.5rem',
          }}
        >
          <StatsGrid stats={stats} />
        </div>

        {/* Chart + Activity side by side */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: '1.5rem',
            marginTop: '2rem',
          }}
        >
          <div
            style={{
              background: '#fff',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <SalesChart data={stats?.missionsPerMonth} />
          </div>

          <div
            style={{
              background: '#fff',
              padding: '1.5rem',
              borderRadius: '0.75rem',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <RecentActivity items={stats?.recentActivities} />
          </div>
        </div>
      </main>
    </div>
  );
}
