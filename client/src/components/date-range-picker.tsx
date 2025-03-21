import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useRef, useEffect } from "react";

interface DateRangePickerProps {
  dateRange: {
    from: Date | undefined;
    to: Date | undefined;
  };
  onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
}

export function DateRangePicker({ dateRange, onDateRangeChange }: DateRangePickerProps) {
  const toButtonRef = useRef<HTMLButtonElement>(null);
  const downloadButtonRef = useRef<HTMLButtonElement>(null);

  // Auto-focus "to" date picker when "from" date is selected
  useEffect(() => {
    if (dateRange.from && !dateRange.to && toButtonRef.current) {
      toButtonRef.current.click();
    }
  }, [dateRange.from]);

  // Auto-focus download button when both dates are selected
  useEffect(() => {
    if (dateRange.from && dateRange.to && downloadButtonRef.current) {
      downloadButtonRef.current.focus();
    }
  }, [dateRange.from, dateRange.to]);

  return (
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
                  !dateRange.from && "text-muted-foreground"
                )}
              >
                {dateRange.from ? (
                  format(dateRange.from, "PPP")
                ) : (
                  <span>Pick a start date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateRange.from}
                onSelect={(date) =>
                  onDateRangeChange((prev) => ({ ...prev, from: date }))
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                ref={toButtonRef}
                variant="outline"
                className={cn(
                  "justify-start text-left font-normal",
                  !dateRange.to && "text-muted-foreground"
                )}
              >
                {dateRange.to ? (
                  format(dateRange.to, "PPP")
                ) : (
                  <span>Pick an end date</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar
                mode="single"
                selected={dateRange.to}
                onSelect={(date) =>
                  onDateRangeChange((prev) => ({ ...prev, to: date }))
                }
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      </div>
    </div>
  );
}
