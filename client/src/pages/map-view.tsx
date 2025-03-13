import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Location } from "@shared/schema";
import { format } from "date-fns";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from 'leaflet';
import { useEffect } from "react";

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function MapView() {
  const { engineerId } = useParams();

  const { data: locations } = useQuery<Location[]>({
    queryKey: [`/api/engineers/${engineerId}/location`],
  });

  const { data: engineer } = useQuery({
    queryKey: [`/api/engineers/${engineerId}`],
  });

  const lastLocation = locations?.[locations.length - 1];
  const center = lastLocation 
    ? [parseFloat(lastLocation.latitude), parseFloat(lastLocation.longitude)]
    : [0, 0];

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
            <div style={{ height: "400px", width: "100%" }}>
              <MapContainer
                center={center as [number, number]}
                zoom={13}
                style={{ height: "100%", width: "100%" }}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {locations?.map((loc) => (
                  <Marker
                    key={loc.id}
                    position={[parseFloat(loc.latitude), parseFloat(loc.longitude)]}
                  >
                    <Popup>
                      <div className="p-2">
                        <p className="font-semibold">Location Details</p>
                        <p className="text-sm text-muted-foreground">
                          Time: {format(new Date(loc.timestamp), "PPpp")}
                        </p>
                        <p className="text-sm">
                          Coordinates: {loc.latitude}, {loc.longitude}
                        </p>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>

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