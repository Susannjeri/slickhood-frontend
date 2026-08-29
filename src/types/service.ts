

export interface PendingService {
    id: number;
    profileId: number;
    categoryId: number;
    categoryName: string;
    amount: number;
    currency: string;
    pricingUnit: string;
    status: string;
    createdOn: string;
    serviceProviderName: string;
    latitude: number;
    longitude: number;
    riskLabel: string;
}