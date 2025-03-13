import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { cn } from "@/lib/utils";
import { format, subMonths } from "date-fns";
import { Calendar as CalendarIcon, MapPin, Play, Truck, Ban } from "lucide-react";
import { useState } from "react";
import { Visit, ServiceStatus, User } from "@shared/schema";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

type JobsTableProps = {
  visits: Visit[];
  engineers: User[];
};

export function JobsTable({ visits, engineers }: JobsTableProps) {
  const [date, setDate] = useState<Date>(subMonths(new Date(), 1));
  const { toast } = useToast();
  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedEngineerId, setSelectedEngineerId] = useState<string>("");
  const { user: currentUser } = useAuth();

  // Resume visit mutation with engineer reassignment for admin
  const resumeVisitMutation = useMutation({
    mutationFn: async ({ visitId, resumeType, newEngineerId }: { visitId: string; resumeType: 'journey' | 'service'; newEngineerId?: string }) => {
      const res = await apiRequest("POST", `/api/visits/${visitId}/resume`, { 
        resumeType,
        newEngineerId // This will be undefined for engineer users
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      setIsDialogOpen(false);
      setSelectedEngineerId("");
      toast({ title: "Visit resumed successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to resume visit",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Unblock visit mutation with engineer reassignment for admin
  const unblockVisitMutation = useMutation({
    mutationFn: async ({ visitId, newEngineerId }: { visitId: string; newEngineerId?: string }) => {
      const res = await apiRequest("POST", `/api/visits/${visitId}/unblock`, {
        newEngineerId // This will be undefined for engineer users
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
      setSelectedEngineerId("");
      toast({ title: "Visit unblocked successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to unblock visit",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Filter visits based on selected date
  const filteredVisits = visits.filter(
    (visit) => new Date(visit.startTime) >= date
  );

  // Helper function to get status-based style
  const getStatusStyle = (status: string) => {
    switch (status) {
      case ServiceStatus.COMPLETED:
        return "bg-green-100 text-green-800";
      case ServiceStatus.ON_ROUTE:
      case ServiceStatus.IN_SERVICE:
        return "bg-yellow-100 text-yellow-800";
      case ServiceStatus.PAUSED_NEXT_DAY:
        return "bg-pink-100 text-pink-800";
      case ServiceStatus.BLOCKED:
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  // Sort engineers with current engineer at top
  const getSortedEngineers = (currentEngineerId: string) => {
    return engineers.sort((a, b) => {
      if (a.id === currentEngineerId) return -1;
      if (b.id === currentEngineerId) return 1;
      return (a.profile?.name || a.username).localeCompare(b.profile?.name || b.username);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Jobs Overview</h2>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : <span>Pick a date</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={(newDate) => newDate && setDate(newDate)}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedVisit?.status === ServiceStatus.BLOCKED ? "Unblock Visit" : "Resume Visit"}
            </DialogTitle>
          </DialogHeader>
          {currentUser?.isAdmin ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Assign Engineer</label>
                <Select
                  value={selectedEngineerId}
                  onValueChange={setSelectedEngineerId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an engineer" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedVisit && getSortedEngineers(selectedVisit.userId).map((engineer) => (
                      <SelectItem key={engineer.id} value={engineer.id}>
                        {engineer.profile?.name || engineer.username}
                        {engineer.id === selectedVisit.userId && " (Current)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {selectedVisit?.status === ServiceStatus.BLOCKED ? (
                <Button
                  className="w-full"
                  onClick={() => unblockVisitMutation.mutate({
                    visitId: selectedVisit.id,
                    newEngineerId: selectedEngineerId || undefined
                  })}
                  disabled={unblockVisitMutation.isPending}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Unblock Visit
                </Button>
              ) : (
                <div className="flex gap-4 justify-center">
                  <Button
                    onClick={() => {
                      if (selectedVisit) {
                        resumeVisitMutation.mutate({
                          visitId: selectedVisit.id,
                          resumeType: 'journey',
                          newEngineerId: selectedEngineerId || undefined
                        });
                      }
                    }}
                    disabled={resumeVisitMutation.isPending}
                  >
                    <Truck className="mr-2 h-4 w-4" />
                    Resume Journey
                  </Button>
                  <Button
                    onClick={() => {
                      if (selectedVisit) {
                        resumeVisitMutation.mutate({
                          visitId: selectedVisit.id,
                          resumeType: 'service',
                          newEngineerId: selectedEngineerId || undefined
                        });
                      }
                    }}
                    disabled={resumeVisitMutation.isPending}
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Resume Service
                  </Button>
                </div>
              )}
            </div>
          ) : (
            // Engineer view - simple resume/unblock without engineer selection
            <div className="flex gap-4 justify-center">
              {selectedVisit?.status === ServiceStatus.BLOCKED ? (
                <Button
                  onClick={() => unblockVisitMutation.mutate({
                    visitId: selectedVisit.id
                  })}
                  disabled={unblockVisitMutation.isPending}
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Unblock Visit
                </Button>
              ) : (
                <Button
                  onClick={() => {
                    if (selectedVisit) {
                      resumeVisitMutation.mutate({
                        visitId: selectedVisit.id,
                        resumeType: 'journey'
                      });
                    }
                  }}
                  disabled={resumeVisitMutation.isPending}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Resume Journey
                </Button>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="rounded-md border">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Job ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Engineer
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Journey Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Service Time
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredVisits.map((visit) => {
              const engineer = engineers.find((e) => e.id === visit.userId);
              return (
                <tr key={visit.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {visit.jobId}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {engineer?.profile?.name || engineer?.username}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusStyle(
                        visit.status
                      )}`}
                    >
                      {visit.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {visit.totalJourneyTime
                      ? `${visit.totalJourneyTime} minutes`
                      : getElapsedTime(visit.journeyStartTime, visit.journeyEndTime)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {visit.totalServiceTime
                      ? `${visit.totalServiceTime} minutes`
                      : getElapsedTime(visit.serviceStartTime, visit.serviceEndTime)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/map/${visit.userId}`}
                        className="text-blue-600 hover:text-blue-900 inline-flex items-center"
                      >
                        <MapPin className="h-4 w-4 mr-1" />
                        Track
                      </Link>
                      {visit.status === ServiceStatus.PAUSED_NEXT_DAY && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedVisit(visit);
                            setIsDialogOpen(true);
                          }}
                        >
                          <Play className="h-4 w-4 mr-1" />
                          Resume
                        </Button>
                      )}
                      {visit.status === ServiceStatus.BLOCKED && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => unblockVisitMutation.mutate(visit.id)}
                          disabled={unblockVisitMutation.isPending}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Unblock
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}