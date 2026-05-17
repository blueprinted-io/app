import { useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface TaskStub {
  record_id: string;
  version: number;
}

export function TaskRedirectPage() {
  const { taskId } = useParams<{ taskId: string }>();
  const navigate = useNavigate();

  const { data: task, error } = useQuery({
    queryKey: ["tasks", "by-id", taskId],
    queryFn: () => api.get<TaskStub>(`/tasks/${taskId}`),
    enabled: !!taskId,
  });

  useEffect(() => {
    if (task) {
      navigate(`/tasks/${task.record_id}/${task.version}`, { replace: true });
    }
  }, [task, navigate]);

  if (error) {
    return (
      <div className="p-8">
        <p className="text-sm text-red-600">Task not found or failed to load.</p>
      </div>
    );
  }

  return (
    <div className="p-8 flex items-center gap-2 text-sm text-gray-500">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-brand-amber border-t-transparent" />
      Loading task…
    </div>
  );
}
