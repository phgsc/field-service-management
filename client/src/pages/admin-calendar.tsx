import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ScheduleCalendar, TASK_TYPES, TaskType } from "@/components/schedule-calendar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AdminNav } from "@/components/admin-nav";

export default function AdminCalendarView() {
  // Fetch all schedules
  const { data: schedules, isLoading } = useQuery({
    queryKey: ["/api/schedules"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Add new schedule entry
  const addScheduleMutation = useMutation({
    mutationFn: async (scheduleData: {
      start: Date;
      end: Date;
      type: TaskType;
      allDay: boolean;
      engineerId: string;
    }) => {
      const res = await apiRequest("POST", "/api/schedules", scheduleData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules"] });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <AdminNav />
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">Engineer Schedules</h1>
        <div className="grid grid-cols-1 gap-4">
          <ScheduleCalendar
            events={schedules || []}
            onEventAdd={async (eventData) => {
              // In a real implementation, you'd show a modal here to select the engineer
              // and task type before creating the event
              await addScheduleMutation.mutateAsync({
                ...eventData,
                engineerId: "some-engineer-id" // This would come from the modal
              });
            }}
          />
        </div>
      </div>
    </div>
  );
}
