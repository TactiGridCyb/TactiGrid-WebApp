import grid from '/app/styles/componentsDesign/statistics/StatsGrid.module.css';
import StatsCard from './StatsCard';
import { Users, Clock, Key, Wifi } from 'lucide-react';

export default function StatsGrid({ stats }) {
  const cards = stats
    ? [
        { title: 'Avg Soldiers/Mission', value: String(stats.avgSoldiers), subtitle: 'Average # soldiers', hue: 'green',  Icon: Users },
        { title: 'Avg Mission Duration', value: `${stats.avgDuration} s`,  subtitle: 'Average duration',   hue: 'yellow', Icon: Clock },
        { title: 'Most Used GMK',        value: stats.mostUsedGmk || 'N/A', subtitle: '',                 hue: 'pink',   Icon: Key },
        { title: 'Most Used FHF',        value: stats.mostUsedFhf || 'N/A', subtitle: '',                 hue: 'sky',    Icon: Wifi },
      ]
    : [
        { title: 'Total Sales',         value: '$3,257', subtitle: 'vs. last month', hue: 'pink',   percent: 76, Icon: Key },
        { title: 'Active Watches',      value: '1,678',  subtitle: 'vs. last month', hue: 'green',  percent: 85, Icon: Users },
        { title: 'New Soldiers',        value: '2,590',  subtitle: 'vs. last month', hue: 'red',    percent: 62, Icon: Key },
        { title: 'Analyzed Missions',   value: '123',    subtitle: 'vs. last month', hue: 'yellow', percent: 53, Icon: Wifi },
      ];

  return (
    <div className={grid.wrap}>
      {cards.map((card, i) => <StatsCard key={i} {...card} />)}
    </div>
  );
}
