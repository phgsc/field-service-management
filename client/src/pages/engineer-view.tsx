import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Visit } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Loader2, MapPin, Play, Square } from "lucide-react";
import { useEffect, useState } from "react";
import { format } from "date-fns";

export default function EngineerView() {
  const { user, logoutMutation } = useAuth();
  const [location, setLocation] = useState<GeolocationPosition>();
  const [watchId, setWatchId] = useState<number>();

  const { data: visits } = useQuery<Visit[]>({
    queryKey: ["/api/visits"],
  });

  const locationMutation = useMutation({
    mutationFn: async (pos: GeolocationPosition) => {
      await apiRequest("POST", "/api/location", {
        latitude: pos.coords.latitude.toString(),
        longitude: pos.coords.longitude.toString(),
      });
    },
  });

  const startVisitMutation = useMutation({
    mutationFn: async () => {
      if (!location) throw new Error("Location not available");
      const res = await apiRequest("POST", "/api/visits/start", {
        latitude: location.coords.latitude.toString(),
        longitude: location.coords.longitude.toString(),
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
    },
  });

  const endVisitMutation = useMutation({
    mutationFn: async (visitId: number) => {
      const res = await apiRequest("POST", `/api/visits/${visitId}/end`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/visits"] });
    },
  });

  useEffect(() => {
    if (!("geolocation" in navigator)) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        setLocation(pos);
        locationMutation.mutate(pos);
      },
      (error) => console.error("Error getting location:", error),
      { enableHighAccuracy: true },
    );

    setWatchId(id);
    return () => {
      navigator.geolocation.clearWatch(id);
    };
  }, []);

  const activeVisit = visits?.find((v) => !v.endTime);

  return (
    <div className="min-h-screen bg-background p-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Engineer View - {user?.username}</CardTitle>
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

            {activeVisit ? (
              <Button
                className="w-full"
                variant="destructive"
                onClick={() => endVisitMutation.mutate(activeVisit.id)}
                disabled={endVisitMutation.isPending}
              >
                {endVisitMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Square className="mr-2 h-4 w-4" />
                )}
                End Visit
              </Button>
            ) : (
              <Button
                className="w-full"
                onClick={() => startVisitMutation.mutate()}
                disabled={startVisitMutation.isPending || !location}
              >
                {startVisitMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Play className="mr-2 h-4 w-4" />
                )}
                Start Visit
              </Button>
            )}

            <div className="space-y-2">
              <h3 className="font-semibold">Recent Visits</h3>
              {visits?.map((visit) => (
                <div
                  key={visit.id}
                  className="rounded border p-2 text-sm space-y-1"
                >
                  <div>Start: {format(new Date(visit.startTime), "PPp")}</div>
                  {visit.endTime && (
                    <div>End: {format(new Date(visit.endTime), "PPp")}</div>
                  )}
                  <div className="text-muted-foreground">
                    Location: {visit.latitude}, {visit.longitude}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
