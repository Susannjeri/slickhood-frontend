"use client";

import { GoogleMap, Marker, useLoadScript } from "@react-google-maps/api";
import { Loader2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const libraries: "places"[] = ["places"];

export default function PropertyMapDisplay({ apiKey, position }: {
  apiKey: string;
  position: { lat: number; lng: number };
}) {
  const { isLoaded, loadError } = useLoadScript({ googleMapsApiKey: apiKey, libraries });

  if (loadError) {
    return <Alert className="border-amber-300 bg-amber-50"><AlertDescription className="text-amber-900">The map could not be loaded. The saved address and coordinates remain available below.</AlertDescription></Alert>;
  }
  if (!isLoaded) {
    return <div className="flex h-64 items-center justify-center rounded-lg border bg-slate-50"><Loader2 className="size-6 animate-spin text-[#EF4217]" /><span className="ml-3 text-sm text-slate-600">Loading map…</span></div>;
  }

  return <div className="h-64 w-full overflow-hidden rounded-lg border-2 border-[#EF4217]">
    <GoogleMap mapContainerStyle={{ width: "100%", height: "100%" }} center={position} zoom={15} options={{ streetViewControl: false, mapTypeControl: true }}>
      <Marker position={position} />
    </GoogleMap>
  </div>;
}
