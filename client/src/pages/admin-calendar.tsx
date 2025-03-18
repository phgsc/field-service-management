import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Download } from "lucide-react";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay } from "date-fns";
import * as XLSX from 'xlsx';
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

  // Debug log to verify component mount
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

  // Debug log for initial data
  console.log("Initial data:", {
    engineersCount: engineers?.length || 0,
    schedulesCount: schedules?.length || 0,
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

      // Set date range boundaries for consistent filtering
      const rangeStart = startOfDay(reportDateRange.from);
      const rangeEnd = endOfDay(reportDateRange.to);

      console.log("Generating report with date range:", {
        from: rangeStart.toISOString(),
        to: rangeEnd.toISOString(),
        engineersCount: engineers.length,
        schedulesCount: schedules.length
      });

      // Create a new workbook
      const workbook = XLSX.utils.book_new();

      // Process each engineer
      engineers.forEach(engineer => {
        // Filter events for this engineer within the date range
        const engineerEvents = schedules.filter(event => {
          const eventDate = new Date(event.start);
          // Debug log for date filtering
          console.log("Checking event:", {
            eventId: event.id,
            eventStart: eventDate.toISOString(),
            dateRange: {
              from: rangeStart.toISOString(),
              to: rangeEnd.toISOString()
            },
            isInRange: eventDate >= rangeStart && eventDate <= rangeEnd,
            belongsToEngineer: event.engineerId === engineer.id
          });
          return event.engineerId === engineer.id &&
                 eventDate >= rangeStart &&
                 eventDate <= rangeEnd;
        });

        console.log("Engineer events filtered:", {
          engineerId: engineer.id,
          engineerName: engineer.profile?.name || engineer.username,
          totalEvents: schedules.filter(e => e.engineerId === engineer.id).length,
          filteredEvents: engineerEvents.length
        });

        // Create data for this engineer's sheet
        const sheetData = [
          ["Engineer Schedule Report"],
          [`Name: ${engineer.profile?.name || engineer.username || 'Unknown Engineer'}`],
          [`Date Range: ${format(rangeStart, "PPP")} to ${format(rangeEnd, "PPP")}`],
          [], // Empty row
          ["Date", "Time", "Title", "Type", "Duration (hours)"]
        ];

        if (engineerEvents.length > 0) {
          engineerEvents.forEach(event => {
            const start = new Date(event.start);
            const end = new Date(event.end);
            const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

            sheetData.push([
              format(start, "yyyy-MM-dd"),
              format(start, "HH:mm"),
              event.title,
              event.type,
              Number(duration.toFixed(2))
            ]);
          });
        } else {
          sheetData.push(["No events in selected date range"]);
        }

        // Create worksheet and add to workbook
        const worksheet = XLSX.utils.aoa_to_sheet(sheetData);

        // Set column widths
        const colWidths = [{ wch: 12 }, { wch: 8 }, { wch: 30 }, { wch: 15 }, { wch: 15 }];
        worksheet['!cols'] = colWidths;

        // Add the worksheet to the workbook
        const sheetName = (engineer.profile?.name || engineer.username || 'Unknown')
          .slice(0, 30) // Excel sheet names limited to 31 chars
          .replace(/[\[\]\*\/\\\?\:]/g, ''); // Remove invalid chars

        console.log("Adding sheet for engineer:", {
          engineerId: engineer.id,
          sheetName,
          rowCount: sheetData.length
        });

        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
      });

      // Generate Excel file
      const excelBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `engineer-schedules-${format(rangeStart, "yyyy-MM-dd")}-to-${format(rangeEnd, "yyyy-MM-dd")}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setIsReportDialogOpen(false);
      toast({
        title: "Report downloaded",
        description: "Your Excel report has been downloaded successfully",
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