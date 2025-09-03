'use client';
import React, { useId } from 'react';
import cls from '/app/styles/componentsDesign/statistics/SalesChart.module.css';
import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

function GlassTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className={cls.tooltip}>
      <div className={cls.tooltipLabel}>{label}</div>
      <div className={cls.tooltipRow}>
        <span className={cls.swatch} />
        <span>Total Missions</span>
        <strong className={cls.tooltipValue}>{p.value}</strong>
      </div>
    </div>
  );
}

export default function SalesChart({ data }) {
  const sample = [
    { month: 'Jan', missions: 14 },
    { month: 'Feb', missions: 19 },
    { month: 'Mar', missions: 21 },
    { month: 'Apr', missions: 23 },
    { month: 'May', missions: 18 },
    { month: 'Jun', missions: 24 },
  ];
  const chartData = data?.length ? data : sample;

  const gid = useId(); // unique gradient id

  return (
    <section className={cls.wrapper}>
      <header className={cls.head}>
        <h3 className={cls.title}>Missions Analysis</h3>
      </header>

      <div className={cls.chartBox}>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`grad-${gid}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--blue-500)" stopOpacity="0.95" />
                <stop offset="100%" stopColor="var(--blue-500)" stopOpacity="0.35" />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.12)" />
            <XAxis dataKey="month" stroke="rgba(0,0,0,0.45)" />
            <YAxis stroke="rgba(0,0,0,0.45)" />
            <Tooltip content={<GlassTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
            <Bar
              dataKey="missions"
              name="Total Missions"
              fill={`url(#grad-${gid})`}
              radius={[8, 8, 0, 0]}
              barSize={26}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
