'use client';
import { useState, useRef, useEffect } from 'react';

/**
 * Reusable debounce + abort helper.
 * @param {function(string, AbortSignal): Promise<Array>} fetcher
 * @param {number} delay  default 300 ms
 */
export default function useDebouncedSearch(fetcher, delay = 300) {
  const [query,   setQuery]   = useState('');
  const [items,   setItems]   = useState([]);
  const [loading, setLoading] = useState(false);

  const abortRef   = useRef(null);
  const timerRef   = useRef(null);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (abortRef.current) abortRef.current.abort();

    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;

    timerRef.current = setTimeout(async () => {
      try {
        const data = await fetcher(query, controller.signal);
        setItems(data);
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
      } finally {
        setLoading(false);
      }
    }, delay);

    return () => {
      controller.abort();
      clearTimeout(timerRef.current);
    };
  }, [query, delay, fetcher]);

  return { query, setQuery, items, loading };
}
