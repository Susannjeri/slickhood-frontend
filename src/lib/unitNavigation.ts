// Shared "where did the user come from" resolution for unit detail/edit/create
// navigation. Unit Details can now be reached from Property Details or from
// any of the Sale Units / Rentals / Homeowners list pages — every caller must
// pass a `from` query param, and every page that links deeper (Edit, Create)
// must keep forwarding it so the eventual "Back" lands where the user expects.

export type UnitOrigin = "property" | "sale" | "rentals" | "homeowners";

const ORIGIN_VALUES: UnitOrigin[] = ["property", "sale", "rentals", "homeowners"];

export function parseUnitOrigin(value: string | null | undefined): UnitOrigin {
  return (ORIGIN_VALUES as string[]).includes(value ?? "") ? (value as UnitOrigin) : "property";
}

export function originFromLeaseMode(leaseMode: string | null | undefined): UnitOrigin {
  switch (leaseMode) {
    case "SALE":
      return "sale";
    case "RENT":
      return "rentals";
    case "SERVICE_CHARGE":
      return "homeowners";
    default:
      return "property";
  }
}

export function unitListHref(origin: UnitOrigin, propertyId: string | number): string {
  switch (origin) {
    case "sale":
      return "/dashboard/property/sale-units";
    case "rentals":
      return "/dashboard/property/rentals";
    case "homeowners":
      return "/dashboard/homeowners";
    case "property":
    default:
      return `/dashboard/property/properties/details/${propertyId}`;
  }
}

export function unitOriginLabel(origin: UnitOrigin): string {
  switch (origin) {
    case "sale":
      return "Sale Units";
    case "rentals":
      return "Rentals";
    case "homeowners":
      return "Homeowners";
    case "property":
    default:
      return "Property";
  }
}
