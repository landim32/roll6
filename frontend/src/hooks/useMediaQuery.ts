import { useEffect, useState } from 'react';

const matches = (query: string): boolean => typeof window.matchMedia === 'function' && window.matchMedia(query).matches;

/** Whether the media query matches now, following changes (rotation, resizing). */
export const useMediaQuery = (query: string): boolean => {
  const [value, setValue] = useState(() => matches(query));
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const list = window.matchMedia(query);
    const onChange = () => setValue(list.matches);
    onChange();
    list.addEventListener('change', onChange);
    return () => list.removeEventListener('change', onChange);
  }, [query]);
  return value;
};

/** Bootstrap's `md` and up: anything that isn't a phone. */
export const DESKTOP_QUERY = '(min-width: 768px)';

export default useMediaQuery;
