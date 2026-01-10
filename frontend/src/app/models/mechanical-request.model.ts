export interface MechanicalRequest {
  id: string;
  ownerId: string;
  vehicleId?: string;
  location?: string;
  category?: string;
  description?: string;
  mediaUrls?: string;
  preferredTime?: Date;
  callOutRequired: boolean;
  state?: string;
}

export interface CreateMechanicalRequestCommand {
  ownerId: string;
  vehicleId?: string;
  location?: string;
  category?: string;
  description?: string;
  mediaUrls?: string;
  preferredTime?: Date;
  callOutRequired: boolean;
  state?: string;
}
