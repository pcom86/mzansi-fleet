import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CreateRentalRequestDto {
  vehicleType: string;
  seatingCapacity?: number;
  pickupLocation: string;
  dropoffLocation: string;
  startDate: string;
  endDate: string;
  tripPurpose: string;
  specialRequirements?: string;
  budgetMin?: number;
  budgetMax?: number;
}

export interface RentalRequestDto {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  vehicleType: string;
  seatingCapacity?: number;
  pickupLocation: string;
  dropoffLocation: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  tripPurpose: string;
  specialRequirements?: string;
  budgetMin?: number;
  budgetMax?: number;
  status: string;
  createdAt: string;
  offerCount: number;
  hasMyOffer: boolean;
}

export interface CreateRentalOfferDto {
  rentalRequestId: string;
  vehicleId: string;
  pricePerDay: number;
  offerMessage: string;
  termsAndConditions?: string;
  includesDriver: boolean;
  driverFee?: number;
  includesInsurance: boolean;
  securityDeposit?: number;
}

export interface VehicleBasicInfo {
  id: string;
  registration: string;
  make: string;
  model: string;
  year: number;
  type: string;
  capacity: number;
  status: string;
  photos: string[];
}

export interface RentalOfferDto {
  id: string;
  rentalRequestId: string;
  ownerId: string;
  ownerCompanyName: string;
  ownerContactName: string;
  ownerPhone: string;
  ownerEmail: string;
  vehicleId: string;
  vehicle?: VehicleBasicInfo;
  pricePerDay: number;
  totalPrice: number;
  offerMessage: string;
  termsAndConditions?: string;
  includesDriver: boolean;
  driverFee?: number;
  includesInsurance: boolean;
  securityDeposit?: number;
  status: string;
  submittedAt: string;
  // Vehicle details
  vehicleMake?: string;
  vehicleModel?: string;
  vehicleYear?: number;
  vehicleRegistration?: string;
  vehiclePhotoUrls?: string[];
  // Request details
  requestVehicleType?: string;
  requestPickupLocation?: string;
  requestDropoffLocation?: string;
  requestStartDate?: string;
  requestEndDate?: string;
}

export interface RentalBookingDto {
  id: string;
  rentalRequestId: string;
  renterId: string;
  renterName: string;
  ownerId: string;
  ownerCompanyName: string;
  ownerContactName: string;
  ownerPhone: string;
  vehicle?: VehicleBasicInfo;
  startDate: string;
  endDate: string;
  durationDays: number;
  totalAmount: number;
  pickupLocation: string;
  dropoffLocation: string;
  status: string;
  bookedAt: string;
}

@Injectable({
  providedIn: 'root'
})
export class RentalMarketplaceService {
  private apiUrl = 'http://localhost:5000/api/RentalMarketplace';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Create rental request
  createRequest(request: CreateRentalRequestDto): Observable<RentalRequestDto> {
    return this.http.post<RentalRequestDto>(`${this.apiUrl}/requests`, request, {
      headers: this.getAuthHeaders()
    });
  }

  // Get my rental requests
  getMyRequests(): Observable<RentalRequestDto[]> {
    return this.http.get<RentalRequestDto[]>(`${this.apiUrl}/requests`, {
      headers: this.getAuthHeaders()
    });
  }

  // Get marketplace requests (for owners)
  getMarketplaceRequests(): Observable<RentalRequestDto[]> {
    return this.http.get<RentalRequestDto[]>(`${this.apiUrl}/marketplace`, {
      headers: this.getAuthHeaders()
    });
  }

  // Submit offer
  submitOffer(offer: CreateRentalOfferDto): Observable<RentalOfferDto> {
    return this.http.post<RentalOfferDto>(`${this.apiUrl}/offers`, offer, {
      headers: this.getAuthHeaders()
    });
  }

  // Get offers for a request
  getOffersForRequest(requestId: string): Observable<RentalOfferDto[]> {
    return this.http.get<RentalOfferDto[]>(`${this.apiUrl}/requests/${requestId}/offers`, {
      headers: this.getAuthHeaders()
    });
  }

  // Get my offers as owner
  getMyOffers(): Observable<RentalOfferDto[]> {
    return this.http.get<RentalOfferDto[]>(`${this.apiUrl}/my-offers`, {
      headers: this.getAuthHeaders()
    });
  }

  // Accept offer
  acceptOffer(data: { rentalRequestId: string; offerId: string }): Observable<RentalBookingDto> {
    return this.http.post<RentalBookingDto>(`${this.apiUrl}/offers/accept`, data, {
      headers: this.getAuthHeaders()
    });
  }

  // Reject offer
  rejectOffer(data: { rentalRequestId: string; offerId: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/offers/reject`, data, {
      headers: this.getAuthHeaders()
    });
  }

  // Get my bookings
  getMyBookings(): Observable<RentalBookingDto[]> {
    return this.http.get<RentalBookingDto[]>(`${this.apiUrl}/bookings`, {
      headers: this.getAuthHeaders()
    });
  }
}
