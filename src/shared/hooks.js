import { useState, useEffect, useCallback } from 'react';
import { onValue, off } from 'firebase/database';

/* ══════════════════════════════════════════════════
   CUSTOM HOOKS
   - Reusable React logic
══════════════════════════════════════════════════ */

/**
 * Hook: Firebase listener with cleanup
 * @param {ref} dbRef - Firebase reference
 * @param {function} setState - State setter
 * @returns {function} Unsubscribe function
 */
export const useFirebaseListener = (dbRef, setState) => {
  useEffect(() => {
    if (!dbRef) return;

    const unsubscribe = onValue(
      dbRef,
      (snapshot) => {
        setState(snapshot.val());
      },
      (error) => {
        console.error('Firebase error:', error);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [dbRef, setState]);
};

/**
 * Hook: Countdown timer
 * @param {number} duration - Duration in milliseconds
 * @param {function} onEnd - Callback when timer ends
 * @returns {object} { countdown, isActive, start, stop }
 */
export const useCountdown = (duration = null, onEnd = null) => {
  const [countdown, setCountdown] = useState(duration);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!isActive || countdown === null) return;

    const interval = setInterval(() => {
      setCountdown(prev => {
        const next = prev - 100;
        if (next <= 0) {
          setIsActive(false);
          onEnd?.();
          return 0;
        }
        return next;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isActive, countdown, onEnd]);

  const start = useCallback((dur) => {
    setCountdown(dur);
    setIsActive(true);
  }, []);

  const stop = useCallback(() => {
    setIsActive(false);
  }, []);

  return { countdown, isActive, start, stop };
};

/**
 * Hook: Notifications system
 * @returns {object} { notifs, notify, removeNotif }
 */
export const useNotifications = () => {
  const [notifs, setNotifs] = useState([]);

  const notify = useCallback((text, type = 'info') => {
    const id = Date.now() + Math.random();
    setNotifs(prev => [...prev, { id, text, type }]);
    
    setTimeout(() => {
      setNotifs(prev => prev.filter(n => n.id !== id));
    }, 3200);
  }, []);

  const removeNotif = useCallback((id) => {
    setNotifs(prev => prev.filter(n => n.id !== id));
  }, []);

  return { notifs, notify, removeNotif };
};

/**
 * Hook: Web Audio API for sound effects
 * @returns {function} playSound function
 */
export const useSound = () => {
  return useCallback((type) => {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      
      const play = (freq, dur, vol = 0.3, wave = 'sine', delay = 0) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.connect(g);
        g.connect(ctx.destination);
        o.type = wave;
        o.frequency.value = freq;
        g.gain.setValueAtTime(0, ctx.currentTime + delay);
        g.gain.linearRampToValueAtTime(vol, ctx.currentTime + delay + 0.02);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
        o.start(ctx.currentTime + delay);
        o.stop(ctx.currentTime + delay + dur + 0.05);
      };

      if (type === 'countdown') {
        play(880, 0.08, 0.25, 'square');
      } else if (type === 'countdown_last') {
        play(1100, 0.12, 0.4, 'square');
      } else if (type === 'suspense') {
        [200, 240, 280, 320, 380].forEach((f, i) => play(f, 0.3, 0.15, 'sine', i * 0.18));
        play(500, 0.8, 0.2, 'sine', 1.0);
      } else if (type === 'explosion') {
        play(150, 0.15, 0.5, 'sawtooth');
        play(300, 0.3, 0.3, 'square', 0.05);
        play(600, 0.4, 0.2, 'sine', 0.1);
        play(900, 0.5, 0.15, 'sine', 0.2);
      } else if (type === 'applause') {
        for (let i = 0; i < 12; i++) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          const bf = ctx.createBiquadFilter();
          o.type = 'sawtooth';
          o.frequency.value = 80 + Math.random() * 200;
          bf.type = 'bandpass';
          bf.frequency.value = 1000 + Math.random() * 2000;
          bf.Q.value = 0.5;
          o.connect(bf);
          bf.connect(g);
          g.connect(ctx.destination);
          const t = ctx.currentTime + i * 0.08;
          g.gain.setValueAtTime(0, t);
          g.gain.linearRampToValueAtTime(0.15, t + 0.02);
          g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
          o.start(t);
          o.stop(t + 0.15);
        }
      } else if (type === 'poison_hit') {
        play(200, 0.2, 0.4, 'sawtooth');
        play(100, 0.4, 0.3, 'sine', 0.1);
      }
    } catch (e) {
      console.warn('Sound playback error:', e);
    }
  }, []);
};

/**
 * Hook: Debounce input
 * @param {any} value - Value to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {any} Debounced value
 */
export const useDebounce = (value, delay = 500) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
};

/**
 * Hook: Previous value
 * @param {any} value - Current value
 * @returns {any} Previous value
 */
export const usePrevious = (value) => {
  const ref = useRef();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
};

/**
 * Hook: Check if component is mounted
 * @returns {object} { isMounted }
 */
export const useIsMounted = () => {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return { isMounted };
};

/**
 * Hook: Async function handler
 * @param {function} asyncFn - Async function
 * @returns {object} { execute, status, value, error }
 */
export const useAsync = (asyncFn, immediate = true) => {
  const [status, setStatus] = useState('idle');
  const [value, setValue] = useState(null);
  const [error, setError] = useState(null);

  const execute = useCallback(async () => {
    setStatus('pending');
    setValue(null);
    setError(null);
    try {
      const response = await asyncFn();
      setValue(response);
      setStatus('success');
      return response;
    } catch (err) {
      setError(err);
      setStatus('error');
      throw err;
    }
  }, [asyncFn]);

  useEffect(() => {
    if (immediate) {
      execute();
    }
  }, [execute, immediate]);

  return { execute, status, value, error };
};
