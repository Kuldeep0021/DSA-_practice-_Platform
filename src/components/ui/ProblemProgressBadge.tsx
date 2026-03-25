export type ProblemProgressStatus = "solved" | "attempted" | "unseen";

interface ProblemProgressBadgeProps {
  status: ProblemProgressStatus;
  className?: string;
}

const STATUS_STYLES: Record<ProblemProgressStatus, string> = {
  solved: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  attempted: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  unseen: "bg-slate-500/15 text-slate-300 border-slate-500/30",
};

const STATUS_LABELS: Record<ProblemProgressStatus, string> = {
  solved: "Solved",
  attempted: "Attempted",
  unseen: "Unseen",
};

export default function ProblemProgressBadge({
  status,
  className,
}: ProblemProgressBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium",
        STATUS_STYLES[status],
        className ?? "",
      ].join(" ")}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
