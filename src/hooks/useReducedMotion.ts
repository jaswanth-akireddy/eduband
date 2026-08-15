import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

// Respects the OS "Reduce Motion" setting. Motion-sensitive users (vestibular
// disorders) get instant states instead of sweeps and rises — an accessibility
// requirement, not a nicety. Animations should degrade, never disappear.
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let active = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => {
        if (active) setReduced(v);
      })
      .catch(() => {});
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', (v) =>
      setReduced(v)
    );
    return () => {
      active = false;
      sub?.remove?.();
    };
  }, []);

  return reduced;
}
