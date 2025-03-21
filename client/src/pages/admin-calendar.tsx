import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, Download, LogOut } from "lucide-react";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { AdminNav } from "@/components/admin-nav";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { format, startOfDay, endOfDay } from "date-fns";
import * as ExcelJS from 'exceljs';
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import type { TaskType } from "@/components/schedule-calendar";

export default function AdminCalendarView() {
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportDateRange, setReportDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });

  // Redirect non-admin users
  if (!user?.isAdmin) {
    return <Redirect to="/" />;
  }

  // Query schedules
  const { data: schedules, isLoading: isLoadingSchedules } = useQuery({
    queryKey: ["/api/schedules"],
    refetchInterval: 30000
  });

  // Query visits
  const { data: visits, isLoading: isLoadingVisits } = useQuery({
    queryKey: ["/api/visits"],
    enabled: user?.isAdmin,
    refetchInterval: 30000
  });

  // Query engineers
  const { data: engineers, isLoading: isLoadingEngineers } = useQuery({
    queryKey: ["/api/engineers"],
    enabled: user?.isAdmin
  });

  // Group schedules and visits by engineer
  const engineerSchedules = useMemo(() => {
    if (!engineers || !schedules) return {};

    return engineers.reduce((acc: Record<string, any[]>, engineer) => {
      const allEvents = [];

      // Add scheduled events
      const engineerEvents = schedules.filter((schedule: any) => schedule.engineerId === engineer.id);
      allEvents.push(...engineerEvents);

      // Add visit events if available
      if (visits && Array.isArray(visits)) {
        const engineerVisits = visits.filter((visit: any) => visit.userId === engineer.id);
        engineerVisits.forEach(visit => {
          if (visit.journeyStartTime && visit.journeyEndTime) {
            allEvents.push({
              id: `journey-${visit.id}`,
              title: "Journey to Site",
              start: new Date(visit.journeyStartTime),
              end: new Date(visit.journeyEndTime),
              type: "journey" as TaskType,
              engineerId: visit.userId,
              engineerName: engineer.profile?.name || engineer.username || "",
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
              engineerName: engineer.profile?.name || engineer.username || "",
            });
          }
        });
      }

      acc[engineer.id] = allEvents;
      return acc;
    }, {});
  }, [schedules, visits, engineers]);

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
      if (!engineers || !Array.isArray(engineers)) {
        throw new Error("No engineer data available");
      }

      // Set date range boundaries for consistent filtering
      const rangeStart = startOfDay(reportDateRange.from);
      const rangeEnd = endOfDay(reportDateRange.to);

      // Create a new workbook
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'Field Service Management';
      workbook.created = new Date();

      // Process each engineer
      for (const engineer of engineers) {
        const engineerEvents = engineerSchedules[engineer.id] || [];

        // Filter events for this engineer within the date range
        const filteredEvents = engineerEvents.filter(event => {
          const eventDate = new Date(event.start);
          return eventDate >= rangeStart && eventDate <= rangeEnd;
        });

        // Create worksheet for this engineer
        const sheetName = (engineer.profile?.name || engineer.username || 'Unknown')
          .slice(0, 30) // Excel sheet names limited to 31 chars
          .replace(/[\[\]\*\/\\\?\:]/g, ''); // Remove invalid chars

        const worksheet = workbook.addWorksheet(sheetName);

        // Add header with styling
        worksheet.mergeCells('A1:E1');
        const titleRow = worksheet.getRow(1);
        titleRow.getCell(1).value = 'Engineer Schedule Report';
        titleRow.font = { bold: true, size: 14 };

        // Add engineer info
        worksheet.mergeCells('A2:E2');
        worksheet.getCell('A2').value = `Name: ${engineer.profile?.name || engineer.username || 'Unknown Engineer'}`;

        worksheet.mergeCells('A3:E3');
        worksheet.getCell('A3').value = `Date Range: ${format(rangeStart, "PPP")} to ${format(rangeEnd, "PPP")}`;

        // Add headers
        worksheet.getRow(5).values = ['Date', 'Time', 'Title', 'Type', 'Duration (hours)'];
        worksheet.getRow(5).font = { bold: true };

        // Add data
        if (filteredEvents.length > 0) {
          let rowIndex = 6;
          filteredEvents.forEach(event => {
            const start = new Date(event.start);
            const end = new Date(event.end);
            const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);

            worksheet.getRow(rowIndex).values = [
              format(start, "yyyy-MM-dd"),
              format(start, "HH:mm"),
              event.title,
              event.type,
              Number(duration.toFixed(2))
            ];
            rowIndex++;
          });
        } else {
          worksheet.getCell('A6').value = 'No events in selected date range';
        }

        // Set column widths
        worksheet.columns = [
          { width: 12 }, // Date
          { width: 8 },  // Time
          { width: 30 }, // Title
          { width: 15 }, // Type
          { width: 15 }  // Duration
        ];
      }

      // Generate blob and download
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
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

  if (isLoadingSchedules || isLoadingEngineers || isLoadingVisits) {
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
        <div className="flex items-center gap-2">
          <Button
            onClick={() => setIsReportDialogOpen(true)}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Download Report
          </Button>
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

      <Card>
        <CardHeader>
          <CardTitle>Schedule Management</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue={engineers?.[0]?.id} className="space-y-4">
            <TabsList className="gap-2">
              {engineers?.map(engineer => (
                <TabsTrigger key={engineer.id} value={engineer.id}>
                  {engineer.profile?.name || engineer.username}
                </TabsTrigger>
              ))}
            </TabsList>
            {engineers?.map(engineer => (
              <TabsContent key={engineer.id} value={engineer.id}>
                <div className="h-[600px]">
                  <ScheduleCalendar
                    engineerId={engineer.id}
                    events={engineerSchedules[engineer.id] || []}
                    isAdmin={true}
                    initialDate={engineerSchedules[engineer.id]?.length
                      ? new Date(Math.min(...engineerSchedules[engineer.id].map(e => new Date(e.start).getTime())))
                      : new Date()}
                  />
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
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
              onClick={downloadReport}
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