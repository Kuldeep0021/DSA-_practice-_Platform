import type { SubmissionStatus } from "@/src/types/domain";

interface StatusBadgeProps {
  status: SubmissionStatus;
  className?: string;
}

const STATUS_STYLES: Record<SubmissionStatus, string> = {
  accepted: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  wrong_answer: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  runtime_error: "bg-amber-500/15 text-amber-300 border-amber-500/30",
};

const STATUS_LABELS: Record<SubmissionStatus, string> = {
  accepted: "Accepted",
  wrong_answer: "Wrong Answer",
  runtime_error: "Runtime Error",
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold tracking-wide uppercase",
        STATUS_STYLES[status],
        className ?? "",
      ].join(" ")}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
