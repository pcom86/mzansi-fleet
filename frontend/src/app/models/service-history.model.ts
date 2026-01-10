export interface ServiceHistory {
  id: string;
  vehicleId: string;
  serviceDate: string;
  serviceType: string;
  description: string;
  mileageAtService: number;
  cost: number;
  serviceProvider: string;
  nextServiceDate?: string;
  nextServiceMileage?: number;
  notes?: string;
  invoiceNumber?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateServiceHistoryCommand {
  id?: string;
  vehicleId: string;
  serviceDate: string;
  serviceType: string;
  description: string;
  mileageAtService: number;
  cost: number;
  serviceProvider: string;
  nextServiceDate?: string;
  nextServiceMileage?: number;
  notes?: string;
  invoiceNumber?: string;
}

export interface UpdateServiceHistoryCommand {
  id: string;
  serviceDate: string;
  serviceType: string;
  description: string;
  mileageAtService: number;
  cost: number;
  serviceProvider: string;
  nextServiceDate?: string;
  nextServiceMileage?: number;
  notes?: string;
  invoiceNumber?: string;
}
