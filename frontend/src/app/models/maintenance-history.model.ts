export interface MaintenanceHistory {
  id: string;
  vehicleId: string;
  maintenanceDate: string;
  maintenanceType: string;
  component: string;
  description: string;
  mileageAtMaintenance: number;
  cost: number;
  serviceProvider: string;
  priority: string;
  status: string;
  scheduledDate?: string;
  completedDate?: string;
  notes?: string;
  invoiceNumber?: string;
  performedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateMaintenanceHistoryCommand {
  id?: string;
  vehicleId: string;
  maintenanceDate: string;
  maintenanceType: string;
  component: string;
  description: string;
  mileageAtMaintenance: number;
  cost: number;
  serviceProvider: string;
  priority: string;
  status: string;
  scheduledDate?: string;
  completedDate?: string;
  notes?: string;
  invoiceNumber?: string;
  performedBy?: string;
}

export interface UpdateMaintenanceHistoryCommand {
  id: string;
  maintenanceDate: string;
  maintenanceType: string;
  component: string;
  description: string;
  mileageAtMaintenance: number;
  cost: number;
  serviceProvider: string;
  priority: string;
  status: string;
  scheduledDate?: string;
  completedDate?: string;
  notes?: string;
  invoiceNumber?: string;
  performedBy?: string;
}

export interface VehicleServiceAlert {
  vehicleId: string;
  registration: string;
  make: string;
  model: string;
  currentMileage: number;
  lastServiceDate?: string;
  nextServiceDate?: string;
  daysUntilService: number;
  mileageUntilService: number;
  alertLevel: 'Critical' | 'Warning' | 'Info';
  alertMessage: string;
}
