import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { ScheduleCalendar, TASK_TYPES, TaskType } from "@/components/schedule-calendar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
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
import { useState } from "react";
import { useForm } from "react-hook-form";

interface NewTaskFormData {
  title: string;
  type: TaskType;
  isMultiDay: boolean;
}

export default function EngineerCalendarView() {
  const { user } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<{
    start: Date;
    end: Date;
    allDay: boolean;
  } | null>(null);

  const form = useForm<NewTaskFormData>({
    defaultValues: {
      title: "",
      type: "admin",
      isMultiDay: false
    }
  });

  // Fetch engineer's schedules
  const { data: schedules, isLoading } = useQuery({
    queryKey: ["/api/schedules", user?.id],
    enabled: !!user?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Add new schedule entry
  const addScheduleMutation = useMutation({
    mutationFn: async (scheduleData: {
      title: string;
      start: Date;
      end: Date;
      type: TaskType;
      allDay: boolean;
    }) => {
      const res = await apiRequest("POST", "/api/schedules", scheduleData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedules", user?.id] });
      setIsDialogOpen(false);
      form.reset();
    },
  });

  if (isLoading || !user) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">My Schedule</h1>
        <div className="grid grid-cols-1 gap-4">
          <ScheduleCalendar
            engineerId={user.id}
            events={schedules || []}
            onEventAdd={async (eventData) => {
              setSelectedDates(eventData);
              setIsDialogOpen(true);
            }}
          />
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
              <Input id="title" {...form.register("title")} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="type">Task Type</Label>
              <Select
                value={form.watch("type")}
                onValueChange={(value: TaskType) => form.setValue("type", value)}
              >
                <SelectTrigger id="type">
                  <SelectValue placeholder="Select task type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(TASK_TYPES).map(([type, { title, color }]) => (
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
                  ))}
                </SelectContent>
              </Select>
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