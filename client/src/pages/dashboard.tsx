import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Plus, Edit, Key } from "lucide-react";
import { Location, User, Visit, UpdateProfile } from "@shared/schema";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useForm } from "react-hook-form";
import { useState } from "react";
import { apiRequest, queryClient } from "@/lib/queryClient";

// Add CreateEngineerForm component
function CreateEngineerForm({ onSuccess }: { onSuccess: () => void }) {
  const form = useForm({
    defaultValues: { 
      username: "", 
      password: "",
      name: "",
      designation: ""
    }
  });

  const createEngineerMutation = useMutation({
    mutationFn: async (data: { 
      username: string; 
      password: string;
      name: string;
      designation: string;
    }) => {
      const res = await apiRequest("POST", "/api/engineers", {
        ...data,
        isAdmin: false
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/engineers"] });
      form.reset();
      onSuccess();
    }
  });

  return (
    <form onSubmit={form.handleSubmit((data) => createEngineerMutation.mutate(data))} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" {...form.register("username")} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" {...form.register("password")} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Full Name</Label>
        <Input id="name" {...form.register("name")} required />
      </div>
      <div className="space-y-2">
        <Label htmlFor="designation">Designation</Label>
        <Input id="designation" {...form.register("designation")} required />
      </div>
      <Button type="submit" className="w-full" disabled={createEngineerMutation.isPending}>
        {createEngineerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create Engineer Account
      </Button>
    </form>
  );
}

// Add EditProfileForm component
function EditProfileForm({ 
  engineer, 
  onSuccess 
}: { 
  engineer: User; 
  onSuccess: () => void;
}) {
  const form = useForm({
    defaultValues: {
      name: engineer.profile?.name || "",
      designation: engineer.profile?.designation || ""
    }
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: UpdateProfile) => {
      const res = await apiRequest("PATCH", `/api/engineers/${engineer.id}/profile`, data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/engineers"] });
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

// Add ResetPasswordForm component
function ResetPasswordForm({ 
  engineer, 
  onSuccess 
}: { 
  engineer: User; 
  onSuccess: () => void;
}) {
  const form = useForm({
    defaultValues: { newPassword: "" }
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { newPassword: string }) => {
      const res = await apiRequest("POST", `/api/engineers/${engineer.id}/reset-password`, data);
      return res.json();
    },
    onSuccess: () => {
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
        Reset Password
      </Button>
    </form>
  );
}

// Add ViewProfileDialog component
function ViewProfileDialog({ 
  engineer, 
  onClose 
}: { 
  engineer: User; 
  onClose: () => void;
}) {
  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Engineer Profile</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Username</Label>
            <p className="text-sm text-muted-foreground">{engineer.username}</p>
          </div>
          <div className="space-y-2">
            <Label>Full Name</Label>
            <p className="text-sm text-muted-foreground">{engineer.profile?.name || "Not set"}</p>
          </div>
          <div className="space-y-2">
            <Label>Designation</Label>
            <p className="text-sm text-muted-foreground">{engineer.profile?.designation || "Not set"}</p>
          </div>
          {engineer.profile?.lastPasswordReset && (
            <div className="space-y-2">
              <Label>Last Password Reset</Label>
              <p className="text-sm text-muted-foreground">
                {format(new Date(engineer.profile.lastPasswordReset), "PPp")}
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedEngineer, setSelectedEngineer] = useState<User | null>(null);
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false);
  const [isViewProfileOpen, setIsViewProfileOpen] = useState(false);

  const { data: engineers } = useQuery<User[]>({
    queryKey: ["/api/engineers"],
  });

  const { data: visits } = useQuery<Visit[]>({
    queryKey: ["/api/visits"],
  });

  const engineerLocations = useQuery<{ [key: string]: Location[] }>({
    queryKey: ["/api/engineers/locations"],
    queryFn: async () => {
      if (!engineers) return {};
      const locations: { [key: string]: Location[] } = {};
      for (const engineer of engineers) {
        const res = await fetch(`/api/engineers/${engineer.id}/location`);
        if (res.ok) {
          locations[engineer.id] = await res.json();
        }
      }
      return locations;
    },
    enabled: !!engineers,
  });

  return (
    <div className="min-h-screen bg-background p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Admin Dashboard - {user?.username}</CardTitle>
          <div className="flex gap-2">
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Engineer
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Engineer Account</DialogTitle>
                </DialogHeader>
                <CreateEngineerForm onSuccess={() => setIsCreateDialogOpen(false)} />
              </DialogContent>
            </Dialog>
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
          <div className="space-y-6">
            <div className="space-y-2">
              <h3 className="font-semibold">Field Engineers</h3>
              {engineers?.map((engineer) => {
                const locations = engineerLocations.data?.[engineer.id] || [];
                const lastLocation = locations[locations.length - 1];
                const activeVisit = visits?.find(
                  (v) => v.userId === engineer.id && !v.endTime,
                );

                return (
                  <Card key={engineer.id}>
                    <CardContent className="pt-6 space-y-2">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="font-medium">{engineer.profile?.name || engineer.username}</span>
                          {engineer.profile?.designation && (
                            <p className="text-sm text-muted-foreground">{engineer.profile.designation}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => {
                              setSelectedEngineer(engineer);
                              setIsViewProfileOpen(true);
                            }}
                          >
                            View Profile
                          </Button>
                          <Dialog open={isEditProfileOpen && selectedEngineer?.id === engineer.id} 
                                 onOpenChange={(open) => {
                                   setIsEditProfileOpen(open);
                                   if (!open) setSelectedEngineer(null);
                                 }}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedEngineer(engineer)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Edit Engineer Profile</DialogTitle>
                              </DialogHeader>
                              {selectedEngineer && (
                                <EditProfileForm 
                                  engineer={selectedEngineer} 
                                  onSuccess={() => setIsEditProfileOpen(false)} 
                                />
                              )}
                            </DialogContent>
                          </Dialog>

                          <Dialog open={isResetPasswordOpen && selectedEngineer?.id === engineer.id}
                                 onOpenChange={(open) => {
                                   setIsResetPasswordOpen(open);
                                   if (!open) setSelectedEngineer(null);
                                 }}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" onClick={() => setSelectedEngineer(engineer)}>
                                <Key className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Reset Password</DialogTitle>
                              </DialogHeader>
                              {selectedEngineer && (
                                <ResetPasswordForm
                                  engineer={selectedEngineer}
                                  onSuccess={() => setIsResetPasswordOpen(false)}
                                />
                              )}
                            </DialogContent>
                          </Dialog>
                          <span
                            className={`px-2 py-1 rounded text-sm ${
                              activeVisit
                                ? "bg-green-500/10 text-green-500"
                                : "bg-yellow-500/10 text-yellow-500"
                            }`}
                          >
                            {activeVisit ? "On Visit" : "Available"}
                          </span>
                        </div>
                      </div>
                      {lastLocation && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>
                            {lastLocation.latitude}, {lastLocation.longitude}
                          </span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <div className="space-y-2">
              <h3 className="font-semibold">Recent Visits</h3>
              {visits?.map((visit) => {
                const engineer = engineers?.find((e) => e.id === visit.userId);
                return (
                  <Card key={visit.id}>
                    <CardContent className="pt-6 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{engineer?.profile?.name || engineer?.username}</span>
                        <span className="text-sm text-muted-foreground">
                          {format(new Date(visit.startTime), "PPp")}
                        </span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Location: {visit.latitude}, {visit.longitude}
                      </div>
                      {visit.endTime && (
                        <div className="text-sm text-muted-foreground">
                          Duration:{" "}
                          {format(
                            new Date(visit.endTime).getTime() -
                              new Date(visit.startTime).getTime(),
                            "HH:mm:ss",
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </CardContent>
      </Card>
      {selectedEngineer && isViewProfileOpen && (
        <ViewProfileDialog
          engineer={selectedEngineer}
          onClose={() => {
            setIsViewProfileOpen(false);
            setSelectedEngineer(null);
          }}
        />
      )}
      <Dialog open={isEditProfileOpen} onOpenChange={setIsEditProfileOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Engineer Profile</DialogTitle>
          </DialogHeader>
          {selectedEngineer && (
            <EditProfileForm 
              engineer={selectedEngineer} 
              onSuccess={() => setIsEditProfileOpen(false)} 
            />
          )}
        </DialogContent>
      </Dialog>
      <Dialog open={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset Password</DialogTitle>
          </DialogHeader>
          {selectedEngineer && (
            <ResetPasswordForm
              engineer={selectedEngineer}
              onSuccess={() => setIsResetPasswordOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}