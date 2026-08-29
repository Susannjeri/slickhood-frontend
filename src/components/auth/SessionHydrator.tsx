"use client";

import { useEffect } from "react";
import { decodeServerToken } from "@/lib/actions";
import { useAuthStore } from "@/store/authStore";

export default function SessionHydrator() {
  useEffect(() => {
    let cancelled = false;
    const hydrate = async () => {
      const state = useAuthStore.getState();
      if (state.token) {
        state.setSessionReady(true);
        return;
      }
      try {
        const response = await fetch("/browser-session/get-token", { cache: "no-store" });
        if (!response.ok || cancelled) return;
        const body = await response.json();
        const token = body.data?.jwt as string | undefined;
        const decoded = token ? decodeServerToken(token) : null;
        if (!token || !decoded || decoded.exp * 1000 <= Date.now() || cancelled) return;

        const roles = decoded.roles ?? [];
        const previousTitle = state.activeRole?.title;
        const activeRole = roles.find(role => role.title === previousTitle) ?? roles[0];
        const latest = useAuthStore.getState();
        latest.setToken(token);
        latest.setRoles(roles);
        latest.setRoleName(roles.map(role => role.title));
        if (activeRole) latest.setActiveRole(activeRole);
      } catch {
        // Public pages and expired sessions legitimately have no access cookie.
      } finally {
        if (!cancelled) useAuthStore.getState().setSessionReady(true);
      }
    };
    void hydrate();
    return () => { cancelled = true; };
  }, []);

  return null;
}
