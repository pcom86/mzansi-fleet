import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Tenant, User, OwnerProfile, DriverProfile, StaffProfile } from '../models';

@Injectable({
  providedIn: 'root'
})
export class IdentityService {
  private apiUrl = `${environment.apiUrl}/Identity`;

  constructor(private http: HttpClient) {}

  // Tenants
  getAllTenants(): Observable<Tenant[]> {
    return this.http.get<Tenant[]>(`${this.apiUrl}/tenants`);
  }

  getTenantById(id: string): Observable<Tenant> {
    return this.http.get<Tenant>(`${this.apiUrl}/tenants/${id}`);
  }

  createTenant(tenant: Partial<Tenant>): Observable<Tenant> {
    return this.http.post<Tenant>(`${this.apiUrl}/tenants`, tenant);
  }

  updateTenant(id: string, tenant: Tenant): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/tenants/${id}`, tenant);
  }

  deleteTenant(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/tenants/${id}`);
  }

  // Users
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/users`);
  }

  getUserById(id: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/users/${id}`);
  }

  createUser(user: Partial<User>): Observable<User> {
    return this.http.post<User>(`${this.apiUrl}/users`, user);
  }

  updateUser(id: string, user: User): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/users/${id}`, user);
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/users/${id}`);
  }

  // Owner Profiles
  getAllOwnerProfiles(): Observable<OwnerProfile[]> {
    return this.http.get<OwnerProfile[]>(`${this.apiUrl}/ownerprofiles`);
  }

  getOwnerProfileById(id: string): Observable<OwnerProfile> {
    return this.http.get<OwnerProfile>(`${this.apiUrl}/ownerprofiles/${id}`);
  }

  createOwnerProfile(profile: Partial<OwnerProfile>): Observable<OwnerProfile> {
    return this.http.post<OwnerProfile>(`${this.apiUrl}/ownerprofiles`, profile);
  }

  updateOwnerProfile(id: string, profile: OwnerProfile): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/ownerprofiles/${id}`, profile);
  }

  deleteOwnerProfile(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/ownerprofiles/${id}`);
  }

  // Driver Profiles
  getAllDriverProfiles(): Observable<DriverProfile[]> {
    return this.http.get<DriverProfile[]>(`${this.apiUrl}/driverprofiles`);
  }

  getDriverProfileById(id: string): Observable<DriverProfile> {
    return this.http.get<DriverProfile>(`${this.apiUrl}/driverprofiles/${id}`);
  }

  createDriverProfile(profile: Partial<DriverProfile>): Observable<DriverProfile> {
    return this.http.post<DriverProfile>(`${this.apiUrl}/driverprofiles`, profile);
  }

  updateDriverProfile(id: string, profile: DriverProfile): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/driverprofiles/${id}`, profile);
  }

  deleteDriverProfile(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/driverprofiles/${id}`);
  }

  // Staff Profiles
  getAllStaffProfiles(): Observable<StaffProfile[]> {
    return this.http.get<StaffProfile[]>(`${this.apiUrl}/staffprofiles`);
  }

  getStaffProfileById(id: string): Observable<StaffProfile> {
    return this.http.get<StaffProfile>(`${this.apiUrl}/staffprofiles/${id}`);
  }

  createStaffProfile(profile: Partial<StaffProfile>): Observable<StaffProfile> {
    return this.http.post<StaffProfile>(`${this.apiUrl}/staffprofiles`, profile);
  }

  updateStaffProfile(id: string, profile: StaffProfile): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/staffprofiles/${id}`, profile);
  }

  deleteStaffProfile(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/staffprofiles/${id}`);
  }

  // Password Management
  changePassword(userId: string, currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/users/${userId}/password`, {
      currentPassword,
      newPassword
    });
  }

  adminResetPassword(userId: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/users/${userId}/reset-password`, {
      newPassword
    });
  }
}
