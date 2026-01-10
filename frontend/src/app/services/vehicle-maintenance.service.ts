import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  ServiceHistory, 
  CreateServiceHistoryCommand, 
  UpdateServiceHistoryCommand,
  MaintenanceHistory,
  CreateMaintenanceHistoryCommand,
  UpdateMaintenanceHistoryCommand,
  VehicleServiceAlert
} from '../models';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class VehicleMaintenanceService {
  private apiUrl = environment.apiUrl || 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  // Service History Methods
  getAllServiceHistory(): Observable<ServiceHistory[]> {
    return this.http.get<ServiceHistory[]>(`${this.apiUrl}/ServiceHistory`);
  }

  getServiceHistoryById(id: string): Observable<ServiceHistory> {
    return this.http.get<ServiceHistory>(`${this.apiUrl}/ServiceHistory/${id}`);
  }

  getServiceHistoryByVehicleId(vehicleId: string): Observable<ServiceHistory[]> {
    return this.http.get<ServiceHistory[]>(`${this.apiUrl}/ServiceHistory/vehicle/${vehicleId}`);
  }

  getLatestServiceByVehicleId(vehicleId: string): Observable<ServiceHistory> {
    return this.http.get<ServiceHistory>(`${this.apiUrl}/ServiceHistory/vehicle/${vehicleId}/latest`);
  }

  createServiceHistory(command: CreateServiceHistoryCommand): Observable<ServiceHistory> {
    return this.http.post<ServiceHistory>(`${this.apiUrl}/ServiceHistory`, command);
  }

  updateServiceHistory(id: string, command: UpdateServiceHistoryCommand): Observable<ServiceHistory> {
    return this.http.put<ServiceHistory>(`${this.apiUrl}/ServiceHistory/${id}`, command);
  }

  deleteServiceHistory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/ServiceHistory/${id}`);
  }

  // Maintenance History Methods
  getAllMaintenanceHistory(): Observable<MaintenanceHistory[]> {
    return this.http.get<MaintenanceHistory[]>(`${this.apiUrl}/MaintenanceHistory`);
  }

  getMaintenanceHistoryById(id: string): Observable<MaintenanceHistory> {
    return this.http.get<MaintenanceHistory>(`${this.apiUrl}/MaintenanceHistory/${id}`);
  }

  getMaintenanceHistoryByVehicleId(vehicleId: string): Observable<MaintenanceHistory[]> {
    return this.http.get<MaintenanceHistory[]>(`${this.apiUrl}/MaintenanceHistory/vehicle/${vehicleId}`);
  }

  getLatestMaintenanceByVehicleId(vehicleId: string): Observable<MaintenanceHistory> {
    return this.http.get<MaintenanceHistory>(`${this.apiUrl}/MaintenanceHistory/vehicle/${vehicleId}/latest`);
  }

  createMaintenanceHistory(command: CreateMaintenanceHistoryCommand): Observable<MaintenanceHistory> {
    return this.http.post<MaintenanceHistory>(`${this.apiUrl}/MaintenanceHistory`, command);
  }

  updateMaintenanceHistory(id: string, command: UpdateMaintenanceHistoryCommand): Observable<MaintenanceHistory> {
    return this.http.put<MaintenanceHistory>(`${this.apiUrl}/MaintenanceHistory/${id}`, command);
  }

  deleteMaintenanceHistory(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/MaintenanceHistory/${id}`);
  }

  // Vehicle Service Alerts
  getVehicleServiceAlerts(daysThreshold: number = 7, mileageThreshold: number = 500): Observable<VehicleServiceAlert[]> {
    let params = new HttpParams()
      .set('daysThreshold', daysThreshold.toString())
      .set('mileageThreshold', mileageThreshold.toString());
    
    return this.http.get<VehicleServiceAlert[]>(`${this.apiUrl}/VehicleAlerts/service-due`, { params });
  }
}
