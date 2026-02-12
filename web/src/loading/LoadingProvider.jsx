// src/loading/LoadingProvider.jsx
import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { globalLoading } from "./globalLoading";
import GlobalLoadingOverlay from "../ui/GlobalLoadingOverlay";

const LoadingCtx = createContext(null);

export function LoadingProvider({ children }) {
  const [count, setCount] = useState(globalLoading.peek());

  useEffect(() => {
    return globalLoading.on((c) => setCount(c));
  }, []);

  const api = useMemo(
    () => ({
      start: () => globalLoading.start(),
      stop: () => globalLoading.stop(),
      isLoading: count > 0,
      count,
    }),
    [count]
  );

  return (
    <LoadingCtx.Provider value={api}>
      {children}
      <GlobalLoadingOverlay open={count > 0} />
    </LoadingCtx.Provider>
  );
}

export function useLoading() {
  const ctx = useContext(LoadingCtx);
  if (!ctx) throw new Error("useLoading must be used inside <LoadingProvider />");
  return ctx;
}
