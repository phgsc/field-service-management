import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Plus } from "lucide-react";
import { Location, User, Visit } from "@shared/schema";
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
    defaultValues: { username: "", password: "" }
  });

  const createEngineerMutation = useMutation({
    mutationFn: async (data: { username: string; password: string }) => {
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
      <Button type="submit" className="w-full" disabled={createEngineerMutation.isPending}>
        {createEngineerMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Create Engineer Account
      </Button>
    </form>
  );
}

export default function Dashboard() {
  const { user, logoutMutation } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

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
        const res = await fetch(`/api/engineers/${engineer._id}/location`);
        if (res.ok) {
          locations[engineer._id] = await res.json();
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
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
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
                <CreateEngineerForm onSuccess={() => setIsDialogOpen(false)} />
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
                const locations = engineerLocations.data?.[engineer._id] || [];
                const lastLocation = locations[locations.length - 1];
                const activeVisit = visits?.find(
                  (v) => v.userId === engineer._id && !v.endTime,
                );

                return (
                  <Card key={engineer._id}>
                    <CardContent className="pt-6 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{engineer.username}</span>
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
                const engineer = engineers?.find((e) => e._id === visit.userId);
                return (
                  <Card key={visit.id}>
                    <CardContent className="pt-6 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{engineer?.username}</span>
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
    </div>
  );
}