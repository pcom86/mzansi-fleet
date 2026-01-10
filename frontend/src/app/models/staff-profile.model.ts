import { User } from './user.model';

export interface StaffProfile {
  id: string;
  userId: string;
  role?: string;
  user?: User;
}

export interface CreateStaffProfileCommand {
  userId: string;
  role?: string;
}
