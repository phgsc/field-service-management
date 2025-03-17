import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, LogOut } from "lucide-react";
import {
  ScheduleCalendar,
  TASK_TYPES,
  TaskType,
} from "@/components/schedule-calendar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum([
    "journey",
    "service",
    "admin",
    "sales-call",
    "sales-visit",
    "research",
    "day-off",
    "vacation",
    "public-holiday",
    "weekly-off",
    "in-office",
  ] as const),
});

type TaskFormData = z.infer<typeof taskSchema>;

export default function EngineerCalendarView() {
  const { user, logoutMutation } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<{
    start: Date;
    end: Date;
    allDay: boolean;
  } | null>(null);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      type: "admin",
    },
  });

  const { data: schedules, isLoading: isLoadingSchedules } = useQuery({
    queryKey: ["/api/schedules", user?.id],
    enabled: !!user?.id,
  });

  const { data: visits, isLoading: isLoadingVisits } = useQuery({
    queryKey: ["/api/visits", user?.id],
    enabled: !!user?.id,
  });

  const events = useMemo(() => {
    const allEvents = [];

    if (schedules && Array.isArray(schedules)) {
      allEvents.push(...schedules);
    }

    if (visits && Array.isArray(visits)) {
      visits.forEach((visit) => {
        if (visit.journeyStartTime && visit.journeyEndTime) {
          allEvents.push({
            id: `journey-${visit.id}`,
            title: "Journey to Site",
            start: new Date(visit.journeyStartTime),
            end: new Date(visit.journeyEndTime),
            type: "journey" as TaskType,
            engineerId: visit.userId,
            engineerName: user?.profile?.name || user?.username || "",
          });
        }

        if (visit.serviceStartTime && visit.serviceEndTime) {
          allEvents.push({
            id: `service-${visit.id}`,
            title: `Service Visit - ${visit.jobId}`,
            start: new Date(visit.serviceStartTime),
            end: new Date(visit.serviceEndTime),
            type: "service" as TaskType,
            engineerId: visit.userId,
            engineerName: user?.profile?.name || user?.username || "",
          });
        }
      });
    }

    return allEvents;
  }, [schedules, visits, user]);

  const updateScheduleMutation = useMutation({
    mutationFn: async (scheduleData: {
      id: string;
      title?: string;
      type?: TaskType;
      start?: Date;
      end?: Date;
    }) => {
      if (!scheduleData.id) {
        throw new Error("Schedule ID is required for updates");
      }

      if (scheduleData.id.startsWith('journey-') || scheduleData.id.startsWith('service-')) {
        throw new Error("Cannot update visit-related events");
      }

      const payload = {
        ...scheduleData,
        ...(scheduleData.start && { start: scheduleData.start.toISOString() }),
        ...(scheduleData.end && { end: scheduleData.end.toISOString() })
      };

      const res = await apiRequest(
        "PATCH",
        `/api/schedules/${scheduleData.id}`,
        payload
      );

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to update schedule");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules", user?.id] });
      toast({
        title: "Success",
        description: "Task updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update task",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const addScheduleMutation = useMutation({
    mutationFn: async (scheduleData: {
      title: string;
      start: Date;
      end: Date;
      type: TaskType;
      allDay: boolean;
    }) => {
      const payload = {
        ...scheduleData,
        engineerId: user?.id,
        engineerName: user?.profile?.name || user?.username || "Unknown",
        start: scheduleData.start.toISOString(),
        end: scheduleData.end.toISOString(),
      };

      const res = await apiRequest("POST", "/api/schedules", payload);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to create schedule");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules", user?.id] });
      setIsDialogOpen(false);
      form.reset();
      setSelectedDates(null);
      toast({
        title: "Success",
        description: "Task added to schedule",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to add task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    form.reset();
    setSelectedDates(null);
  };

  if (isLoadingSchedules || isLoadingVisits || !user) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">My Schedule</h1>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => logoutMutation.mutate()}
              variant="outline"
              className="flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4">
          <ScheduleCalendar
            engineerId={user.id}
            events={events}
            onEventAdd={async (eventData) => {
              setSelectedDates(eventData);
              setIsDialogOpen(true);
            }}
            onEventUpdate={async (eventData) => {
              await updateScheduleMutation.mutateAsync(eventData);
            }}
          />
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={handleDialogClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Task</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit(async (data) => {
              if (!selectedDates) return;

              await addScheduleMutation.mutateAsync({
                title: data.title,
                type: data.type,
                start: selectedDates.start,
                end: selectedDates.end,
                allDay: selectedDates.allDay,
              });
            })}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="title">Task Title</Label>
              <Input id="title" {...form.register("title")} />
              {form.formState.errors.title && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.title.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Task Type</Label>
              <Select
                value={form.watch("type")}
                onValueChange={(value: TaskType) =>
                  form.setValue("type", value)
                }
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select task type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_TYPES).map(
                    ([type, { title, color }]) => (
                      <SelectItem
                        key={type}
                        value={type}
                        className="flex items-center gap-2"
                      >
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        {title}
                      </SelectItem>
                    ),
                  )}
                </SelectContent>
              </Select>
              {form.formState.errors.type && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.type.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={addScheduleMutation.isPending}
            >
              {addScheduleMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Add Task
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}