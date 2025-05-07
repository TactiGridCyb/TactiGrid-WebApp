'use client';
import cls  from '/app/styles/componentsDesign/statistics/SalesChart.module.css';
import {
  BarChart, Bar, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';

export default function SalesChart({ data }) {
  const sample = [
    { month: 'Jan', sales: 14, units: 6 },
    { month: 'Feb', sales: 19, units: 9 },
    { month: 'Mar', sales: 21, units: 11 },
    { month: 'Apr', sales: 23, units: 12 },
    { month: 'May', sales: 18, units: 9 },
    { month: 'Jun', sales: 24, units: 14 },
  ];

  const chartData = data || sample;

  return (
    <div className={cls.wrapper}>
      <h3 className={cls.title}>Missions Analysis</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar  dataKey="sales" fill="var(--blue-500)" name="Total Missions" barSize={32} />
          <Line type="monotone" dataKey="units" stroke="var(--pink-500)" name="Units Sold" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}