'use client';

import cls from '/app/styles/componentsDesign/statistics/StatsCard.module.css';
import { CircleDollarSign } from 'lucide-react';

export default function StatsCard({
  title,
  value,
  subtitle,
  percent,
  hue = 'sky',                 // sky | pink | green | yellow | red | purple
  Icon = CircleDollarSign,
}) {
  return (
    <article className={`${cls.card} ${cls[hue]}`}>
      <div className={cls.leftAccent} aria-hidden="true" />

      <div className={cls.top}>
        <div className={cls.badge}>
          <Icon className={cls.icon} />
        </div>
        <h4 className={cls.title}>{title}</h4>
      </div>

      <div className={cls.value}>{value}</div>

      {subtitle && <p className={cls.subtle}>{subtitle}</p>}

      {typeof percent === 'number' && (
        <div className={cls.progressOuter}>
          <div className={cls.progressInner} style={{ width: `${percent}%` }} />
        </div>
      )}
    </article>
  );
}
