import type { PropsWithChildren } from "react";
import clsx from "clsx";

export function GlassCard({
  children,
  className,
  title,
  onClick,
}: PropsWithChildren<{ className?: string; title?: string; onClick?: () => void }>) {
  return (
    <div className={clsx("glass-card p-5", className)} onClick={onClick}>
      {title && <h3 className="section-label mb-3">{title}</h3>}
      {children}
    </div>
  );
}
