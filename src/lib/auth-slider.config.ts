export interface SliderSlide {
  id: string;
  src: string;
  alt: string;
}

export interface ServiceItem {
  id: string;
  label: string;
  description: string;
}

export const AUTH_SLIDES: SliderSlide[] = [
  {
    id: "slide-villas",
    src: "/villas.png",
    alt: "Luxury villa development at dusk — managed by SlickHood",
  },
  {
    id: "slide-riverbend",
    src: "/slider/aiimage.png",
    alt: "SlickHood Riverbend Residences — smart access, visitor management and resident portal",
  },
  {
    id: "slide-warehouse",
    src: "/warehouse.png",
    alt: "Large-scale commercial warehouse complex — managed by SlickHood",
  },
];

export const AUTH_SERVICES: ServiceItem[] = [
  { id: "svc-billing",  label: "Smart Billing",  description: "Automated invoicing" },
  { id: "svc-visitor",  label: "Visitor Hub",    description: "Secure access control" },
  { id: "svc-home",     label: "Home Services",  description: "Nanny, Plumber, Fumigation" },
  { id: "svc-soko",     label: "Soko",           description: "Groceries" },
];
