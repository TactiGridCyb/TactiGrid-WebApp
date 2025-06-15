'use client';
import dynamic from 'next/dynamic';


const LogPlayer = dynamic(() => import('./LogPlayer'), { ssr: false });

export default function ClientPlayer({ log, mission }) {
  return <LogPlayer log={log} mission={mission} />;
}
