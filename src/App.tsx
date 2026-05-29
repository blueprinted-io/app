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
import { TaskCreatePage } from "@/pages/TaskCreatePage";
import { TaskDetailPage } from "@/pages/TaskDetailPage";
import { TaskDiffPage } from "@/pages/TaskDiffPage";
import { TaskEditPage } from "@/pages/TaskEditPage";
import { TaskRedirectPage } from "@/pages/TaskRedirectPage";
import { WorkflowsPage } from "@/pages/WorkflowsPage";
import { WorkflowCreatePage } from "@/pages/WorkflowCreatePage";
import { WorkflowDetailPage } from "@/pages/WorkflowDetailPage";
import { WorkflowEditPage } from "@/pages/WorkflowEditPage";
import { PrinciplesPage } from "@/pages/PrinciplesPage";
import { PrincipleCreatePage } from "@/pages/PrincipleCreatePage";
import { PrincipleDetailPage } from "@/pages/PrincipleDetailPage";
import { PrincipleEditPage } from "@/pages/PrincipleEditPage";
import { ReviewQueuePage } from "@/pages/ReviewQueuePage";
import { SearchPage } from "@/pages/SearchPage";
import { NotFoundPage } from "@/pages/NotFoundPage";
import { IngestionListPage } from "@/pages/IngestionListPage";
import { IngestionCreatePage } from "@/pages/IngestionCreatePage";
import { IngestionDetailPage } from "@/pages/IngestionDetailPage";
import { SectionSelectionPage } from "@/pages/SectionSelectionPage";
import { NavSelectionPage } from "@/pages/NavSelectionPage";
import { CandidateReviewPage } from "@/pages/CandidateReviewPage";
import { EstimateReviewPage } from "@/pages/EstimateReviewPage";
import { NotificationsPage } from "@/pages/NotificationsPage";
import { AdminLayout } from "@/pages/admin/AdminLayout";
import { AdminSettingsPage } from "@/pages/admin/AdminSettingsPage";
import { AdminDomainsPage } from "@/pages/admin/AdminDomainsPage";
import { AdminUsersPage } from "@/pages/admin/AdminUsersPage";
import { AdminHealthPage } from "@/pages/admin/AdminHealthPage";

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
              <Route path="tasks/new" element={<TaskCreatePage />} />
              <Route path="tasks/id/:taskId" element={<TaskRedirectPage />} />
              <Route path="tasks/:recordId/:version" element={<TaskDetailPage />} />
              <Route path="tasks/:recordId/:version/edit" element={<TaskEditPage />} />
              <Route path="tasks/:recordId/:version/diff" element={<TaskDiffPage />} />
              <Route path="workflows" element={<WorkflowsPage />} />
              <Route path="workflows/new" element={<WorkflowCreatePage />} />
              <Route path="workflows/:id/edit" element={<WorkflowEditPage />} />
              <Route path="workflows/:id" element={<WorkflowDetailPage />} />
              <Route path="principles" element={<PrinciplesPage />} />
              <Route path="principles/new" element={<PrincipleCreatePage />} />
              <Route path="principles/:id/edit" element={<PrincipleEditPage />} />
              <Route path="principles/:id" element={<PrincipleDetailPage />} />
              <Route path="facts/*" element={<ComingSoon label="Facts & Concepts" />} />
              <Route path="review" element={<ReviewQueuePage />} />
              <Route path="ingestion" element={<IngestionListPage />} />
              <Route path="ingestion/new" element={<IngestionCreatePage />} />
              <Route path="ingestion/:id" element={<IngestionDetailPage />} />
              <Route path="ingestion/:id/sections" element={<SectionSelectionPage />} />
              <Route path="ingestion/:id/nav-select" element={<NavSelectionPage />} />
              <Route path="ingestion/:id/candidates" element={<CandidateReviewPage />} />
              <Route path="ingestion/:id/chunks/:chunkId/estimates" element={<EstimateReviewPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="admin" element={<AdminLayout />}>
                <Route index element={<AdminSettingsPage />} />
                <Route path="settings" element={<AdminSettingsPage />} />
                <Route path="domains" element={<AdminDomainsPage />} />
                <Route path="users" element={<AdminUsersPage />} />
                <Route path="health" element={<AdminHealthPage />} />
              </Route>
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
