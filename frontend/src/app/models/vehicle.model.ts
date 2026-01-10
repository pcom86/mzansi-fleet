export interface Vehicle {
  id: string;
  tenantId: string;
  registration?: string;
  make?: string;
  model?: string;
  year: number;
  vin?: string;
  engineNumber?: string;
  odometer: number;
  mileage: number;
  lastServiceDate?: string;
  nextServiceDate?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  serviceIntervalKm: number;
  capacity: number;
  type?: string;
  baseLocation?: string;
  status?: string;
  photoBase64?: string;
  photos?: string[]; // Additional photos for gallery
}

export interface CreateVehicleCommand {
  ownerId: string;
  make?: string;
  model?: string;
  registrationNumber?: string;
  year: number;
  color?: string;
  state?: string;
}

export interface UpdateVehicleCommand {
  id: string;
  ownerId: string;
  make?: string;
  model?: string;
  registrationNumber?: string;
  year: number;
  color?: string;
  state?: string;
}
