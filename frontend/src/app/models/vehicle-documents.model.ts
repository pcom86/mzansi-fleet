export interface VehicleDocument {
  id: string;
  vehicleId: string;
  documentType: string;
  fileName?: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface CreateVehicleDocumentCommand {
  vehicleId: string;
  documentType: string;
  fileUrl: string;
  uploadedAt: string;
}

export interface UpdateVehicleDocumentCommand {
  id: string;
  vehicleId: string;
  documentType: string;
  fileUrl: string;
  uploadedAt: string;
}
