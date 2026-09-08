import type { ReactNode } from "react";
import { SiteFooter } from "@/components/afterlap/footer";
import { Mark } from "@/components/afterlap/mark";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  variant = "phone",
  showFooter,
}: {
  children: ReactNode;
  variant?: "phone" | "watch";
  showFooter?: boolean;
}) {
  const footer = showFooter ?? variant === "phone";
  return (
    <div className="grain relative min-h-dvh bg-background text-foreground">
      <div
        className={cn(
          "relative mx-auto flex min-h-dvh w-full flex-col",
          variant === "phone"
            ? "max-w-md px-5 pb-[max(1.75rem,env(safe-area-inset-bottom))] pt-[max(1.25rem,env(safe-area-inset-top))]"
            : "max-w-lg items-center justify-center px-4 py-8",
        )}
      >
        {children}
        {footer ? <SiteFooter /> : null}
      </div>
    </div>
  );
}

export function Wordmark({
  kicker,
  className,
}: {
  kicker?: string;
  className?: string;
}) {
  return (
    <div className={cn("flex items-center justify-between gap-3", className)}>
      <div className="flex items-center gap-2.5 text-foreground">
        <Mark className="size-5" />
        <p className="font-display text-lg tracking-[0.22em] uppercase">Afterlap</p>
      </div>
      {kicker ? (
        <p className="text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
          {kicker}
        </p>
      ) : null}
    </div>
  );
}
