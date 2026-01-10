import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { TripRequest, CreateTripRequestCommand } from '../models';

@Injectable({
  providedIn: 'root'
})
export class TripService {
  private apiUrl = `${environment.apiUrl}/Trips`;

  constructor(private http: HttpClient) {}

  getAll(): Observable<TripRequest[]> {
    return this.http.get<TripRequest[]>(this.apiUrl);
  }

  getById(id: string): Observable<TripRequest> {
    return this.http.get<TripRequest>(`${this.apiUrl}/${id}`);
  }

  create(trip: TripRequest): Observable<void> {
    return this.http.post<void>(this.apiUrl, trip);
  }

  update(id: string, trip: TripRequest): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${id}`, trip);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
