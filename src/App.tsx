import { BrowserRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/components/AuthProvider";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { Layout } from "@/components/Layout";
import { LoginPage } from "@/pages/LoginPage";
import { CallbackPage } from "@/pages/CallbackPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { TasksPage } from "@/pages/TasksPage";
import { WorkflowsPage } from "@/pages/WorkflowsPage";
import { PrinciplesPage } from "@/pages/PrinciplesPage";
import { SearchPage } from "@/pages/SearchPage";
import { NotFoundPage } from "@/pages/NotFoundPage";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/callback" element={<CallbackPage />} />

            {/* Protected routes — all rendered inside the shell Layout */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DashboardPage />} />
              <Route path="profile" element={<ProfilePage />} />
              {/* Stub routes — screens added in subsequent sessions */}
              <Route path="tasks" element={<TasksPage />} />
              <Route path="workflows" element={<WorkflowsPage />} />
              <Route path="principles" element={<PrinciplesPage />} />
              <Route path="facts/*" element={<ComingSoon label="Facts & Concepts" />} />
              <Route path="review/*" element={<ComingSoon label="Review Queue" />} />
              <Route path="ingestion/*" element={<ComingSoon label="Ingestion" />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="admin/*" element={<ComingSoon label="Admin" />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

function ComingSoon({ label }: { label: string }) {
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <h2 className="text-xl font-semibold text-gray-700">{label}</h2>
        <p className="mt-2 text-sm text-gray-400">Coming in next session.</p>
      </div>
    </div>
  );
}
