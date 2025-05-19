"use client";
import StatsCard from './StatsCard';
import {
  DollarSign, Users, ShoppingCart, Percent,
} from 'lucide-react';

export default function StatsGrid({ stats }) {
  const demo = [
    { title: 'Total Sales', value: '$3,257', subtitle: 'vs. last month', percent: 76, hue: 'pink',   Icon: DollarSign },
    { title: 'Total Active Watches', value: '1,678',  subtitle: 'vs. last month', percent: 85, hue: 'green',  Icon: Users },
    { title: 'Total New Soldiers',value: '2,590',  subtitle: 'vs. last month', percent: 62, hue: 'red',    Icon: ShoppingCart },
    { title: 'Analyzed Missions',    value: '123', subtitle: 'vs. last month', percent: 53, hue: 'yellow', Icon: Percent },
  ];

  return (stats || demo).map((s, i) => <StatsCard key={i} {...s} />);
}