import type { PropsWithChildren } from "react";

interface SurfaceCardProps extends PropsWithChildren {
  className?: string;
}

export default function SurfaceCard({ children, className }: SurfaceCardProps) {
  return (
    <div
      className={[
        "rounded-xl border border-slate-700/70 bg-[#1a1d24] shadow-[0_12px_40px_rgba(0,0,0,0.35)]",
        className ?? "",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
