import { useEffect } from 'react';

/** Sets document.title for the current route, restoring a base suffix. */
export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} · Sift`;
  }, [title]);
}
