import type { PropsWithChildren } from "react";
import clsx from "clsx";

export function GlassCard({
  children,
  className,
  title,
}: PropsWithChildren<{ className?: string; title?: string }>) {
  return (
    <div className={clsx("glass-card p-5", className)}>
      {title && <h3 className="section-label mb-3">{title}</h3>}
      {children}
    </div>
  );
}
