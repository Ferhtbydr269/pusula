"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "solid" | "outline" | "quiet" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: "sm" | "md";
  children: ReactNode;
}

/* Birincil eylem mürekkep zeminde; ayva altını yalnızca işaret ve ilerleme
   rengi olarak kalsın, düğmelerde harcanmasın. */
const variants: Record<Variant, string> = {
  solid:
    "bg-ink text-paper hover:bg-ink/90 disabled:bg-rule-strong disabled:text-faint",
  outline:
    "border border-rule-strong bg-transparent hover:border-ink/40 hover:bg-sunk/60 disabled:text-faint disabled:hover:border-rule-strong disabled:hover:bg-transparent",
  quiet: "text-muted hover:bg-sunk hover:text-ink disabled:text-faint disabled:hover:bg-transparent",
  danger:
    "border border-brick/35 text-brick hover:border-brick/60 hover:bg-brick/8",
};

export function Button({
  variant = "outline",
  size = "md",
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors duration-150 disabled:cursor-not-allowed",
        size === "sm" ? "px-2.5 py-1.5 text-sm" : "px-4 py-2 text-sm",
        variants[variant],
        className,
      )}
    >
      {children}
    </button>
  );
}
