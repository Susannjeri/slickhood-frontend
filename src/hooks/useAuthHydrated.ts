"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/authStore";

/** Prevent registration guards from acting on Zustand's server defaults. */
export function useAuthHydrated() {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const persist = useAuthStore.persist;
    if (!persist) {
      setHydrated(true);
      return;
    }
    if (persist.hasHydrated()) setHydrated(true);
    return persist.onFinishHydration(() => setHydrated(true));
  }, []);

  return hydrated;
}
