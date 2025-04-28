import cls from '/app/styles/componentsDesign/statistics/RecentActivity.module.css';

import { Activity } from 'lucide-react';

export default function RecentActivity({ items }) {
  const sample = [
    { text: 'Task finished on Project Management', date: '09 Jun 2024' },
    { text: 'New comment on Service Management',   date: '05 Jun 2024' },
    { text: 'Target completed – this month’s sales', date: '01 Jun 2024' },
    { text: 'Revenue report generated',            date: '26 May 2024' },
  ];
  const data = items || sample;

  return (
    <div className={cls.card}>
      <h3 className={cls.header}>
        <Activity className={cls.icon} />
        Recent Activity
      </h3>

      <ul className={cls.list}>
        {data.map((e, i) => (
          <li key={i} className={cls.item}>
            <p className={cls.text}>{e.text}</p>
            <p className={cls.date}>{e.date}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
