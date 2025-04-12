import { PerformanceDashboard } from "@/components/performance-dashboard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Visit, ServiceStatus, type Achievement, type Points } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Loader2, MapPin, Play, Square, UserCircle,
  Timer, AlertTriangle, CheckCircle, PauseCircle, Key, Truck, Ban, Calendar as CalendarIcon
} from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

// Profile Edit Form Component
function ProfileEditForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const form = useForm({
    defaultValues: {
      name: user?.profile?.name || "",
      designation: user?.profile?.designation || ""
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfile) => {
      const res = await apiRequest("PATCH", `/api/engineers/${user?.id}/profile`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user"] });
      toast({ title: "Profile updated successfully" });
      onSuccess();
    }
  });

  return (
    <form onSubmit={form.handleSubmit((data) => updateProfileMutation.mutate(data))} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" {...form.register("name")} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="designation">Designation</Label>
        <Input id="designation" {...form.register("designation")} required />
      </div>
      <Button type="submit" className="w-full" disabled={updateProfileMutation.isPending}>
        {updateProfileMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Update Profile
      </Button>
    </form>
  );
}

// Password Change Form Component
function PasswordChangeForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const form = useForm({
    defaultValues: { newPassword: "" }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { newPassword: string }) => {
      const res = await apiRequest("POST", `/api/engineers/${user?.id}/reset-password`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Password updated successfully" });
      form.reset();
      onSuccess();
    }
  });

  return (
    <form onSubmit={form.handleSubmit((data) => resetPasswordMutation.mutate(data))} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="newPassword">New Password</Label>
        <Input id="newPassword" type="password" {...form.register("newPassword")} required />
      </div>
      <Button type="submit" className="w-full" disabled={resetPasswordMutation.isPending}>
        {resetPasswordMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Change Password
      </Button>
    </form>
  );
}

export default function EngineerView() {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useState<GeolocationPosition>();
  const [jobId, setJobId] = useState<string>("");
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const { toast } = useToast();

  // First query system settings
  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ["/api/settings"]
  });

  // Only query gamification data if it's enabled
  const { data: achievements } = useQuery<Achievement[]>({
    queryKey: [`/api/achievements`, user?.id],
    enabled: !!user?.id && !!settings?.gamificationEnabled
  });

  const { data: points } = useQuery<Points[]>({
    queryKey: [`/api/points`, user?.id],
    enabled: !!user?.id && !!settings?.gamificationEnabled
  });

  const { data: weeklyStats } = useQuery({
    queryKey: [`/api/engineers/${user?.id}/weekly-stats`],
    enabled: !!user?.id && !!settings?.gamificationEnabled
  });

  const { data: visits } = useQuery<Visit[]>({
    queryKey: [`/api/visits`, user?.id],
    enabled: !!user?.id
  });

  // Location tracking interval
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      toast({
        title: "GPS not available",
        description: "Location tracking requires GPS access",
        variant: "destructive"
      });
      return;
    }

    const trackLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLocation(pos);
          locationMutation.mutate(pos);
        },
        (error) => {
          console.error("Error getting location:", error);
          toast({
            title: "Location error",
            description: "Failed to get current location",
            variant: "destructive"
          });
        },
        { enableHighAccuracy: true }
      );
    };

    // Track location every 5 minutes
    const intervalId = setInterval(trackLocation, 5 * 60 * 1000);
    trackLocation(); // Initial tracking

    return () => clearInterval(intervalId);
  }, []);

  const locationMutation = useMutation({
    mutationFn: async (pos: GeolocationPosition) => {
      await apiRequest("POST", "/api/location", {
        latitude: pos.coords.latitude.toString(),
        longitude: pos.coords.longitude.toString(),
      });
    },
  });

  // Resume visit mutation
  const resumeVisitMutation = useMutation({
    mutationFn: async ({ visitId, resumeType }: { visitId: string; resumeType: 'journey' | 'service' }) => {
      const res = await apiRequest("POST", `/api/visits/${visitId}/resume`, { resumeType });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", user?.id] }); //Invalidate with user ID
      setIsResumeDialogOpen(false);
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

  // Unblock visit mutation
  const unblockVisitMutation = useMutation({
    mutationFn: async (visitId: string) => {
      const res = await apiRequest("POST", `/api/visits/${visitId}/unblock`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", user?.id] }); //Invalidate with user ID
      toast({ title: "Visit unblocked successfully" });
    },
  });

  const startJourneyMutation = useMutation({
    mutationFn: async () => {
      if (!jobId) throw new Error("Job ID is required");
      
      const payload: any = { jobId };
      
      // Add location data if available
      if (location) {
        payload.latitude = location.coords.latitude.toString();
        payload.longitude = location.coords.longitude.toString();
      }
      
      const res = await apiRequest("POST", "/api/visits/start-journey", payload);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", user?.id] }); //Invalidate with user ID
      toast({ title: "Journey started" });
    },
  });

  const startServiceMutation = useMutation({
    mutationFn: async (visitId: string) => {
      const res = await apiRequest("POST", `/api/visits/${visitId}/start-service`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", user?.id] }); //Invalidate with user ID
      toast({ title: "Service started successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to start service",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  const completeServiceMutation = useMutation({
    mutationFn: async (visitId: string) => {
      const res = await apiRequest("POST", `/api/visits/${visitId}/complete`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", user?.id] }); //Invalidate with user ID
      toast({ title: "Service completed" });
    },
  });

  const pauseServiceMutation = useMutation({
    mutationFn: async ({ visitId, reason }: { visitId: string; reason: "next_day" | "blocked" }) => {
      const res = await apiRequest("POST", `/api/visits/${visitId}/pause`, { reason });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", user?.id] }); //Invalidate with user ID
      toast({ title: "Service paused" });
    },
  });
  
  // Add join job mutation
  const joinJobMutation = useMutation({
    mutationFn: async (visitId: string) => {
      const payload: any = {};
      
      // Add location data if available
      if (location) {
        payload.latitude = location.coords.latitude.toString();
        payload.longitude = location.coords.longitude.toString();
      }
      
      const res = await apiRequest("POST", `/api/visits/${visitId}/join`, payload);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits", user?.id] });
      setIsJoinJobDialogOpen(false);
      toast({ title: "Successfully joined the job" });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to join job",
        description: error.message,
        variant: "destructive"
      });
    }
  });

  // Helper function to get status-based style
  const getStatusStyle = (status: string) => {
    switch (status) {
      case ServiceStatus.COMPLETED:
        return "bg-green-500/10 text-green-500";
      case ServiceStatus.ON_ROUTE:
        return "bg-blue-500/10 text-blue-500";
      case ServiceStatus.IN_SERVICE:
        return "bg-yellow-500/10 text-yellow-500";
      case ServiceStatus.PAUSED_NEXT_DAY:
        return "bg-yellow-500/10 text-yellow-500";
      case ServiceStatus.BLOCKED:
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  // Update the active visit check to handle multiple jobs properly
  const activeVisit = visits?.find(v =>
    [ServiceStatus.ON_ROUTE, ServiceStatus.IN_SERVICE].includes(v.status as keyof typeof ServiceStatus) &&
    v.userId === user?.id
  );

  // Check if engineer has any active visits before allowing new ones
  const hasActiveVisit = visits?.some(v =>
    [ServiceStatus.ON_ROUTE, ServiceStatus.IN_SERVICE].includes(v.status as keyof typeof ServiceStatus) &&
    v.userId === user?.id
  );
  
  // Get all active jobs that the engineer can join
  const activeJobs = visits?.filter(v => 
    [ServiceStatus.ON_ROUTE, ServiceStatus.IN_SERVICE].includes(v.status as keyof typeof ServiceStatus) &&
    v.userId !== user?.id &&
    !(v.collaborators?.includes(user?.id || ''))
  ) || [];

  const [selectedVisit, setSelectedVisit] = useState<Visit | null>(null);
  const [isResumeDialogOpen, setIsResumeDialogOpen] = useState(false);
  const [isJoinJobDialogOpen, setIsJoinJobDialogOpen] = useState(false);

  // Add Join Job Dialog
  const renderJoinJobDialog = () => {
    return (
      <Dialog open={isJoinJobDialogOpen} onOpenChange={setIsJoinJobDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Join Existing Job</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Select an active job to join as a collaborator
            </p>
            {activeJobs.length === 0 ? (
              <p>No active jobs available to join.</p>
            ) : (
              <div className="space-y-4">
                {activeJobs.map(job => {
                  // Find the engineer who owns this job
                  const engineer = job.userId;
                  
                  return (
                    <Card key={job.id} className="p-4">
                      <div className="flex flex-col space-y-2">
                        <div className="flex justify-between">
                          <span className="font-medium">Job ID: {job.jobId}</span>
                          <div className={`px-2 py-0.5 rounded text-xs ${getStatusStyle(job.status)}`}>
                            {job.status}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Engineer ID: {engineer}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Location: {job.latitude}, {job.longitude}
                        </div>
                        <Button 
                          className="w-full mt-2"
                          onClick={() => joinJobMutation.mutate(job.id)}
                          disabled={joinJobMutation.isPending}
                        >
                          {joinJobMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Truck className="mr-2 h-4 w-4" />
                          )}
                          Join This Job
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="space-y-4">
        {/* Join Job Dialog */}
        {renderJoinJobDialog()}
        
        {/* Performance Dashboard */}
        {settings?.gamificationEnabled && (
          <PerformanceDashboard
            user={user!}
            achievements={achievements || []}
            points={points || []}
            weeklyStats={weeklyStats || null}
          />
        )}

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Engineer View</CardTitle>
            <div className="flex items-center gap-2">
              <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <UserCircle className="mr-2 h-4 w-4" />
                    {user?.profile?.name || user?.username}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                  </DialogHeader>
                  <ProfileEditForm onSuccess={() => setIsEditProfileOpen(false)} />
                </DialogContent>
              </Dialog>

              <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Key className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Change Password</DialogTitle>
                  </DialogHeader>
                  <PasswordChangeForm onSuccess={() => setIsChangePasswordOpen(false)} />
                </DialogContent>
              </Dialog>

              <Link href="/engineer-calendar">
                <Button variant="outline" className="cursor-pointer">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  My Schedule
                </Button>
              </Link>

              <Button
                variant="destructive"
                onClick={() => logoutMutation.mutate()}
                disabled={logoutMutation.isPending}
              >
                {logoutMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Logout
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <MapPin className="h-4 w-4" />
                <span>
                  {location
                    ? `${location.coords.latitude.toFixed(
                      6,
                    )}, ${location.coords.longitude.toFixed(6)}`
                    : "Getting location..."}
                </span>
              </div>

              {!hasActiveVisit ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobId">Job ID</Label>
                    <Input
                      id="jobId"
                      value={jobId}
                      onChange={(e) => setJobId(e.target.value)}
                      placeholder="Enter Job ID"
                      required
                    />
                  </div>
                  <Button
                    className="w-full"
                    onClick={() => startJourneyMutation.mutate()}
                    disabled={startJourneyMutation.isPending || !jobId}
                  >
                    {startJourneyMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="mr-2 h-4 w-4" />
                    )}
                    Start Journey
                  </Button>
                  
                  {activeJobs.length > 0 && (
                    <Button
                      className="w-full mt-2"
                      variant="secondary"
                      onClick={() => setIsJoinJobDialogOpen(true)}
                    >
                      <Truck className="mr-2 h-4 w-4" />
                      Join Existing Job ({activeJobs.length} available)
                    </Button>
                  )}
                </div>
              ) : activeVisit ? (
                <Card className="bg-accent/50">
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-medium">Job ID: {activeVisit.jobId}</span>
                        <div className={`text-sm ${getStatusStyle(activeVisit.status)}`}>
                          Status: {activeVisit.status}
                        </div>
                      </div>
                      <Timer className="h-5 w-5 text-primary" />
                    </div>

                    {activeVisit.status === ServiceStatus.ON_ROUTE && (
                      <Button
                        className="w-full"
                        onClick={() => startServiceMutation.mutate(activeVisit.id)}
                        disabled={startServiceMutation.isPending}
                      >
                        {startServiceMutation.isPending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="mr-2 h-4 w-4" />
                        )}
                        Start Service
                      </Button>
                    )}

                    {activeVisit.status === ServiceStatus.IN_SERVICE && (
                      <div className="space-y-2">
                        <Button
                          className="w-full"
                          variant="default"
                          onClick={() => completeServiceMutation.mutate(activeVisit.id)}
                          disabled={completeServiceMutation.isPending}
                        >
                          {completeServiceMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle className="mr-2 h-4 w-4" />
                          )}
                          Complete Service
                        </Button>

                        <Button
                          className="w-full"
                          variant="secondary"
                          onClick={() =>
                            pauseServiceMutation.mutate({
                              visitId: activeVisit.id,
                              reason: "next_day"
                            })
                          }
                          disabled={pauseServiceMutation.isPending}
                        >
                          {pauseServiceMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <PauseCircle className="mr-2 h-4 w-4" />
                          )}
                          Pause Until Tomorrow
                        </Button>

                        <Button
                          className="w-full"
                          variant="destructive"
                          onClick={() =>
                            pauseServiceMutation.mutate({
                              visitId: activeVisit.id,
                              reason: "blocked"
                            })
                          }
                          disabled={pauseServiceMutation.isPending}
                        >
                          {pauseServiceMutation.isPending ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <AlertTriangle className="mr-2 h-4 w-4" />
                          )}
                          Mark as Blocked
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : null}

              <div className="space-y-2">
                <h3 className="font-semibold">Recent Visits</h3>
                {visits?.filter(visit => visit.userId === user?.id)
                  .map((visit) => (
                    <div
                      key={visit.id}
                      className="rounded border p-2 text-sm space-y-1"
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">Job ID: {visit.jobId}</span>
                        <div className={`px-2 py-0.5 rounded text-xs ${getStatusStyle(visit.status)}`}>
                          {visit.status}
                        </div>
                      </div>

                      <div>Start: {format(new Date(visit.startTime), "PPp")}</div>
                      {visit.endTime && (
                        <div>End: {format(new Date(visit.endTime), "PPp")}</div>
                      )}

                      {visit.totalJourneyTime && (
                        <div className="text-muted-foreground">
                          Journey Time: {Math.round(visit.totalJourneyTime)} minutes
                        </div>
                      )}

                      {visit.totalServiceTime && (
                        <div className="text-muted-foreground">
                          Service Time: {Math.round(visit.totalServiceTime)} minutes
                        </div>
                      )}

                      <div className="text-muted-foreground">
                        Location: {visit.latitude}, {visit.longitude}
                      </div>

                      {(visit.status === ServiceStatus.PAUSED_NEXT_DAY || visit.status === ServiceStatus.BLOCKED) && (
                        <div className="flex gap-2 mt-2">
                          {visit.status === ServiceStatus.PAUSED_NEXT_DAY && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedVisit(visit);
                                setIsResumeDialogOpen(true);
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
                      )}

                      {visit.status === ServiceStatus.BLOCKED && visit.blockedSince && (
                        <div className="text-red-500">
                          Blocked for: {
                            Math.ceil(
                              (new Date().getTime() - new Date(visit.blockedSince).getTime()) /
                              (1000 * 60 * 60 * 24)
                            )
                          } days
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

interface UpdateProfile {
  name: string;
  designation: string;
}