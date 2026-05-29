const STATUS_CLASS: Record<string, string> = {
  draft:             "draft",
  submitted:         "submitted",
  confirmed:         "confirmed",
  returned:          "returned",
  deprecated:        "deprecated",
  retired:           "deprecated",
  pending:           "draft",
  processing:        "submitted",
  complete:          "confirmed",
  error:             "returned",
  triage_complete:   "submitted",
  extraction_queued: "submitted",
  extracting:        "submitted",
};

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_CLASS[status] ?? "deprecated";
  return <span className={`bp-badge bp-badge--${cls}`}>{status}</span>;
}
