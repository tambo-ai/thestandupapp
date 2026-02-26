import { getTokenHeaders } from "@/lib/user-tokens";
import { useEffect, useState } from "react";

interface FetchResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * Fetches JSON from a URL with automatic cancellation on unmount/URL change.
 * Automatically attaches user-scoped, encrypted GitHub and Linear tokens as headers.
 * Pass `null` to skip the fetch.
 */
export function useFetchJSON<T>(url: string | null): FetchResult<T> {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!url) return;
    let cancelled = false;
    setData(null);
    setError(null);

    getTokenHeaders().then((headers) => {
      if (cancelled) return;
      return fetch(url, { headers });
    })
      .then((r) => r?.json())
      .then((result) => {
        if (cancelled || !result) return;
        if (result.error) {
          setError(result.error);
          return;
        }
        setData(result);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });

    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, error };
}
