export interface ServiceProvider {
  id: string;
  businessName: string;
  registrationNumber: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  serviceTypes: string;
  vehicleCategories: string;
  operatingHours: string;
  isActive: boolean;
  hourlyRate?: number;
  callOutFee?: number;
  serviceRadiusKm?: number;
  bankAccount: string;
  taxNumber: string;
  certificationsLicenses: string;
  rating?: number;
  totalReviews?: number;
  notes: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateServiceProvider {
  businessName: string;
  registrationNumber: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  serviceTypes: string;
  vehicleCategories: string;
  operatingHours: string;
  hourlyRate?: number;
  callOutFee?: number;
  serviceRadiusKm?: number;
  bankAccount: string;
  taxNumber: string;
  certificationsLicenses: string;
  notes: string;
}

export interface UpdateServiceProvider {
  businessName: string;
  registrationNumber: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  serviceTypes: string;
  vehicleCategories: string;
  operatingHours: string;
  isActive: boolean;
  hourlyRate?: number;
  callOutFee?: number;
  serviceRadiusKm?: number;
  bankAccount: string;
  taxNumber: string;
  certificationsLicenses: string;
  notes: string;
}
