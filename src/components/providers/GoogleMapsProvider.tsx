// src/components/providers/GoogleMapsProvider.tsx
"use client";

import { LoadScript } from "@react-google-maps/api";
import { ReactNode } from "react";

const libraries: ("places" | "drawing" | "geometry" | "localContext" | "visualization")[] = ["places"];

interface GoogleMapsProviderProps {
  children: ReactNode;
}

export default function GoogleMapsProvider({ children }: GoogleMapsProviderProps) {
  return (
    <LoadScript
      googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!}
      libraries={['places']}
      loadingElement={<div>Loading Maps...</div>}
    >
      {children}
    </LoadScript>
  );
}