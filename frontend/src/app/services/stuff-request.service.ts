import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { StuffRequest, StuffQuote, CreateStuffRequest, CreateStuffQuote } from '../models/stuff-request.model';

@Injectable({
  providedIn: 'root'
})
export class StuffRequestService {
  private baseUrl = 'http://localhost:5000/api';

  constructor(private http: HttpClient) {}

  // Stuff Request endpoints
  getAllRequests(): Observable<StuffRequest[]> {
    return this.http.get<StuffRequest[]>(`${this.baseUrl}/StuffRequests`);
  }

  getRequest(id: string): Observable<StuffRequest> {
    return this.http.get<StuffRequest>(`${this.baseUrl}/StuffRequests/${id}`);
  }

  getRequestsByPassenger(passengerId: string): Observable<StuffRequest[]> {
    return this.http.get<StuffRequest[]>(`${this.baseUrl}/StuffRequests/passenger/${passengerId}`);
  }

  getAvailableRequests(): Observable<StuffRequest[]> {
    return this.http.get<StuffRequest[]>(`${this.baseUrl}/StuffRequests/available`);
  }

  createRequest(request: CreateStuffRequest): Observable<StuffRequest> {
    return this.http.post<StuffRequest>(`${this.baseUrl}/StuffRequests`, request);
  }

  updateRequest(id: string, request: StuffRequest): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/StuffRequests/${id}`, request);
  }

  approveQuote(requestId: string, quoteId: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/StuffRequests/${requestId}/approve-quote/${quoteId}`, {});
  }

  cancelRequest(id: string): Observable<any> {
    return this.http.put(`${this.baseUrl}/StuffRequests/${id}/cancel`, {});
  }

  deleteRequest(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/StuffRequests/${id}`);
  }

  // Quote endpoints
  getAllQuotes(): Observable<StuffQuote[]> {
    return this.http.get<StuffQuote[]>(`${this.baseUrl}/StuffQuotes`);
  }

  getQuote(id: string): Observable<StuffQuote> {
    return this.http.get<StuffQuote>(`${this.baseUrl}/StuffQuotes/${id}`);
  }

  getQuotesByRequest(requestId: string): Observable<StuffQuote[]> {
    return this.http.get<StuffQuote[]>(`${this.baseUrl}/StuffQuotes/request/${requestId}`);
  }

  getQuotesByOwner(ownerId: string): Observable<StuffQuote[]> {
    return this.http.get<StuffQuote[]>(`${this.baseUrl}/StuffQuotes/owner/${ownerId}`);
  }

  createQuote(quote: CreateStuffQuote): Observable<StuffQuote> {
    return this.http.post<StuffQuote>(`${this.baseUrl}/StuffQuotes`, quote);
  }

  updateQuote(id: string, quote: StuffQuote): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/StuffQuotes/${id}`, quote);
  }

  deleteQuote(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/StuffQuotes/${id}`);
  }
}
