import { Tenant } from './tenant.model';

export interface User {
  id: string;
  tenantId: string;
  email?: string;
  phone?: string;
  passwordHash?: string;
  role?: string;
  isActive: boolean;
  tenant?: Tenant;
}
