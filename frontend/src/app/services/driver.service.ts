import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { DriverProfile } from '../models';

@Injectable({
  providedIn: 'root'
})
export class DriverService {
  private apiUrl = `${environment.apiUrl}/Drivers`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<DriverProfile[]> {
    return this.http.get<DriverProfile[]>(this.apiUrl);
  }

  getById(id: string): Observable<DriverProfile> {
    return this.http.get<DriverProfile>(`${this.apiUrl}/${id}`);
  }

  create(driver: DriverProfile): Observable<void> {
    return this.http.post<void>(this.apiUrl, driver);
  }

  update(id: string, driver: DriverProfile): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, driver);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
