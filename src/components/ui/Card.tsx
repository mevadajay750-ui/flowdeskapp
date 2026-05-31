"use client";

import type { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export function Card({ children, className, ...props }: CardProps) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-border p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:border-slate-800",
        className?.includes("bg-") || className?.includes("from-")
          ? null
          : "bg-white dark:bg-slate-900",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

