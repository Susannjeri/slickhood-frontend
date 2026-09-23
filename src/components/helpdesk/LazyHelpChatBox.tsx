"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

const HelpChatBox = dynamic(() => import("./HelpChatBox"), { ssr: false });

export default function LazyHelpChatBox() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const browser = window as Window & {
      requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
      cancelIdleCallback?: (handle: number) => void;
    };
    if (browser.requestIdleCallback) {
      const handle = browser.requestIdleCallback(() => setReady(true), { timeout: 1500 });
      return () => browser.cancelIdleCallback?.(handle);
    }
    const handle = window.setTimeout(() => setReady(true), 750);
    return () => window.clearTimeout(handle);
  }, []);

  return ready ? <HelpChatBox /> : null;
}
