import { useEffect, useRef, useState } from 'react';

// Re-renders on every animation frame while the clock is running, so the
// highlighted line and its progress bar follow the music smoothly.
export function usePosition(clock) {
  const [pos, setPos] = useState(() => clock?.position() ?? 0);
  const raf = useRef(0);
  useEffect(() => {
    if (!clock) return undefined;
    const tick = () => {
      setPos(clock.position());
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [clock]);
  return pos;
}
