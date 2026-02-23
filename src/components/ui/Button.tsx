"use client";

import type { ButtonHTMLAttributes } from "react";
import { forwardRef } from "react";
import clsx from "clsx";

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
type ButtonSize = "sm" | "md";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const baseClasses =
  "inline-flex items-center justify-center rounded-lg text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 hover:scale-[1.02]";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-flowdesk-gradient text-white shadow-sm hover:opacity-90 hover:shadow-md",
  secondary:
    "border border-primary bg-white text-primary hover:bg-primary/10 shadow-sm",
  ghost:
    "text-textSecondary hover:bg-slate-100 hover:text-textPrimary border border-transparent",
  danger:
    "bg-red-500 text-white shadow-sm hover:bg-red-600 hover:shadow-md",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "px-3 py-1.5",
  md: "px-4 py-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      fullWidth,
      className,
      type = "button",
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        type={type}
        className={clsx(
          baseClasses,
          variantClasses[variant],
          sizeClasses[size],
          fullWidth && "w-full",
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

