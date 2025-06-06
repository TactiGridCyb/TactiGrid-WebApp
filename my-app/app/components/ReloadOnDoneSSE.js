'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ReloadOnDoneSSE({ missionId }) {

  const router = useRouter();
  useEffect(() => {
    // 1) open one SSE connection
    const es = new EventSource(`/api/logs/upload/${missionId}`);

    // 2) on the very first message, reload
    es.onmessage = () => {
      window.location.reload();
      router.refresh();
      console.log('RELOADED');
    };

    // 3) if the connection errors out, close it
    es.onerror = () => {
      es.close();
    };

    // 4) cleanup if component unmounts
    return () => es.close();
  }, [missionId]);

  return null; // renders nothing
}
