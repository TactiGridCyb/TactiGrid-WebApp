import cls from '/app/styles/componentsDesign/statistics/RecentActivity.module.css';
import { Activity } from 'lucide-react';

export default function RecentActivity({ items }) {
  const sample = [
    { text: 'Task finished on Project Management',       date: '09 Jun 2024' },
    { text: 'New comment on Service Management',         date: '05 Jun 2024' },
    { text: 'Target completed — this month’s missions',  date: '01 Jun 2024' },
    { text: 'Revenue report generated',                  date: '26 May 2024' },
  ];
  const data = items?.length ? items : sample;

  return (
    <section className={cls.card}>
      <header className={cls.header}>
        <Activity className={cls.icon} />
        <h3 className={cls.title}>Recent Activity</h3>
      </header>

      <ol className={cls.timeline} role="list">
        {data.map((e, i) => (
          <li key={i} className={cls.row}>
            <span className={cls.dot} aria-hidden="true" />
            <div className={cls.meta}>
              <p className={cls.text}>{e.text}</p>
              <time className={cls.date}>{e.date}</time>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
