import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  TrackingDeviceRequest,
  CreateTrackingDeviceRequest,
  TrackingDeviceOffer,
  CreateTrackingDeviceOffer
} from '../models/tracking-device.model';

@Injectable({
  providedIn: 'root'
})
export class TrackingDeviceService {
  private apiUrl = 'http://localhost:5000/api/TrackingDevice';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Owner: Create tracking device installation request
  createRequest(request: CreateTrackingDeviceRequest): Observable<TrackingDeviceRequest> {
    return this.http.post<TrackingDeviceRequest>(`${this.apiUrl}/request`, request, {
      headers: this.getAuthHeaders()
    });
  }

  // Owner: Get my tracking device requests
  getMyRequests(): Observable<TrackingDeviceRequest[]> {
    return this.http.get<TrackingDeviceRequest[]>(`${this.apiUrl}/my-requests`, {
      headers: this.getAuthHeaders()
    });
  }

  // Service Provider: Get marketplace requests (open requests)
  getMarketplaceRequests(): Observable<TrackingDeviceRequest[]> {
    return this.http.get<TrackingDeviceRequest[]>(`${this.apiUrl}/marketplace-requests`, {
      headers: this.getAuthHeaders()
    });
  }

  // Service Provider: Submit an offer for a request
  submitOffer(offer: CreateTrackingDeviceOffer): Observable<TrackingDeviceOffer> {
    return this.http.post<TrackingDeviceOffer>(`${this.apiUrl}/offer`, offer, {
      headers: this.getAuthHeaders()
    });
  }

  // Owner: Get offers for a specific request
  getOffersForRequest(requestId: string): Observable<TrackingDeviceOffer[]> {
    return this.http.get<TrackingDeviceOffer[]>(`${this.apiUrl}/request/${requestId}/offers`, {
      headers: this.getAuthHeaders()
    });
  }

  // Service Provider: Get my submitted offers
  getMyOffers(): Observable<TrackingDeviceOffer[]> {
    return this.http.get<TrackingDeviceOffer[]>(`${this.apiUrl}/my-offers`, {
      headers: this.getAuthHeaders()
    });
  }

  // Owner: Accept an offer
  acceptOffer(offerId: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/accept-offer/${offerId}`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  // Owner: Delete/cancel a request
  deleteRequest(requestId: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/request/${requestId}`, {
      headers: this.getAuthHeaders()
    });
  }
}
