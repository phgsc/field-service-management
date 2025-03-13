import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Location } from "@shared/schema";
import { format } from "date-fns";

export default function MapView() {
  const { engineerId } = useParams();
  
  const { data: locations } = useQuery<Location[]>({
    queryKey: [`/api/engineers/${engineerId}/location`],
  });

  const { data: engineer } = useQuery({
    queryKey: [`/api/engineers/${engineerId}`],
  });

  const lastLocation = locations?.[locations.length - 1];

  return (
    <div className="min-h-screen bg-background p-4">
      <Card>
        <CardHeader>
          <CardTitle>
            Engineer Location - {engineer?.profile?.name || engineer?.username}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {lastLocation && (
              <div>
                <h3 className="font-semibold mb-2">Last Known Location</h3>
                <p>
                  Coordinates: {lastLocation.latitude}, {lastLocation.longitude}
                </p>
                <p>
                  Time: {format(new Date(lastLocation.timestamp), "PPpp")}
                </p>
              </div>
            )}
            
            <div>
              <h3 className="font-semibold mb-2">Location History</h3>
              <div className="space-y-2">
                {locations?.map((loc) => (
                  <div
                    key={loc.id}
                    className="p-2 rounded border text-sm space-y-1"
                  >
                    <p>
                      Coordinates: {loc.latitude}, {loc.longitude}
                    </p>
                    <p className="text-muted-foreground">
                      {format(new Date(loc.timestamp), "PPpp")}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
