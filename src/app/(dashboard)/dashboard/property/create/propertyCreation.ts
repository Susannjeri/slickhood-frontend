import { z } from "zod";

export const PROPERTY_IMAGE_MAX_BYTES = 10 * 1024 * 1024;
export const PROPERTY_IMAGE_MIN_WIDTH = 300;
export const PROPERTY_IMAGE_MIN_HEIGHT = 200;
export const PROPERTY_IMAGE_MAX_PIXELS = 40_000_000;
export const PROPERTY_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export const managementModes = ["RENTAL", "SALE", "SERVICE_CHARGE"] as const;
export type PropertyManagementMode = (typeof managementModes)[number];

export const managementJourneys: Array<{
  value: PropertyManagementMode;
  title: string;
  description: string;
  capabilities: string;
}> = [
  {
    value: "RENTAL",
    title: "Rental property",
    description: "Collect rent, onboard tenants and manage leases.",
    capabilities: "Rent · leases · tenant payments",
  },
  {
    value: "SALE",
    title: "Property for sale",
    description: "Manage listings, buyers and sale milestones.",
    capabilities: "Listings · buyers · transactions",
  },
  {
    value: "SERVICE_CHARGE",
    title: "Service charge property",
    description: "Run estate operations and owner service-charge billing.",
    capabilities: "Owners · service charge · estate operations",
  },
];

export function parseCoordinates(value: string) {
  const parts = value.split(",").map(part => Number(part.trim()));
  if (parts.length !== 2 || parts.some(part => !Number.isFinite(part))) return null;
  const [lat, lng] = parts;
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
  return { lat, lng };
}

export const propertySchema = z.object({
  managementMode: z.enum(managementModes),
  name: z.string().trim().min(1, "Property name is required").max(160, "Use 160 characters or fewer"),
  type: z.string().trim().min(1, "Property type is required"),
  address: z.string().trim().min(1, "Address is required").max(500, "Use 500 characters or fewer"),
  mapLocation: z.string().trim().refine(value => parseCoordinates(value) !== null, {
    message: "Enter valid coordinates between -90/90 latitude and -180/180 longitude",
  }),
  currency: z.string().trim().length(3, "Select a valid currency"),
});

export type PropertyFormData = z.infer<typeof propertySchema>;

export async function validatePropertyImage(file: File): Promise<string | null> {
  if (!PROPERTY_IMAGE_TYPES.includes(file.type as (typeof PROPERTY_IMAGE_TYPES)[number])) {
    return "Upload a JPG, PNG or WebP image.";
  }
  if (file.size > PROPERTY_IMAGE_MAX_BYTES) {
    return "The image must be 10 MB or smaller.";
  }

  try {
    const dimensions = await readImageDimensions(file);
    const pixels = dimensions.width * dimensions.height;
    const tooSmall = dimensions.width < PROPERTY_IMAGE_MIN_WIDTH || dimensions.height < PROPERTY_IMAGE_MIN_HEIGHT;
    if (tooSmall) return `The image must be at least ${PROPERTY_IMAGE_MIN_WIDTH} × ${PROPERTY_IMAGE_MIN_HEIGHT} pixels.`;
    if (pixels > PROPERTY_IMAGE_MAX_PIXELS) return "The image dimensions are too large.";
    return null;
  } catch {
    return "The selected file could not be read as an image.";
  }
}

async function readImageDimensions(file: File): Promise<{ width: number; height: number }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    const dimensions = { width: bitmap.width, height: bitmap.height };
    bitmap.close();
    return dimensions;
  }

  const url = URL.createObjectURL(file);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
      image.onerror = reject;
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}
