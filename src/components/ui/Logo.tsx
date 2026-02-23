"use client";

import type { HTMLAttributes } from "react";
import clsx from "clsx";

interface LogoProps extends HTMLAttributes<HTMLDivElement> {
  showText?: boolean;
}

export function Logo({ className, showText = true, ...props }: LogoProps) {
  return (
    <div
      className={clsx("flex items-center gap-2", className)}
      {...props}
    >
      <div className="flex h-8 w-8 items-center justify-center rounded-2xl bg-[radial-gradient(circle_at_0%_0%,#38BDF8,#2563EB_45%,#14B8A6_100%)] text-sm font-semibold text-white shadow-sm">
        F
      </div>
      {showText && (
        <span className="text-sm font-semibold tracking-tight text-textPrimary">
          Flowdesk
        </span>
      )}
    </div>
  );
}

