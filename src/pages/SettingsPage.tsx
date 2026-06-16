import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

const LOCALE_OPTIONS: { value: string; label: string }[] = [
  { value: "en", label: "English" },
  { value: "fr", label: "Français" },
  { value: "de", label: "Deutsch" },
  { value: "es", label: "Español" },
  { value: "pt", label: "Português" },
  { value: "ja", label: "日本語" },
  { value: "zh", label: "中文" },
];

const NOTIFICATION_KEYS: { key: string; label: string }[] = [
  { key: "ingestion_complete", label: "Ingestion complete" },
  { key: "review_assigned", label: "Review assigned to me" },
  { key: "record_submitted", label: "Record submitted for review" },
];

interface MeResponse {
  id: string;
  sub: string;
  email: string;
  display_name: string | null;
  roles: string[];
  preferences: {
    locale?: string;
    notifications?: Record<string, boolean>;
  };
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface PreferencesPatch {
  locale?: string;
  notifications?: Record<string, boolean>;
}

export function SettingsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading, error } = useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<MeResponse>("/users/me"),
  });

  const mutation = useMutation({
    mutationFn: (patch: PreferencesPatch) =>
      api.patch<MeResponse>("/users/me/preferences", patch),
    onSuccess: (updated) => {
      queryClient.setQueryData(["me"], updated);
    },
  });

  if (isLoading) {
    return (
      <div className="bp-page">
        <p className="bp-muted" style={{ fontSize: 13 }}>Loading…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bp-page">
        <p style={{ fontSize: 13, color: "var(--bp-danger)" }}>Failed to load preferences.</p>
      </div>
    );
  }

  const prefs = data.preferences;
  const locale = prefs.locale ?? "en";
  const notifications = prefs.notifications ?? {};

  return (
    <div className="bp-page" style={{ maxWidth: 560 }}>
      <div className="bp-page__head">
        <div>
          <h1>Settings</h1>
          <p className="bp-page__sub">Your personal preferences.</p>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <section className="bp-card" style={{ padding: 0, overflow: "hidden" }}>
          <SectionHeader title="Language" />
          <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--bp-border)" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 13, color: "var(--bp-muted)" }}>Display language</span>
              <LocaleSelect
                value={locale}
                onChange={(next) => mutation.mutate({ locale: next })}
              />
            </label>
          </div>
        </section>

        <section className="bp-card" style={{ padding: 0, overflow: "hidden" }}>
          <SectionHeader title="Notifications" />
          {NOTIFICATION_KEYS.map(({ key, label }) => (
            <NotificationRow
              key={key}
              label={label}
              checked={notifications[key] !== false}
              onChange={(checked) =>
                mutation.mutate({
                  notifications: { ...notifications, [key]: checked },
                })
              }
            />
          ))}
        </section>

        {mutation.isError && (
          <p style={{ fontSize: 13, color: "var(--bp-danger)" }}>
            Failed to save preferences. Please try again.
          </p>
        )}
      </div>
    </div>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div style={{ padding: "12px 16px", borderBottom: "1px solid var(--bp-border)" }}>
      <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: ".06em", color: "var(--bp-muted)" }}>
        {title}
      </h3>
    </div>
  );
}

function LocaleSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (locale: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        fontSize: 13,
        padding: "6px 10px",
        borderRadius: 8,
        border: "1px solid var(--bp-border)",
        background: "var(--bp-bg)",
        color: "var(--bp-ink)",
        cursor: "pointer",
        width: "100%",
        maxWidth: 240,
      }}
    >
      {LOCALE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

function NotificationRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <label
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 16px",
        borderBottom: "1px solid var(--bp-border)",
        cursor: "pointer",
      }}
    >
      <span style={{ fontSize: 13, color: "var(--bp-ink)" }}>{label}</span>
      <Toggle checked={checked} onChange={onChange} />
    </label>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width: 36,
        height: 20,
        borderRadius: 10,
        border: "none",
        background: checked ? "var(--bp-accent)" : "var(--bp-border)",
        position: "relative",
        cursor: "pointer",
        flexShrink: 0,
        transition: "background 150ms",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 2,
          left: checked ? 18 : 2,
          width: 16,
          height: 16,
          borderRadius: "50%",
          background: "white",
          transition: "left 150ms",
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
}
