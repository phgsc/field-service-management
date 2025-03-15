import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AdminNav } from "@/components/admin-nav";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
      engineerId: string;
      engineerName: string;
      title: string;
      type: string;
      allDay: boolean;
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
      <Card>
        <CardHeader>
          <CardTitle>Engineer Schedules</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[600px]">
            <ScheduleCalendar
              events={schedules || []}
              onEventAdd={async (eventData) => {
                await addScheduleMutation.mutateAsync(eventData);
              }}
              isAdmin={true}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}