"use client";

import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import { Loader2 } from "lucide-react";
import PlaceAutocompleteInput from "@/components/maps/PlaceAutocompleteInput";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";

const libraries: "places"[] = ["places"];
type Coordinates = { lat: number; lng: number };

export default function PropertyLocationPicker({
  apiKey,
  center,
  marker,
  onCoordinatesSelected,
}: {
  apiKey: string;
  center: Coordinates;
  marker: Coordinates | null;
  onCoordinatesSelected: (coordinates: Coordinates) => void;
}) {
  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: apiKey, libraries });

  if (loadError) {
    return (
      <Alert className="border-amber-300 bg-amber-50">
        <AlertDescription className="text-amber-900">
          Map search is temporarily unavailable. Enter coordinates manually or use your current location.
        </AlertDescription>
      </Alert>
    );
  }
  if (!isLoaded) {
    return <div className="flex h-48 items-center justify-center rounded-lg border bg-slate-50"><Loader2 className="size-6 animate-spin text-[#EF4217]"/><span className="ml-3 text-sm text-slate-600">Loading map…</span></div>;
  }

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label>Search location</Label>
        <PlaceAutocompleteInput isLoaded={isLoaded} onCoordinatesSelected={onCoordinatesSelected} />
      </div>
      <div className="h-64 w-full overflow-hidden rounded-lg border">
        <GoogleMap
          mapContainerStyle={{ width: "100%", height: "100%" }}
          center={center}
          zoom={marker ? 15 : 10}
          onClick={event => {
            const lat = event.latLng?.lat();
            const lng = event.latLng?.lng();
            if (lat !== undefined && lng !== undefined) onCoordinatesSelected({ lat, lng });
          }}
          options={{ streetViewControl: false, mapTypeControl: false, fullscreenControl: false }}
        >
          {marker && <Marker position={marker} />}
        </GoogleMap>
      </div>
    </div>
  );
}
