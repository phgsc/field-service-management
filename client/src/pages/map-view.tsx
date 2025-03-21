import { useQuery } from "@tanstack/react-query";
import { useParams } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Location, User } from "@shared/schema";
import { format } from "date-fns";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
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

// Add RecenterAutomatically component to handle map updates
function RecenterAutomatically({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], 13); // Set zoom level to 13 for better initial view
  }, [lat, lng]);
  return null;
}

// Create a MapComponent to handle dynamic initialization
function MapComponent({ locations }: { locations: Location[] }) {
  const lastLocation = locations[locations.length - 1];
  const position: [number, number] = [
    parseFloat(lastLocation.latitude),
    parseFloat(lastLocation.longitude)
  ];

  return (
    <MapContainer
      center={position}
      zoom={13}
      style={{ height: "100%", width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      <RecenterAutomatically lat={position[0]} lng={position[1]} />
      {locations.map((loc) => {
        const markerPos: [number, number] = [
          parseFloat(loc.latitude),
          parseFloat(loc.longitude)
        ];
        const isLatest = loc.id === lastLocation.id;

        return (
          <Marker
            key={loc.id}
            position={markerPos}
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
  );
}

export default function MapView() {
  const { engineerId } = useParams();

  // Query for engineer details
  const { data: engineer } = useQuery<User>({
    queryKey: [`/api/engineers/${engineerId}`],
  });

  // Query for locations with polling
  const { data: locations, isLoading } = useQuery<Location[]>({
    queryKey: [`/api/engineers/${engineerId}/location`],
    refetchInterval: 10000, // Poll every 10 seconds
  });

  if (isLoading || !locations?.length) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

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
              <MapComponent locations={locations} />
            </div>

            {locations[locations.length - 1] && (
              <div>
                <h3 className="font-semibold mb-2">Last Known Location</h3>
                <p>
                  Coordinates: {locations[locations.length - 1].latitude}, {locations[locations.length - 1].longitude}
                </p>
                <p>
                  Time: {format(new Date(locations[locations.length - 1].timestamp), "PPpp")}
                </p>
              </div>
            )}

            <div>
              <h3 className="font-semibold mb-2">Location History</h3>
              <div className="space-y-2">
                {locations.map((loc) => (
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