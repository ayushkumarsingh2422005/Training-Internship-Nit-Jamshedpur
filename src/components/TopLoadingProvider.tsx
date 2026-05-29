"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type TopLoadingContextValue = {
  start: () => void;
  stop: () => void;
};

const TopLoadingContext = createContext<TopLoadingContextValue | null>(null);

export function TopLoadingProvider({ children }: { children: ReactNode }) {
  const pendingRef = useRef(0);
  const [visible, setVisible] = useState(false);

  const start = useCallback(() => {
    pendingRef.current += 1;
    setVisible(true);
  }, []);

  const stop = useCallback(() => {
    pendingRef.current = Math.max(0, pendingRef.current - 1);
    if (pendingRef.current === 0) {
      setVisible(false);
    }
  }, []);

  return (
    <TopLoadingContext.Provider value={{ start, stop }}>
      <div className={`top-loading-bar${visible ? " active" : ""}`} aria-hidden={!visible} />
      {children}
    </TopLoadingContext.Provider>
  );
}

/** Tie a boolean loading flag to the global top bar (tabs, forms, admin tables). */
export function useTopLoading(active: boolean) {
  const ctx = useContext(TopLoadingContext);

  useEffect(() => {
    if (!ctx || !active) return;
    ctx.start();
    return () => ctx.stop();
  }, [active, ctx]);
}

/** Wrap async work so the top bar shows for the whole operation. */
export function useTopLoader() {
  const ctx = useContext(TopLoadingContext);

  return useCallback(
    async <T,>(work: () => Promise<T>): Promise<T> => {
      if (!ctx) return work();
      ctx.start();
      try {
        return await work();
      } finally {
        ctx.stop();
      }
    },
    [ctx],
  );
}
