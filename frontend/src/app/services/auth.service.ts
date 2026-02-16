import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject } from 'rxjs';
import { tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  expiresAt: string;
  fullName?: string;
}

export interface UserInfo {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  fullName?: string;
}

export interface RegisterServiceProviderDto {
  tenantId: string;
  email: string;
  password: string;
  phone: string;
  businessName: string;
  registrationNumber: string;
  contactPerson: string;
  address: string;
  serviceTypes: string;
  vehicleCategories: string;
  operatingHours: string;
  hourlyRate?: number;
  callOutFee?: number;
  serviceRadiusKm?: number;
  bankAccount: string;
  taxNumber: string;
  certificationsLicenses: string;
  notes: string;
}

export interface RegisterServiceProviderResponse {
  message: string;
  profileId: string;
  userId: string;
  businessName: string;
  email: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = `${environment.apiUrl}/Identity`;
  private currentUserSubject = new BehaviorSubject<UserInfo | null>(this.getUserFromStorage());
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, credentials)
      .pipe(
        tap(response => {
          this.setSession(response);
        })
      );
  }

  registerServiceProvider(registration: RegisterServiceProviderDto): Observable<RegisterServiceProviderResponse> {
    return this.http.post<RegisterServiceProviderResponse>(`${this.apiUrl}/register-service-provider`, registration);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isLoggedIn(): boolean {
    const token = localStorage.getItem('token');
    return !!token;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getCurrentUser(): UserInfo | null {
    return this.currentUserSubject.value;
  }

  getCurrentUserInfo(): UserInfo | null {
    return this.getUserFromStorage();
  }

  private setSession(authResult: LoginResponse): void {
    localStorage.setItem('token', authResult.token);
    const userInfo: UserInfo = {
      userId: authResult.userId,
      email: authResult.email,
      role: authResult.role,
      tenantId: authResult.tenantId,
      fullName: authResult.fullName
    };
    localStorage.setItem('user', JSON.stringify(userInfo));
    this.currentUserSubject.next(userInfo);
  }

  private getUserFromStorage(): UserInfo | null {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }
}
