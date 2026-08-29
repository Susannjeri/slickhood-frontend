// components/auth/AuthSplitPanel.tsx
//
// Shared split-screen wrapper used by every auth/registration form.
// Renders the navy info card on the left and the form content on the right.
// Each page passes its own leftTitle + leftDescription.
//
// Dimensions match the role page exactly (max-w-4xl, gap-10, navy w-[260px]).

import type { ReactNode } from "react";

interface AuthSplitPanelProps {
  leftTitle: string;
  leftDescription: string;
  children: ReactNode;
}

export const AuthSplitPanel = ({
  leftTitle,
  leftDescription,
  children,
}: AuthSplitPanelProps) => (
  <div className="w-full max-w-4xl flex items-stretch gap-10">

    {/* Left — navy card */}
    <div className="hidden lg:flex w-[260px] shrink-0">
      <div className="w-full rounded-2xl bg-[#141130] flex flex-col items-center justify-center gap-5 px-5 py-10">

        {/* Peach avatar with orange person icon */}
        <div className="w-24 h-24 rounded-full bg-[#F4DCC7] flex items-center justify-center">
          <svg viewBox="0 0 64 64" className="w-14 h-14" fill="none">
            <circle cx="32" cy="22" r="10" fill="#EF4217" />
            <path d="M12 60c0-11.046 8.954-20 20-20s20 8.954 20 20" fill="#EF4217" />
          </svg>
        </div>

        {/* Dynamic title + description */}
        <div className="text-center space-y-2 px-1">
          <h2 className="text-white text-base font-bold">{leftTitle}</h2>
          <p className="text-white/60 text-xs leading-relaxed">
            {leftDescription}
          </p>
        </div>
      </div>
    </div>

    {/* Right — form content */}
    <div className="flex-1 flex items-center min-w-0">
      <div className="w-full">{children}</div>
    </div>

  </div>
);