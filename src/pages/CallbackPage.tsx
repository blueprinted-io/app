import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { handleCallback } from "@/lib/auth";

export function CallbackPage() {
  const navigate = useNavigate();
  // Prevent double-invocation in React StrictMode.
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    handleCallback()
      .then(() => navigate("/", { replace: true }))
      .catch((err: unknown) => {
        console.error("OIDC callback error:", err);
        navigate("/login", { replace: true });
      });
  }, [navigate]);

  return (
    <div className="flex h-screen items-center justify-center bg-brand-black">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-amber border-t-transparent" />
    </div>
  );
}
