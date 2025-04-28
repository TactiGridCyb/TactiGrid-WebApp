'use client';
import cls  from '/app/styles/componentsDesign/statistics/StatsCard.module.css';
import { CircleDollarSign } from 'lucide-react';

export default function StatsCard({
  title,
  value,
  subtitle,
  percent,
  hue = 'sky',           /* sky | pink | green | yellow | red | purple */
  Icon = CircleDollarSign,
}) {
  return (
    <div className={`${cls.card} ${cls[hue]}`}>
      <div className={cls.header}>
        <h3 className={cls.title}>{title}</h3>
        <Icon className={cls.icon} />
      </div>

      <div className={cls.value}>{value}</div>

      {subtitle && <p className={cls.subtle}>{subtitle}</p>}

      {typeof percent === 'number' && (
        <div className={cls.barOuter}>
          <div
            className={cls.barInner}
            style={{ width: `${percent}%` }}
          />
        </div>
      )}
    </div>
  );
}