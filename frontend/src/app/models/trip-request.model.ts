export interface TripRequest {
  id: string;
  passengerId: string;
  tenantId: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  requestedTime: Date;
  passengerCount: number;
  notes?: string;
  isPooling: boolean;
  state?: string;
}

export interface CreateTripRequestCommand {
  passengerId: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  pickupTime: Date;
  passengers: number;
  status?: string;
  notes?: string;
}
