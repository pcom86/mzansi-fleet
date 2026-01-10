import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { VehicleDocument, CreateVehicleDocumentCommand, UpdateVehicleDocumentCommand } from '../models/vehicle-documents.model';

@Injectable({
  providedIn: 'root'
})
export class VehicleDocumentsService {
  private apiUrl = `${environment.apiUrl}/VehicleDocuments`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<VehicleDocument[]> {
    return this.http.get<VehicleDocument[]>(this.apiUrl);
  }

  getById(id: string): Observable<VehicleDocument> {
    return this.http.get<VehicleDocument>(`${this.apiUrl}/${id}`);
  }

  getByVehicleId(vehicleId: string): Observable<VehicleDocument[]> {
    return this.http.get<VehicleDocument[]>(`${this.apiUrl}/vehicle/${vehicleId}`);
  }

  create(command: CreateVehicleDocumentCommand): Observable<VehicleDocument> {
    return this.http.post<VehicleDocument>(this.apiUrl, command);
  }

  update(id: string, command: UpdateVehicleDocumentCommand): Observable<VehicleDocument> {
    return this.http.put<VehicleDocument>(`${this.apiUrl}/${id}`, command);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
