import { Link } from "react-router-dom";

export function NotFoundPage() {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <p className="text-sm font-semibold text-brand-amber">404</p>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">Page not found</h1>
        <Link
          to="/"
          className="mt-4 inline-block text-sm text-gray-500 underline hover:text-gray-900"
        >
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
