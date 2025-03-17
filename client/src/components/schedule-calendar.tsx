import { useCallback, useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
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
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

// Define task types and their colors
export const TASK_TYPES = {
  'journey': { title: 'Journey Time', color: '#ffd1dc' },
  'service': { title: 'Service Time', color: '#ff6b6b' },
  'admin': { title: 'Administrative', color: '#4dabf7' },
  'sales-call': { title: 'Sales Call', color: '#69db7c' },
  'sales-visit': { title: 'Sales Visit', color: '#38d9a9' },
  'research': { title: 'Research', color: '#748ffc' },
  'day-off': { title: 'Day Off', color: '#ff922b' },
  'vacation': { title: 'Vacation', color: '#ffd43b' },
  'public-holiday': { title: 'Public Holiday', color: '#e599f7' },
  'weekly-off': { title: 'Weekly Off', color: '#ffa94d' },
  'in-office': { title: 'In Office', color: '#9775fa' }
} as const;

export type TaskType = keyof typeof TASK_TYPES;

const taskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  type: z.enum([
    'journey', 'service', 'admin', 'sales-call', 'sales-visit',
    'research', 'day-off', 'vacation', 'public-holiday',
    'weekly-off', 'in-office'
  ] as const)
});

type TaskFormData = z.infer<typeof taskSchema>;

interface ScheduleCalendarProps {
  engineerId?: string;
  events: Array<{
    id: string;
    title: string;
    start: Date;
    end: Date;
    type: TaskType;
    engineerId: string;
    engineerName: string;
  }>;
  onEventAdd?: (event: {
    start: Date;
    end: Date;
    type: TaskType;
    allDay: boolean;
  }) => Promise<void>;
  onEventUpdate?: (event: {
    id: string;
    start?: Date;
    end?: Date;
    title?: string;
    type?: TaskType;
  }) => Promise<void>;
  isAdmin?: boolean;
}

export function ScheduleCalendar({ engineerId, events, onEventAdd, onEventUpdate, isAdmin }: ScheduleCalendarProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      title: "",
      type: "admin"
    }
  });

  // Format events for the calendar
  const calendarEvents = useMemo(() => {
    return events.map(event => ({
      id: event.id,
      title: isAdmin ? `${event.title} - ${event.engineerName}` : event.title,
      start: event.start,
      end: event.end,
      backgroundColor: TASK_TYPES[event.type].color,
      borderColor: TASK_TYPES[event.type].color,
      extendedProps: {
        type: event.type,
        engineerId: event.engineerId
      }
    }));
  }, [events, isAdmin]);

  // Handle date selection for new events
  const handleDateSelect = useCallback(async (selectInfo: any) => {
    if (!onEventAdd || !user) return;

    try {
      await onEventAdd({
        start: selectInfo.start,
        end: selectInfo.end,
        type: 'admin',
        allDay: selectInfo.allDay,
      });
    } catch (error) {
      toast({
        title: "Failed to add event",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  }, [onEventAdd, user, toast]);

  // Handle event drag and resize
  const handleEventChange = useCallback(async (changeInfo: any) => {
    if (!onEventUpdate) return;

    try {
      // Extract the correct ID from the event
      const eventId = changeInfo.event.id;
      if (!eventId) {
        throw new Error("Event ID is missing");
      }

      // Skip updates for visit-related events
      if (eventId.startsWith('journey-') || eventId.startsWith('service-')) {
        toast({
          title: "Cannot update visit",
          description: "Visit-related events cannot be modified",
          variant: "destructive"
        });
        changeInfo.revert();
        return;
      }

      console.log("Updating event with ID:", eventId);
      await onEventUpdate({
        id: eventId,
        start: changeInfo.event.start,
        end: changeInfo.event.end
      });
    } catch (error) {
      changeInfo.revert();
      toast({
        title: "Failed to update event",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  }, [onEventUpdate, toast]);

  // Handle event click for editing
  const handleEventClick = useCallback((clickInfo: any) => {
    // Skip edit for visit-related events
    if (clickInfo.event.id.startsWith('journey-') || clickInfo.event.id.startsWith('service-')) {
      toast({
        title: "Cannot edit visit",
        description: "Visit-related events cannot be modified",
        variant: "destructive"
      });
      return;
    }

    // Ensure we have a valid event ID before opening edit dialog
    if (!clickInfo.event.id) {
      toast({
        title: "Error",
        description: "Cannot edit this event - missing ID",
        variant: "destructive"
      });
      return;
    }

    console.log("Opening edit dialog for event:", clickInfo.event.id);
    setSelectedEvent({
      id: clickInfo.event.id,
      title: clickInfo.event.title,
      type: clickInfo.event.extendedProps.type
    });

    form.reset({
      title: clickInfo.event.title,
      type: clickInfo.event.extendedProps.type
    });
    setIsEditDialogOpen(true);
  }, [form, toast]);

  const handleEditSubmit = async (data: TaskFormData) => {
    if (!selectedEvent || !onEventUpdate) return;

    try {
      console.log("Submitting edit for event:", selectedEvent.id);
      await onEventUpdate({
        id: selectedEvent.id,
        title: data.title,
        type: data.type
      });
      setIsEditDialogOpen(false);
      setSelectedEvent(null);
      form.reset();
    } catch (error) {
      toast({
        title: "Failed to update event",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive"
      });
    }
  };

  return (
    <Card className="p-4">
      <style>
        {`
          .fc {
            --fc-border-color: hsl(var(--border));
            --fc-button-text-color: hsl(var(--primary-foreground));
            --fc-button-bg-color: hsl(var(--primary));
            --fc-button-border-color: hsl(var(--primary));
            --fc-button-hover-bg-color: hsl(var(--primary));
            --fc-button-hover-border-color: hsl(var(--primary));
            --fc-button-active-bg-color: hsl(var(--accent));
            --fc-button-active-border-color: hsl(var(--accent));
          }

          .fc .fc-toolbar-title {
            color: hsl(var(--foreground));
            font-weight: 600;
          }

          .fc th {
            color: hsl(var(--foreground));
            font-weight: 500;
            padding: 8px;
            background-color: hsl(var(--muted));
          }

          .fc-theme-standard td {
            border-color: hsl(var(--border));
          }

          .fc-timegrid-axis-cushion,
          .fc-timegrid-slot-label-cushion {
            color: hsl(var(--foreground));
          }

          .fc-day-today {
            background-color: hsl(var(--accent) / 0.1) !important;
          }

          .fc-event {
            border-radius: 4px;
            padding: 2px;
            cursor: pointer;
          }
        `}
      </style>
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="timeGridWeek"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay'
        }}
        editable={!!onEventUpdate}
        selectable={!!onEventAdd}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        events={calendarEvents}
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventDrop={handleEventChange}
        eventResize={handleEventChange}
        height="auto"
        allDaySlot={true}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
      />

      <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setIsEditDialogOpen(false);
          setSelectedEvent(null);
          form.reset();
        }
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Task</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={form.handleSubmit(handleEditSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="title">Task Title</Label>
              <Input
                id="title"
                {...form.register("title")}
              />
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
              {form.formState.errors.type && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.type.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={form.formState.isSubmitting}
            >
              Update Task
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}