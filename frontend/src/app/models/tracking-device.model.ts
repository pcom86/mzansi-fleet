export interface TrackingDeviceRequest {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  tenantId: string;
  vehicleId: string;
  vehicleRegistration: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  preferredInstallationDate: string;
  installationLocation: string;
  deviceFeatures: string;
  specialRequirements: string;
  budgetMin?: number;
  budgetMax?: number;
  status: string;
  createdAt: string;
  offerCount: number;
  hasMyOffer: boolean;
}

export interface CreateTrackingDeviceRequest {
  vehicleId: string;
  preferredInstallationDate: string;
  installationLocation: string;
  deviceFeatures: string;
  specialRequirements: string;
  budgetMin?: number;
  budgetMax?: number;
}

export interface TrackingDeviceOffer {
  id: string;
  trackingDeviceRequestId: string;
  serviceProviderId: string;
  serviceProviderName: string;
  serviceProviderPhone: string;
  serviceProviderEmail: string;
  serviceProviderAddress: string;
  serviceProviderRating?: number;
  serviceProviderReviews?: number;
  deviceBrand: string;
  deviceModel: string;
  deviceFeatures: string;
  installationDetails: string;
  deviceCost: number;
  installationCost: number;
  monthlySubscriptionFee: number;
  totalUpfrontCost: number;
  warrantyPeriod: string;
  supportDetails: string;
  availableFrom: string;
  estimatedInstallationTime: string;
  additionalNotes: string;
  status: string;
  submittedAt: string;
}

export interface CreateTrackingDeviceOffer {
  trackingDeviceRequestId: string;
  deviceBrand: string;
  deviceModel: string;
  deviceFeatures: string;
  installationDetails: string;
  deviceCost: number;
  installationCost: number;
  monthlySubscriptionFee: number;
  warrantyPeriod: string;
  supportDetails: string;
  availableFrom: string;
  estimatedInstallationTime: string;
  additionalNotes: string;
}
