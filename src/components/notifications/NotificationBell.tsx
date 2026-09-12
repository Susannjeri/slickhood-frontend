"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { NOTIFICATIONS_CHANGED_EVENT, notificationService } from "@/services/notification.service";

const POLL_INTERVAL_MS = 60_000;

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);
  const activeRoleTitle = useAuthStore(state => state.activeRole?.title);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    if (!activeRoleTitle) {
      setUnreadCount(0);
      return;
    }

    const currentRequest = ++requestId.current;
    try {
      const response = await notificationService.unreadCount();
      if (currentRequest !== requestId.current) return;
      const count = Number(response.data?.data?.count);
      setUnreadCount(Number.isFinite(count) && count > 0 ? Math.floor(count) : 0);
    } catch {
      // The notification centre remains accessible if the lightweight badge refresh fails.
    }
  }, [activeRoleTitle]);

  useEffect(() => {
    const initialRefresh = window.setTimeout(() => void refresh(), 0);
    const interval = window.setInterval(() => void refresh(), POLL_INTERVAL_MS);
    const onFocus = () => void refresh();
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    window.addEventListener(NOTIFICATIONS_CHANGED_EVENT, onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.clearTimeout(initialRefresh);
      window.clearInterval(interval);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(NOTIFICATIONS_CHANGED_EVENT, onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh]);

  const accessibleLabel = unreadCount > 0
    ? `Open alerts, ${unreadCount} unread`
    : "Open alerts, no unread notifications";

  return <Link
    href="/dashboard/notifications"
    aria-label={accessibleLabel}
    title="Notifications"
    className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-[#08184A]/70 transition-colors hover:bg-[#08184A]/5 hover:text-[#08184A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FF4B12] focus-visible:ring-offset-2 dark:text-white/70 dark:hover:bg-white/10 dark:hover:text-white"
  >
    <Bell className="h-5 w-5" aria-hidden="true" />
    {unreadCount > 0 && <span
      data-testid="notification-unread-count"
      role="status"
      aria-label={`${unreadCount} unread notifications`}
      className="absolute -right-1 -top-1 flex min-h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-[#EF4217] px-1 text-[10px] font-bold leading-none text-white dark:border-[#141130]"
    >
      {unreadCount > 99 ? "99+" : unreadCount}
    </span>}
  </Link>;
}
