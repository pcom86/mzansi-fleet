import { User } from './user.model';

export interface DriverProfile {
  id: string;
  userId: string;
  name?: string;
  idNumber?: string;
  phone?: string;
  email?: string;
  photoUrl?: string;
  licenseCopy?: string;
  experience?: string;
  category?: string;
  hasPdp?: boolean;
  pdpCopy?: string;
  isActive: boolean;
  isAvailable: boolean;
  assignedVehicleId?: string;
  user?: User;
}
