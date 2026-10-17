import { useEffect, useState } from 'react';

/** A blob URL for a picked file (082: the weapon preview), revoked when the file changes or the component goes away. */
export const usePickedUrl = (file: File | null): string | null => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    if (!file) {
      setUrl(null);
      return undefined;
    }
    const created = URL.createObjectURL(file);
    setUrl(created);
    return () => URL.revokeObjectURL(created);
  }, [file]);
  return url;
};

export default usePickedUrl;
