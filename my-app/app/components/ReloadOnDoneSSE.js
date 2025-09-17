'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReloadOnDoneSSE({ missionId }) {

  const router = useRouter();
  useEffect(() => {
    const es = new EventSource(`/api/logs/upload/${missionId}`);

    es.onmessage = () => {
      window.location.reload();
      router.refresh();
      console.log('RELOADED');
    };

    es.onerror = () => {
      es.close();
    };

    return () => es.close();
  }, [missionId]);

  return null; 
}
