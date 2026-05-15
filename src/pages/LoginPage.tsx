import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { signIn } from "@/lib/auth";

export function LoginPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();

  // Already logged in — redirect to dashboard.
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-brand-black">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand-amber border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex h-screen items-center justify-center bg-brand-black">
      <div className="w-full max-w-sm space-y-8 px-4">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-white tracking-tight">
            blue<span className="text-brand-amber">printed</span>
          </h1>
          <p className="mt-2 text-sm text-gray-400">
            Knowledge governance platform
          </p>
        </div>

        <button
          onClick={() => void signIn()}
          className="flex w-full items-center justify-center rounded-md bg-brand-amber px-4 py-2.5 text-sm font-semibold text-brand-black shadow-sm transition-opacity hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-amber"
        >
          Sign in with Authentik
        </button>
      </div>
    </div>
  );
}
