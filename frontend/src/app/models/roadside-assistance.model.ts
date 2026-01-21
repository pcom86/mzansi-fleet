export interface RoadsideAssistanceRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userRole: string;
  
  vehicleId?: string;
  vehicleRegistration?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  
  assistanceType: string;
  location: string;
  latitude?: string;
  longitude?: string;
  issueDescription: string;
  additionalNotes?: string;
  
  status: string;
  requestedAt: string;
  assignedAt?: string;
  completedAt?: string;
  
  serviceProviderId?: string;
  serviceProviderName?: string;
  serviceProviderPhone?: string;
  serviceProviderRating?: number;
  serviceProviderReviews?: number;
  technicianName?: string;
  estimatedArrivalTime?: string;
  
  estimatedCost?: number;
  actualCost?: number;
  priority: string;
}

export interface CreateRoadsideAssistanceRequest {
  vehicleId?: string;
  assistanceType: string;
  location: string;
  latitude?: string;
  longitude?: string;
  issueDescription: string;
  additionalNotes?: string;
  priority: string;
}

export interface AssignRoadsideAssistance {
  requestId: string;
  technicianName?: string;
  estimatedArrivalTime?: string;
  estimatedCost?: number;
}

export interface UpdateRoadsideAssistanceStatus {
  requestId: string;
  status: string;
  actualCost?: number;
  notes?: string;
}

export const ASSISTANCE_TYPES = [
  'Towing',
  'Tire Change',
  'Fuel Delivery',
  'Jump Start',
  'Lockout Service',
  'Battery Replacement',
  'Minor Repair',
  'Accident Recovery',
  'Other'
];

export const ASSISTANCE_PRIORITIES = [
  'Normal',
  'High',
  'Emergency'
];

export const ASSISTANCE_STATUSES = [
  'Pending',
  'Assigned',
  'InProgress',
  'Completed',
  'Cancelled'
];
