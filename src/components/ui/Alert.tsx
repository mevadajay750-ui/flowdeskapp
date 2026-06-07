import type { HTMLAttributes, ReactNode } from "react";
import clsx from "clsx";

type AlertVariant = "error" | "success" | "warning";

interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: AlertVariant;
  children: ReactNode;
}

const variantClasses: Record<AlertVariant, string> = {
  error: "border-error/30 bg-error/10 text-error",
  success: "border-success/30 bg-success/10 text-success",
  warning: "border-warning/30 bg-warning/10 text-warning",
};

export function Alert({
  variant = "error",
  children,
  className,
  ...props
}: AlertProps) {
  return (
    <div
      role="alert"
      className={clsx(
        "rounded-md border px-3 py-2 text-xs",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
