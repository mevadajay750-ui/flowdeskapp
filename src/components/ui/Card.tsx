"use client";

import type { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  const hasCustomBg =
    className?.includes("bg-") || className?.includes("from-");

  return (
    <div
      className={clsx(
        "rounded-xl border border-border p-5 shadow-sm transition-all duration-200 hover:shadow-md motion-reduce:transition-none",
        !hasCustomBg && "bg-surface",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
