import { useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

// Define task types and their colors
export const TASK_TYPES = {
  'journey': { title: 'Journey Time', color: '#ffd1dc' }, // Pink for journey
  'service': { title: 'Service Time', color: '#ff6b6b' }, // Red for service
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

interface ScheduleCalendarProps {
  engineerId?: string; // Optional - if not provided, shows all engineers
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
  isAdmin?: boolean;
}

export function ScheduleCalendar({ engineerId, events, onEventAdd, isAdmin }: ScheduleCalendarProps) {
  const { toast } = useToast();
  const { user } = useAuth();

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
        type: 'admin', // Default type, can be changed in a modal
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

  return (
    <Card className="p-4">
      <style>
        {`
          .fc-toolbar-title {
            color: hsl(var(--foreground)) !important;
          }
          .fc th {
            color: hsl(var(--foreground)) !important;
          }
          .fc-timegrid-axis-cushion,
          .fc-timegrid-slot-label-cushion {
            color: hsl(var(--foreground)) !important;
          }
          .fc-day-today {
            background-color: hsl(var(--accent)) !important;
            opacity: 0.1;
          }
          .fc-button {
            background-color: hsl(var(--primary)) !important;
            border-color: hsl(var(--primary)) !important;
          }
          .fc-button:hover {
            background-color: hsl(var(--primary)) !important;
            opacity: 0.9;
          }
          .fc-button-active {
            background-color: hsl(var(--accent)) !important;
            border-color: hsl(var(--accent)) !important;
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
        editable={!!onEventAdd}
        selectable={!!onEventAdd}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        events={calendarEvents}
        select={handleDateSelect}
        height="auto"
        allDaySlot={true}
        slotMinTime="06:00:00"
        slotMaxTime="22:00:00"
      />
    </Card>
  );
}