import { useState } from "react";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface TagInputProps {
  label: string;
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}

export function TagInput({ label, values, onChange, placeholder }: TagInputProps) {
  const [draft, setDraft] = useState("");

  function add() {
    const trimmed = draft.trim();
    if (trimmed && !values.includes(trimmed)) onChange([...values, trimmed]);
    setDraft("");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Label>{label}</Label>
      <div style={{ display: "flex", gap: 8 }}>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={placeholder ?? "Type and press Enter"}
        />
        <button type="button" className="bp-btn bp-btn--ghost" onClick={add} disabled={!draft.trim()}>
          Add
        </button>
      </div>
      {values.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingTop: 2 }}>
          {values.map((v) => (
            <span
              key={v}
              style={{
                display: "inline-flex", alignItems: "center", gap: 4,
                borderRadius: 999, padding: "2px 10px",
                background: "color-mix(in oklab, var(--bp-accent) 12%, var(--bp-bg))",
                color: "var(--bp-accent-deep)",
                border: "1px solid color-mix(in oklab, var(--bp-accent) 30%, var(--bp-border))",
                fontSize: 12, fontWeight: 600,
              }}
            >
              {v}
              <button
                type="button"
                onClick={() => onChange(values.filter((x) => x !== v))}
                style={{ background: "none", border: "none", padding: 0, cursor: "pointer", color: "var(--bp-accent-deep)", display: "inline-flex", alignItems: "center" }}
              >
                <X size={10} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
