import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { ServiceProvider, CreateServiceProvider, UpdateServiceProvider } from '../models/service-provider.model';

@Injectable({
  providedIn: 'root'
})
export class ServiceProviderService {
  private apiUrl = `${environment.apiUrl}/ServiceProviders`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<ServiceProvider[]> {
    return this.http.get<ServiceProvider[]>(this.apiUrl);
  }

  getActive(): Observable<ServiceProvider[]> {
    return this.http.get<ServiceProvider[]>(`${this.apiUrl}/active`);
  }

  getByServiceType(serviceType: string): Observable<ServiceProvider[]> {
    return this.http.get<ServiceProvider[]>(`${this.apiUrl}/by-service-type/${serviceType}`);
  }

  getById(id: string): Observable<ServiceProvider> {
    return this.http.get<ServiceProvider>(`${this.apiUrl}/${id}`);
  }

  create(provider: CreateServiceProvider): Observable<ServiceProvider> {
    return this.http.post<ServiceProvider>(this.apiUrl, provider);
  }

  update(id: string, provider: UpdateServiceProvider): Observable<ServiceProvider> {
    return this.http.put<ServiceProvider>(`${this.apiUrl}/${id}`, provider);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  toggleStatus(id: string): Observable<ServiceProvider> {
    return this.http.patch<ServiceProvider>(`${this.apiUrl}/${id}/toggle-status`, {});
  }
}
