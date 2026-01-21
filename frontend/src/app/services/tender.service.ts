import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Tender {
  id: string;
  title: string;
  description: string;
  requirementDetails: string;
  budgetMin?: number;
  budgetMax?: number;
  transportType: string;
  requiredVehicles?: number;
  routeDetails: string;
  startDate: string;
  endDate: string;
  applicationDeadline?: string;
  pickupLocation: string;
  dropoffLocation: string;
  serviceArea: string;
  tenderPublisherId: string;
  publisherName: string;
  publisherEmail: string;
  status: string;
  awardedToOwnerId?: string;
  awardedToOwnerName?: string;
  createdAt: string;
  updatedAt: string;
  applicationCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class TenderService {
  private apiUrl = 'http://localhost:5000/api/Tender';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Get all tenders (public)
  getAllTenders(status?: string, transportType?: string, location?: string): Observable<Tender[]> {
    let url = this.apiUrl;
    const params: string[] = [];
    
    if (status) params.push(`status=${encodeURIComponent(status)}`);
    if (transportType) params.push(`transportType=${encodeURIComponent(transportType)}`);
    if (location) params.push(`location=${encodeURIComponent(location)}`);
    
    if (params.length > 0) {
      url += `?${params.join('&')}`;
    }
    
    return this.http.get<Tender[]>(url);
  }

  // Get recent tenders (last 7 days)
  getRecentTenders(days: number = 7): Observable<Tender[]> {
    return new Observable(observer => {
      this.getAllTenders('Open').subscribe({
        next: (tenders) => {
          const cutoffDate = new Date();
          cutoffDate.setDate(cutoffDate.getDate() - days);
          
          const recentTenders = tenders.filter(tender => {
            const createdDate = new Date(tender.createdAt);
            return createdDate >= cutoffDate;
          });
          
          observer.next(recentTenders);
          observer.complete();
        },
        error: (error) => observer.error(error)
      });
    });
  }

  // Get tender by ID
  getTenderById(id: string): Observable<Tender> {
    return this.http.get<Tender>(`${this.apiUrl}/${id}`);
  }

  // Get my tenders (authenticated)
  getMyTenders(): Observable<Tender[]> {
    return this.http.get<Tender[]>(`${this.apiUrl}/my-tenders`, {
      headers: this.getAuthHeaders()
    });
  }

  // Create a tender (authenticated)
  createTender(tenderData: any): Observable<Tender> {
    return this.http.post<Tender>(this.apiUrl, tenderData, {
      headers: this.getAuthHeaders()
    });
  }

  // Delete a tender (authenticated)
  deleteTender(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Apply to a tender (authenticated)
  applyToTender(tenderId: string, applicationData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/${tenderId}/apply`, applicationData, {
      headers: this.getAuthHeaders()
    });
  }

  // Get tender applications (authenticated)
  getTenderApplications(tenderId: string): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/${tenderId}/applications`, {
      headers: this.getAuthHeaders()
    });
  }

  // Get my applications (authenticated)
  getMyApplications(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/my-applications`, {
      headers: this.getAuthHeaders()
    });
  }
}
