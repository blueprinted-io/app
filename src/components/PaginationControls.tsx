import type { Page } from "@/lib/api";

interface PaginationControlsProps {
  page: Page<unknown>;
  onOffsetChange: (offset: number) => void;
}

export function PaginationControls({ page, onOffsetChange }: PaginationControlsProps) {
  const { total, limit, offset } = page;
  if (total <= limit) return null;

  const from = offset + 1;
  const to = Math.min(offset + limit, total);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 12,
        marginTop: 12,
      }}
    >
      <span className="bp-muted" style={{ fontSize: 13 }}>
        {from}–{to} of {total}
      </span>
      <button
        type="button"
        className="bp-btn bp-btn--secondary"
        disabled={offset === 0}
        onClick={() => onOffsetChange(Math.max(0, offset - limit))}
      >
        Previous
      </button>
      <button
        type="button"
        className="bp-btn bp-btn--secondary"
        disabled={offset + limit >= total}
        onClick={() => onOffsetChange(offset + limit)}
      >
        Next
      </button>
    </div>
  );
}
