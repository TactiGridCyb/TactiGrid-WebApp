"use client";
import StatsCard from './StatsCard';
import {
  DollarSign, Users, ShoppingCart, Percent,
} from 'lucide-react';

export default function StatsGrid({ stats }) {
  const demo = [
    { title: 'Total Sales', value: '$3,257', subtitle: 'vs. last month', percent: 76, hue: 'pink',   Icon: DollarSign },
    { title: 'Total Users', value: '1,678',  subtitle: 'vs. last month', percent: 85, hue: 'green',  Icon: Users },
    { title: 'Total Orders',value: '2,590',  subtitle: 'vs. last month', percent: 62, hue: 'red',    Icon: ShoppingCart },
    { title: 'Tax Paid',    value: '$1,954', subtitle: 'vs. last month', percent: 53, hue: 'yellow', Icon: Percent },
  ];

  return (stats || demo).map((s, i) => <StatsCard key={i} {...s} />);
}