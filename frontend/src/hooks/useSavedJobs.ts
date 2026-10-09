import { useCallback, useEffect, useState } from 'react';

const KEY = 'sift_saved_jobs';

function read(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * Bookmarked/saved jobs for a candidate, persisted to localStorage.
 * No backend support needed — purely a client-side convenience.
 */
export function useSavedJobs() {
  const [saved, setSaved] = useState<string[]>(() => read());

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(saved));
  }, [saved]);

  const toggle = useCallback((jobId: string) => {
    setSaved((prev) =>
      prev.includes(jobId) ? prev.filter((id) => id !== jobId) : [...prev, jobId]
    );
  }, []);

  const isSaved = useCallback((jobId: string) => saved.includes(jobId), [saved]);

  return { saved, toggle, isSaved };
}

/** Copy text to the clipboard with a fallback for insecure contexts. */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the legacy path
  }
  try {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}
