'use client';
import cls  from '/app/styles/componentsDesign/statistics/SalesChart.module.css';
import {
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';

export default function SalesChart({ data }) {
  // API returns [{ month, missions }]. Fallback sample for dev:
  const sample = [
    { month: 'Jan', missions: 14 },
    { month: 'Feb', missions: 19 },
    { month: 'Mar', missions: 21 },
    { month: 'Apr', missions: 23 },
    { month: 'May', missions: 18 },
    { month: 'Jun', missions: 24 },
  ];

  const chartData = data && data.length
    ? data
    : sample;

  return (
    <div className={cls.wrapper}>
      <h3 className={cls.title}>Missions Analysis</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Bar
            dataKey="missions"
            fill="var(--blue-500)"
            name="Total Missions"
            barSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
