import { User } from './user.model';

export interface Tenant {
  id: string;
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
  users?: User[];
}

export interface CreateTenantCommand {
  name?: string;
  contactEmail?: string;
  contactPhone?: string;
}
