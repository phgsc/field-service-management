import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Download } from "lucide-react";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

export default function AdminCalendarView() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportDateRange, setReportDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  // Debug log to verify component mount and auth status
  console.log("AdminCalendarView mounted, user:", user);

  // Redirect non-admin users
  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  // Fetch all schedules
  const { data: schedules, isLoading: isLoadingSchedules } = useQuery({
    queryKey: ["/api/schedules"],
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch all engineers
  const { data: engineers, isLoading: isLoadingEngineers } = useQuery({
    queryKey: ["/api/engineers"],
    enabled: user?.isAdmin,
  });

  // Add new schedule entry
  const addScheduleMutation = useMutation({
    mutationFn: async (scheduleData: {
      start: Date;
      end: Date;
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

  const downloadReport = async () => {
    console.log("Download report clicked, opening dialog");
    if (!reportDateRange.from || !reportDateRange.to) {
      toast({
        title: "Date range required",
        description: "Please select both start and end dates for the report",
        variant: "destructive",
      });
      return;
    }

    try {
      if (!engineers || !Array.isArray(engineers)) {
        throw new Error("No engineer data available");
      }

      if (!schedules || !Array.isArray(schedules)) {
        throw new Error("No schedule data available");
      }

      console.log("Generating report with date range:", {
        from: reportDateRange.from,
        to: reportDateRange.to,
        engineersCount: engineers.length,
        schedulesCount: schedules.length
      });

      // Create sections for all engineers, even those without events
      const engineerSections = engineers.map(engineer => {
        // Filter events for this engineer within the date range
        const engineerEvents = schedules.filter(event => {
          const eventDate = new Date(event.start);
          const isInDateRange = eventDate >= reportDateRange.from! && 
                               eventDate <= reportDateRange.to!;
          return event.engineerId === engineer.id && isInDateRange;
        });

        // Create section even if no events
        return [
          `Engineer: ${engineer.profile?.name || engineer.username || 'Unknown Engineer'}`,
          ["Date", "Time", "Title", "Type", "Duration (hours)"].join(","),
          ...(engineerEvents.length > 0 
            ? engineerEvents.map(event => {
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
              })
            : ["No events in selected date range"]
          ),
          "" // Empty line between engineers
        ].join("\n");
      });

      const csvContent = engineerSections.join("\n");

      // Create and download the file
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `all-engineers-calendar-report-${format(
        reportDateRange.from,
        "yyyy-MM-dd"
      )}-to-${format(reportDateRange.to, "yyyy-MM-dd")}.csv`;
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
        description: error instanceof Error ? error.message : "An error occurred while generating the report",
        variant: "destructive",
      });
    }
  };

  if (isLoadingSchedules || isLoadingEngineers) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <AdminNav />
      <div className="mb-4 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Engineer Schedules</h1>
        <Button
          onClick={() => {
            console.log("Download Report button clicked");
            setIsReportDialogOpen(true);
          }}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Download Report
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Schedule Management</CardTitle>
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

      <Dialog open={isReportDialogOpen} onOpenChange={(open) => {
        console.log("Report dialog state changed:", open);
        setIsReportDialogOpen(open);
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Download Calendar Report</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid gap-2">
              <div className="flex flex-col space-y-2">
                <span className="font-medium">Select Date Range</span>
                <div className="flex gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left font-normal",
                          !reportDateRange.from && "text-muted-foreground"
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
                          !reportDateRange.to && "text-muted-foreground"
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
            </div>
            <Button
              onClick={() => {
                console.log("Download report button clicked with dates:", reportDateRange);
                downloadReport();
              }}
              className="w-full"
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