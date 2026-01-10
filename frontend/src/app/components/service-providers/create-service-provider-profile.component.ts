import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface CreateServiceProviderProfile {
  userId: string;
  businessName: string;
  registrationNumber: string;
  contactPerson: string;
  phone: string;
  email: string;
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

@Component({
  selector: 'app-create-service-provider-profile',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="create-profile-page">
      <div class="page-header">
        <button mat-raised-button routerLink="/profile-selection" class="back-button">
          <mat-icon>arrow_back</mat-icon>
          Back
        </button>
        <h1><mat-icon>business</mat-icon> Register Service Provider Profile</h1>
        <p>Create your account to receive maintenance job requests from fleet owners</p>
      </div>

      <div *ngIf="loading" class="loading-container">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        <p>Creating your profile...</p>
      </div>

      <form *ngIf="!loading" #profileForm="ngForm" (ngSubmit)="createProfile()">
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>account_circle</mat-icon>
            <mat-card-title>Login Credentials</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Email (Login)</mat-label>
                <mat-input [(ngModel)]="email" name="loginEmail" type="email" required></mat-input>
                <mat-hint>This will be your login username</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Password</mat-label>
                <mat-input [(ngModel)]="password" name="password" type="password" required minlength="6"></mat-input>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Phone</mat-label>
                <mat-input [(ngModel)]="phone" name="loginPhone" type="tel" required></mat-input>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>business</mat-icon>
            <mat-card-title>Business Information</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-grid">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Business Name</mat-label>
                <mat-input [(ngModel)]="profile.businessName" name="businessName" required></mat-input>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Registration Number</mat-label>
                <mat-input [(ngModel)]="profile.registrationNumber" name="registrationNumber"></mat-input>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Tax Number</mat-label>
                <mat-input [(ngModel)]="profile.taxNumber" name="taxNumber"></mat-input>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Business Address</mat-label>
                <textarea matInput [(ngModel)]="profile.address" name="address" rows="3"></textarea>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>person</mat-icon>
            <mat-card-title>Contact Information</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Contact Person</mat-label>
                <mat-input [(ngModel)]="profile.contactPerson" name="contactPerson" required></mat-input>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Contact Phone</mat-label>
                <mat-input [(ngModel)]="profile.phone" name="phone" type="tel" required></mat-input>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Contact Email</mat-label>
                <mat-input [(ngModel)]="profile.email" name="email" type="email" required></mat-input>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>build</mat-icon>
            <mat-card-title>Service Details</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-grid">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Service Types</mat-label>
                <mat-select [(ngModel)]="selectedServiceTypes" name="serviceTypes" multiple required>
                  <mat-option value="Mechanical">Mechanical</mat-option>
                  <mat-option value="Electrical">Electrical</mat-option>
                  <mat-option value="Bodywork">Bodywork</mat-option>
                  <mat-option value="Painting">Painting</mat-option>
                  <mat-option value="Towing">Towing</mat-option>
                  <mat-option value="Tire Service">Tire Service</mat-option>
                  <mat-option value="Air Conditioning">Air Conditioning</mat-option>
                  <mat-option value="Diagnostics">Diagnostics</mat-option>
                  <mat-option value="Routine Service">Routine Service</mat-option>
                  <mat-option value="Glass Repair">Glass Repair</mat-option>
                  <mat-option value="Parts Shop">Parts Shop</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Vehicle Categories You Service</mat-label>
                <mat-select [(ngModel)]="selectedVehicleCategories" name="vehicleCategories" multiple required>
                  <mat-option value="Sedan">Sedan</mat-option>
                  <mat-option value="SUV">SUV</mat-option>
                  <mat-option value="Truck">Truck</mat-option>
                  <mat-option value="Bus">Bus</mat-option>
                  <mat-option value="Van">Van</mat-option>
                  <mat-option value="Motorcycle">Motorcycle</mat-option>
                  <mat-option value="Heavy Equipment">Heavy Equipment</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Operating Hours</mat-label>
                <mat-input [(ngModel)]="profile.operatingHours" name="operatingHours" 
                           placeholder="e.g., Mon-Fri: 8AM-5PM, Sat: 9AM-1PM"></mat-input>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Hourly Rate (Optional)</mat-label>
                <mat-input [(ngModel)]="profile.hourlyRate" name="hourlyRate" type="number" step="0.01"></mat-input>
                <span matPrefix>R&nbsp;</span>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Call-Out Fee (Optional)</mat-label>
                <mat-input [(ngModel)]="profile.callOutFee" name="callOutFee" type="number" step="0.01"></mat-input>
                <span matPrefix>R&nbsp;</span>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Service Radius (km)</mat-label>
                <mat-input [(ngModel)]="profile.serviceRadiusKm" name="serviceRadiusKm" type="number"></mat-input>
                <mat-hint>How far you'll travel for jobs</mat-hint>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>account_balance</mat-icon>
            <mat-card-title>Banking & Certifications</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-grid">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Bank Account Details</mat-label>
                <textarea matInput [(ngModel)]="profile.bankAccount" name="bankAccount" rows="2"
                          placeholder="Bank name, account number, branch code"></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Certifications & Licenses</mat-label>
                <textarea matInput [(ngModel)]="profile.certificationsLicenses" name="certificationsLicenses" rows="3"
                          placeholder="List all relevant certifications and licenses"></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Additional Notes</mat-label>
                <textarea matInput [(ngModel)]="profile.notes" name="notes" rows="3"></textarea>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <div class="form-actions">
          <button mat-raised-button type="button" routerLink="/profile-selection">
            Cancel
          </button>
          <button mat-raised-button color="primary" type="submit" [disabled]="!profileForm.valid || loading">
            <mat-icon>check_circle</mat-icon>
            Create Profile & Login
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .create-profile-page {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      text-align: center;
      margin-bottom: 30px;
    }

    .page-header h1 {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      margin: 10px 0;
    }

    .back-button {
      position: absolute;
      left: 20px;
      top: 20px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 40px;
    }

    mat-card {
      margin-bottom: 20px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 15px;
      margin-top: 15px;
    }

    .full-width {
      grid-column: 1 / -1;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }
  `]
})
export class CreateServiceProviderProfileComponent implements OnInit {
  profile: CreateServiceProviderProfile = {
    userId: '',
    businessName: '',
    registrationNumber: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    serviceTypes: '',
    vehicleCategories: '',
    operatingHours: '',
    hourlyRate: undefined,
    callOutFee: undefined,
    serviceRadiusKm: undefined,
    bankAccount: '',
    taxNumber: '',
    certificationsLicenses: '',
    notes: ''
  };

  email = '';
  password = '';
  phone = '';
  selectedServiceTypes: string[] = [];
  selectedVehicleCategories: string[] = [];
  loading = false;

  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {}

  async createProfile(): Promise<void> {
    this.loading = true;

    // First, create the user account
    try {
      const createUserResponse: any = await this.http.post(`${environment.apiUrl}/Identity/register`, {
        email: this.email,
        password: this.password,
        phone: this.phone,
        role: 'ServiceProvider'
      }).toPromise();

      this.profile.userId = createUserResponse.userId;
      this.profile.serviceTypes = this.selectedServiceTypes.join(', ');
      this.profile.vehicleCategories = this.selectedVehicleCategories.join(', ');

      // Then create the service provider profile
      await this.http.post(`${environment.apiUrl}/ServiceProviderProfiles`, this.profile).toPromise();

      this.snackBar.open('Profile created successfully! Logging you in...', 'Close', { duration: 3000 });

      // Auto-login
      const loginResponse: any = await this.http.post(`${environment.apiUrl}/Identity/login`, {
        email: this.email,
        password: this.password
      }).toPromise();

      localStorage.setItem('token', loginResponse.token);
      localStorage.setItem('userRole', loginResponse.role);
      localStorage.setItem('userId', loginResponse.userId);
      localStorage.setItem('user', JSON.stringify({
        userId: loginResponse.userId,
        email: this.email,
        role: loginResponse.role
      }));

      // Navigate to service provider dashboard
      this.router.navigate(['/service-provider-dashboard']);
    } catch (error: any) {
      console.error('Error creating profile:', error);
      this.snackBar.open(error.error?.message || 'Failed to create profile', 'Close', { duration: 5000 });
      this.loading = false;
    }
  }
}
