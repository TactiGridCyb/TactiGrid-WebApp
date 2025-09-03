'use client';
import StatsCard from './StatsCard';
import { Users, Clock, Key, Wifi } from 'lucide-react';

export default function StatsGrid({ stats }) {
  // Build cards based on analytics; fall back to demo if not yet loaded
  const cards = stats
    ? [
        {
          title:    'Avg Soldiers/Mission',
          value:    stats.avgSoldiers.toString(),
          subtitle: 'Average # of soldiers',
          percent:  undefined,
          hue:      'green',
          Icon:     Users,
        },
        {
          title:    'Avg Mission Duration',
          value:    `${stats.avgDuration} s`,
          subtitle: 'Average duration',
          percent:  undefined,
          hue:      'yellow',
          Icon:     Clock,
        },
        {
          title:    'Most Used GMK',
          value:    stats.mostUsedGmk || 'N/A',
          subtitle: '',
          percent:  undefined,
          hue:      'pink',
          Icon:     Key,
        },
        {
          title:    'Most Used FHF',
          value:    stats.mostUsedFhf || 'N/A',
          subtitle: '',
          percent:  undefined,
          hue:      'sky',
          Icon:     Wifi,
        }
      ]
    : [
        // your old demo fallback
        {
          title:    'Total Sales',
          value:    '$3,257',
          subtitle: 'vs. last month',
          percent:  76,
          hue:      'pink',
          Icon:     Key  // adjust icon if you like
        },
        {
          title:    'Total Active Watches',
          value:    '1,678',
          subtitle: 'vs. last month',
          percent:  85,
          hue:      'green',
          Icon:     Users
        },
        {
          title:    'Total New Soldiers',
          value:    '2,590',
          subtitle: 'vs. last month',
          percent:  62,
          hue:      'red',
          Icon:     Key
        },
        {
          title:    'Analyzed Missions',
          value:    '123',
          subtitle: 'vs. last month',
          percent:  53,
          hue:      'yellow',
          Icon:     Wifi
        }
      ];

  return (
    <>
      {cards.map((card, i) => (
        <StatsCard key={i} {...card} />
      ))}
    </>
  );
}
