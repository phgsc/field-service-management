import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Download } from "lucide-react";
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
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
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
  const { user } = useAuth();
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [selectedDates, setSelectedDates] = useState<{
    start: Date;
    end: Date;
    allDay: boolean;
  } | null>(null);
  const [reportDateRange, setReportDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      type: "admin",
    },
  });

  // Fetch engineer's schedules and visits
  const { data: schedules, isLoading: isLoadingSchedules } = useQuery({
    queryKey: ["/api/schedules", user?.id],
    enabled: !!user?.id,
    onSuccess: (data) => {
      console.log("Fetched schedules:", data);
    }
  });

  const { data: visits, isLoading: isLoadingVisits } = useQuery({
    queryKey: ["/api/visits", user?.id],
    enabled: !!user?.id,
  });

  // Combine schedules and visits into events
  const events = useMemo(() => {
    const allEvents = [];

    // Add regular schedules
    if (schedules && Array.isArray(schedules)) {
      console.log("Processing schedules:", schedules);
      allEvents.push(...schedules);
    }

    // Add visits as events
    if (visits && Array.isArray(visits)) {
      visits.forEach((visit) => {
        // Add journey time
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

        // Add service time
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

  // Update the mutation function to match the schema
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
        // Ensure dates are in ISO format
        start: scheduleData.start.toISOString(),
        end: scheduleData.end.toISOString(),
      };
      console.log("Sending schedule creation payload:", payload);

      const res = await apiRequest("POST", "/api/schedules", payload);
      if (!res.ok) {
        const error = await res.json();
        console.error("API error response:", error);
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
      console.error("Schedule creation error:", error);
      toast({
        title: "Failed to add task",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update the mutation function to ensure we're sending the correct ID
  const updateScheduleMutation = useMutation({
    mutationFn: async (scheduleData: {
      id: string;
      title?: string;
      type?: TaskType;
      start?: Date;
      end?: Date;
    }) => {
      // Ensure the ID is valid before sending
      if (!scheduleData.id) {
        throw new Error("Schedule ID is required for updates");
      }

      // Skip updates for visit-related events
      if (scheduleData.id.startsWith('journey-') || scheduleData.id.startsWith('service-')) {
        throw new Error("Cannot update visit-related events");
      }

      console.log("Updating schedule with ID:", scheduleData.id);
      console.log("Update payload:", scheduleData);

      const payload = {
        ...scheduleData,
        // Convert dates to ISO strings if they exist
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
        console.error("Schedule update error response:", error);
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
      console.error("Schedule update error:", error);
      toast({
        title: "Failed to update task",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Function to download calendar report
  const downloadReport = async () => {
    if (!reportDateRange.from || !reportDateRange.to) {
      toast({
        title: "Date range required",
        description: "Please select both start and end dates for the report",
        variant: "destructive",
      });
      return;
    }

    try {
      // Filter events within the selected date range
      const filteredEvents = events.filter((event) => {
        const eventDate = new Date(event.start);
        return (
          eventDate >= reportDateRange.from! && eventDate <= reportDateRange.to!
        );
      });

      // Create CSV content
      const csvContent = [
        ["Date", "Time", "Title", "Type", "Duration (hours)"].join(","),
        ...filteredEvents.map((event) => {
          const start = new Date(event.start);
          const end = new Date(event.end);
          const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

          return [
            format(start, "yyyy-MM-dd"),
            format(start, "HH:mm"),
            event.title,
            event.type,
            duration.toFixed(2),
          ].join(",");
        }),
      ].join("\n");

      // Create and download the file
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `calendar-report-${format(reportDateRange.from, "yyyy-MM-dd")}-to-${format(reportDateRange.to, "yyyy-MM-dd")}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setIsReportDialogOpen(false);
      toast({
        title: "Report downloaded",
        description: "Your calendar report has been downloaded successfully",
      });
    } catch (error) {
      console.error("Report generation error:", error);
      toast({
        title: "Failed to generate report",
        description: "An error occurred while generating the report",
        variant: "destructive",
      });
    }
  };

  // Handle dialog close
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
          <Button
            onClick={() => setIsReportDialogOpen(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Report
          </Button>
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

      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download Calendar Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Date Range</Label>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !reportDateRange.from && "text-muted-foreground",
                      )}
                    >
                      {reportDateRange.from ? (
                        format(reportDateRange.from, "PPP")
                      ) : (
                        <span>Pick a start date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={reportDateRange.from}
                      onSelect={(date) =>
                        setReportDateRange((prev) => ({ ...prev, from: date }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !reportDateRange.to && "text-muted-foreground",
                      )}
                    >
                      {reportDateRange.to ? (
                        format(reportDateRange.to, "PPP")
                      ) : (
                        <span>Pick an end date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={reportDateRange.to}
                      onSelect={(date) =>
                        setReportDateRange((prev) => ({ ...prev, to: date }))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
            <Button
              className="w-full"
              onClick={downloadReport}
              disabled={!reportDateRange.from || !reportDateRange.to}
            >
              Download Report
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}