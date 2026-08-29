"use client";

import { useEffect, useRef } from "react";

type Coordinates = { lat: number; lng: number };

interface PlaceAutocompleteInputProps {
  isLoaded: boolean;
  onCoordinatesSelected: (coordinates: Coordinates) => void;
  placeholder?: string;
}

type PlaceSelectionEvent = Event & {
  placePrediction?: {
    toPlace: () => {
      fetchFields: (options: { fields: string[] }) => Promise<void>;
      location?: google.maps.LatLng | null;
    };
  };
};

export default function PlaceAutocompleteInput({
  isLoaded,
  onCoordinatesSelected,
  placeholder = "Search for a location...",
}: PlaceAutocompleteInputProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const onCoordinatesSelectedRef = useRef(onCoordinatesSelected);

  useEffect(() => {
    onCoordinatesSelectedRef.current = onCoordinatesSelected;
  }, [onCoordinatesSelected]);

  useEffect(() => {
    if (!isLoaded || !containerRef.current) return;

    let disposed = false;
    let autocompleteElement: (HTMLElement & { placeholder?: string }) | null = null;

    const initialise = async () => {
      const placesLibrary = (await google.maps.importLibrary("places")) as unknown as {
        PlaceAutocompleteElement: new (options?: Record<string, unknown>) => HTMLElement & {
          placeholder?: string;
        };
      };

      if (disposed || !containerRef.current) return;

      autocompleteElement = new placesLibrary.PlaceAutocompleteElement();
      autocompleteElement.placeholder = placeholder;
      autocompleteElement.style.display = "block";
      autocompleteElement.style.width = "100%";

      const handleSelection = async (event: Event) => {
        const prediction = (event as PlaceSelectionEvent).placePrediction;
        if (!prediction) return;

        const place = prediction.toPlace();
        await place.fetchFields({ fields: ["location"] });

        const location = place.location;
        if (!location) return;

        onCoordinatesSelectedRef.current({
          lat: location.lat(),
          lng: location.lng(),
        });
      };

      autocompleteElement.addEventListener("gmp-select", handleSelection);
      containerRef.current.replaceChildren(autocompleteElement);
    };

    void initialise();

    return () => {
      disposed = true;
      autocompleteElement?.remove();
    };
  }, [isLoaded, placeholder]);

  return (
    <div
      ref={containerRef}
      className="min-h-11 w-full rounded-md border border-input bg-background"
      aria-label="Search for a property location"
    />
  );
}
