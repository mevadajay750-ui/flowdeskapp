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
        "rounded-xl border border-border bg-white p-5 shadow-sm transition-all duration-200 hover:shadow-md dark:bg-slate-900 dark:border-slate-800",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

