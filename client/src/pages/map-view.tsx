import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Location, User } from "@shared/schema";
import { format } from "date-fns";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from 'leaflet';
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function MapView() {
  const { engineerId } = useParams();
  const [mapRef, setMapRef] = useState<L.Map | null>(null);

  // Query for engineer details
  const { data: engineer } = useQuery<User>({
    queryKey: [`/api/engineers/${engineerId}`],
  });

  // Query for locations with polling
  const { data: locations, isLoading } = useQuery<Location[]>({
    queryKey: [`/api/engineers/${engineerId}/location`],
    refetchInterval: 10000, // Poll every 10 seconds
  });

  const lastLocation = locations?.[locations.length - 1];

  // Center map on last known position
  useEffect(() => {
    if (mapRef && lastLocation) {
      const center: [number, number] = [
        parseFloat(lastLocation.latitude),
        parseFloat(lastLocation.longitude)
      ];
      mapRef.setView(center, mapRef.getZoom());
    }
  }, [mapRef, lastLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Set initial center - use last known location or default to London
  const center = lastLocation 
    ? [parseFloat(lastLocation.latitude), parseFloat(lastLocation.longitude)]
    : [51.5074, -0.1278]; // Default to London if no location

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
                ref={setMapRef}
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />
                {locations?.map((loc) => {
                  const position: [number, number] = [
                    parseFloat(loc.latitude),
                    parseFloat(loc.longitude)
                  ];
                  const isLatest = loc.id === lastLocation?.id;

                  return (
                    <Marker
                      key={loc.id}
                      position={position}
                      icon={isLatest ? new L.Icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
                        shadowSize: [41, 41]
                      }) : undefined}
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
                          {isLatest && (
                            <p className="text-sm font-semibold text-blue-600">
                              Current Location
                            </p>
                          )}
                        </div>
                      </Popup>
                    </Marker>
                  );
                })}
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