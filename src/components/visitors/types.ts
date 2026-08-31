


export type VisitorStatus = "PENDING" | "CHECKED_IN" | "CHECKED_OUT" | "CANCELLED" | string;
export type VisitType = "WALK_IN" | "DRIVE_IN" | "DELIVERY";

export type Visitor = {
    id: number;
    visitorName: string;
    vehiclePlate: string;
    expectedArrivalTime: string;
    parkingLot: string;
    chargeable: boolean;
    status: VisitorStatus;
    unitId: number;
    propertyId: number;
    unitRef: string;
    propertyName: string;
    createdOn: string;
    visitorCategory: string;
    visitType: VisitType;
    purpose?: string;
    companyName?: string;
    trackingNumber?: string;
    credentialHint?: string;
    validFrom?: string;
    validUntil?: string;
    approvedAt?: string;
    decisionReason?: string;
    checkedInAt?: string;
    checkedOutAt?: string;
    entryCount: number;
    maxEntries: number;
    requiresApproval: boolean;
};
