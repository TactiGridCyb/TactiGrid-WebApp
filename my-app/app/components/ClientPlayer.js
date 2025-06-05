'use client';                                    // ← this is a client comp
import dynamic from 'next/dynamic';

const LogPlayer = dynamic(() => import('./LogPlayer'), {
  ssr: false            // allowed here because we're in a client component
});

export default function ClientPlayer({ log }) {
  
  return <LogPlayer log={log} />;
}
