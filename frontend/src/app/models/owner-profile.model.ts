import { User } from './user.model';

export interface OwnerProfile {
  id: string;
  userId: string;
  companyName?: string;
  address?: string;
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  user?: User;
}

export interface CreateOwnerProfileCommand {
  userId: string;
  companyName?: string;
  address?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
}
