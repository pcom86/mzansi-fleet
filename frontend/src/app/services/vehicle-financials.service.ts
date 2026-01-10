import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  VehicleEarnings, 
  VehicleExpense, 
  CreateVehicleEarnings, 
  CreateVehicleExpense,
  VehicleProfitabilityReport 
} from '../models/vehicle-financials.model';

@Injectable({
  providedIn: 'root'
})
export class VehicleFinancialsService {
  private baseUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  // Earnings endpoints
  getVehicleEarnings(vehicleId: string): Observable<VehicleEarnings[]> {
    return this.http.get<VehicleEarnings[]>(`${this.baseUrl}/VehicleEarnings/vehicle/${vehicleId}`);
  }

  getVehicleEarningsByPeriod(vehicleId: string, startDate: string, endDate: string): Observable<VehicleEarnings[]> {
    return this.http.get<VehicleEarnings[]>(
      `${this.baseUrl}/VehicleEarnings/vehicle/${vehicleId}/period?startDate=${startDate}&endDate=${endDate}`
    );
  }

  createEarnings(earnings: CreateVehicleEarnings): Observable<VehicleEarnings> {
    return this.http.post<VehicleEarnings>(`${this.baseUrl}/VehicleEarnings`, earnings);
  }

  updateEarnings(id: string, earnings: CreateVehicleEarnings): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/VehicleEarnings/${id}`, earnings);
  }

  deleteEarnings(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/VehicleEarnings/${id}`);
  }

  // Expenses endpoints
  getVehicleExpenses(vehicleId: string): Observable<VehicleExpense[]> {
    return this.http.get<VehicleExpense[]>(`${this.baseUrl}/VehicleExpenses/vehicle/${vehicleId}`);
  }

  getVehicleExpensesByPeriod(vehicleId: string, startDate: string, endDate: string): Observable<VehicleExpense[]> {
    return this.http.get<VehicleExpense[]>(
      `${this.baseUrl}/VehicleExpenses/vehicle/${vehicleId}/period?startDate=${startDate}&endDate=${endDate}`
    );
  }

  createExpense(expense: CreateVehicleExpense): Observable<VehicleExpense> {
    return this.http.post<VehicleExpense>(`${this.baseUrl}/VehicleExpenses`, expense);
  }

  updateExpense(id: string, expense: CreateVehicleExpense): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/VehicleExpenses/${id}`, expense);
  }

  deleteExpense(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/VehicleExpenses/${id}`);
  }

  // Profitability report
  getProfitabilityReport(vehicleId: string, startDate: string, endDate: string): Observable<VehicleProfitabilityReport> {
    return this.http.get<VehicleProfitabilityReport>(
      `${this.baseUrl}/VehicleProfitability/vehicle/${vehicleId}?startDate=${startDate}&endDate=${endDate}`
    );
  }
}
