import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  RoadsideAssistanceRequest,
  CreateRoadsideAssistanceRequest,
  AssignRoadsideAssistance,
  UpdateRoadsideAssistanceStatus
} from '../models/roadside-assistance.model';

@Injectable({
  providedIn: 'root'
})
export class RoadsideAssistanceService {
  private apiUrl = `${environment.apiUrl}/RoadsideAssistance`;

  constructor(private http: HttpClient) {}

  // Create a new assistance request
  createRequest(request: CreateRoadsideAssistanceRequest): Observable<RoadsideAssistanceRequest> {
    return this.http.post<RoadsideAssistanceRequest>(`${this.apiUrl}/request`, request);
  }

  // Get a specific request by ID
  getRequest(id: string): Observable<RoadsideAssistanceRequest> {
    return this.http.post<RoadsideAssistanceRequest>(`${this.apiUrl}/${id}`, {});
  }

  // Get my assistance requests (for owners/drivers)
  getMyRequests(): Observable<RoadsideAssistanceRequest[]> {
    return this.http.get<RoadsideAssistanceRequest[]>(`${this.apiUrl}/my-requests`);
  }

  // Get pending requests (for service providers)
  getPendingRequests(): Observable<RoadsideAssistanceRequest[]> {
    return this.http.get<RoadsideAssistanceRequest[]>(`${this.apiUrl}/pending`);
  }

  // Get assigned requests (for service providers)
  getAssignedRequests(): Observable<RoadsideAssistanceRequest[]> {
    return this.http.get<RoadsideAssistanceRequest[]>(`${this.apiUrl}/assigned`);
  }

  // Assign request to service provider
  assignRequest(assignment: AssignRoadsideAssistance): Observable<any> {
    return this.http.post(`${this.apiUrl}/assign`, assignment);
  }

  // Update request status
  updateStatus(update: UpdateRoadsideAssistanceStatus): Observable<any> {
    return this.http.put(`${this.apiUrl}/update-status`, update);
  }

  // Delete a request
  deleteRequest(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }
}
