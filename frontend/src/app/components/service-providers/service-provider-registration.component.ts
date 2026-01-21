import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { AuthService } from '../../services/auth.service';
import { MzansiFleetLogoComponent } from '../shared/mzansi-fleet-logo.component';

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

@Component({
  selector: 'app-service-provider-registration',
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
    MatSnackBarModule,
    MzansiFleetLogoComponent
  ],
  template: `
    <div class="registration-page">
      <div class="registration-header">
        <app-mzansi-fleet-logo class="logo"></app-mzansi-fleet-logo>
        <h1>Service Provider Registration</h1>
        <p>Join Mzansi Fleet as a service provider</p>
      </div>

      <div *ngIf="registering" class="loading-container">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        <p>Creating your account...</p>
      </div>

      <form *ngIf="!registering" #registrationForm="ngForm" (ngSubmit)="register()">
        <!-- Account Information -->
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>account_circle</mat-icon>
            <mat-card-title>Account Information</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-grid">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Email Address</mat-label>
                <input matInput [(ngModel)]="registration.email" name="email" type="email" required>
                <mat-hint>This will be your login email</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Password</mat-label>
                <input matInput [(ngModel)]="registration.password" name="password" 
                       [type]="hidePassword ? 'password' : 'text'" required minlength="6">
                <button mat-icon-button matSuffix (click)="hidePassword = !hidePassword" type="button">
                  <mat-icon>{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                <mat-hint>Minimum 6 characters</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Confirm Password</mat-label>
                <input matInput [(ngModel)]="confirmPassword" name="confirmPassword" 
                       [type]="hidePassword ? 'password' : 'text'" required>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Phone Number</mat-label>
                <input matInput [(ngModel)]="registration.phone" name="phone" type="tel" required>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Business Information -->
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>business</mat-icon>
            <mat-card-title>Business Information</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-grid">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Business Name</mat-label>
                <input matInput [(ngModel)]="registration.businessName" name="businessName" required>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Registration Number</mat-label>
                <input matInput [(ngModel)]="registration.registrationNumber" name="registrationNumber">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Tax Number</mat-label>
                <input matInput [(ngModel)]="registration.taxNumber" name="taxNumber">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Business Address</mat-label>
                <textarea matInput [(ngModel)]="registration.address" name="address" rows="3"></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Contact Person</mat-label>
                <input matInput [(ngModel)]="registration.contactPerson" name="contactPerson" required>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Service Details -->
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
                  <mat-option value="Tracking Device Installation">Tracking Device Installation</mat-option>
                  <mat-option value="Roadside Assistance">Roadside Assistance</mat-option>
                </mat-select>
                <mat-hint>Select all applicable service types</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Vehicle Categories</mat-label>
                <mat-select [(ngModel)]="selectedVehicleCategories" name="vehicleCategories" multiple required>
                  <mat-option value="Sedan">Sedan</mat-option>
                  <mat-option value="SUV">SUV</mat-option>
                  <mat-option value="Truck">Truck</mat-option>
                  <mat-option value="Bus">Bus</mat-option>
                  <mat-option value="Van">Van</mat-option>
                  <mat-option value="Motorcycle">Motorcycle</mat-option>
                  <mat-option value="Heavy Equipment">Heavy Equipment</mat-option>
                </mat-select>
                <mat-hint>Select vehicle types serviced</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Operating Hours</mat-label>
                <input matInput [(ngModel)]="registration.operatingHours" name="operatingHours" 
                       placeholder="e.g., Mon-Fri: 8AM-5PM, Sat: 9AM-1PM">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Hourly Rate (Optional)</mat-label>
                <input matInput [(ngModel)]="registration.hourlyRate" name="hourlyRate" type="number" step="0.01">
                <span matPrefix>R&nbsp;</span>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Call-Out Fee (Optional)</mat-label>
                <input matInput [(ngModel)]="registration.callOutFee" name="callOutFee" type="number" step="0.01">
                <span matPrefix>R&nbsp;</span>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Service Radius (km)</mat-label>
                <input matInput [(ngModel)]="registration.serviceRadiusKm" name="serviceRadiusKm" type="number">
                <mat-hint>How far you will travel</mat-hint>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Banking & Certifications -->
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>account_balance</mat-icon>
            <mat-card-title>Banking & Certifications</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-grid">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Bank Account Details (Optional)</mat-label>
                <textarea matInput [(ngModel)]="registration.bankAccount" name="bankAccount" rows="2"
                          placeholder="Bank name, account number, branch code"></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Certifications & Licenses (Optional)</mat-label>
                <textarea matInput [(ngModel)]="registration.certificationsLicenses" name="certificationsLicenses" rows="3"
                          placeholder="List all relevant certifications and licenses"></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Additional Notes (Optional)</mat-label>
                <textarea matInput [(ngModel)]="registration.notes" name="notes" rows="4"
                          placeholder="Any additional information"></textarea>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <div class="form-actions">
          <button mat-raised-button type="button" routerLink="/login">
            <mat-icon>arrow_back</mat-icon>
            Back to Login
          </button>
          <button mat-raised-button color="primary" type="submit" 
                  [disabled]="!registrationForm.valid || !passwordsMatch() || registering">
            <mat-icon>{{registering ? 'hourglass_empty' : 'how_to_reg'}}</mat-icon>
            {{registering ? 'Registering...' : 'Register'}}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .registration-page {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .registration-header {
      text-align: center;
      margin-bottom: 30px;
    }

    .registration-header h1 {
      margin: 0 0 10px 0;
      color: #3f51b5;
    }

    .registration-header p {
      margin: 0;
      color: #666;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
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

    .registration-header .logo {
      display: block;
      margin: 0 auto 1.5rem auto;
      width: fit-content;
    }

    .full-width {
      grid-column: 1 / -1;
    }

    .form-actions {
      display: flex;
      justify-content: space-between;
      gap: 10px;
      margin-top: 20px;
    }
  `]
})
export class ServiceProviderRegistrationComponent {
  registration: RegisterServiceProviderDto = {
    tenantId: '', // Will be set from environment or selection
    email: '',
    password: '',
    phone: '',
    businessName: '',
    registrationNumber: '',
    contactPerson: '',
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

  confirmPassword = '';
  hidePassword = true;
  selectedServiceTypes: string[] = [];
  selectedVehicleCategories: string[] = [];
  registering = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    // Get default tenant ID from localStorage or use default
    const defaultTenantId = localStorage.getItem('defaultTenantId');
    if (defaultTenantId) {
      this.registration.tenantId = defaultTenantId;
    } else {
      // Use default tenant GUID for public registration
      this.registration.tenantId = '00000000-0000-0000-0000-000000000001';
    }
  }

  passwordsMatch(): boolean {
    return this.registration.password === this.confirmPassword;
  }

  register(): void {
    if (!this.passwordsMatch()) {
      this.snackBar.open('Passwords do not match', 'Close', { duration: 3000 });
      return;
    }

    // Convert arrays to comma-separated strings
    this.registration.serviceTypes = this.selectedServiceTypes.join(', ');
    this.registration.vehicleCategories = this.selectedVehicleCategories.join(', ');

    // If no tenantId is set, you may need to prompt user or use a default
    if (!this.registration.tenantId) {
      this.snackBar.open('Please contact support for a tenant ID', 'Close', { duration: 5000 });
      return;
    }

    this.registering = true;

    this.authService.registerServiceProvider(this.registration).subscribe({
      next: (response) => {
        this.snackBar.open('Registration successful! You can now log in.', 'Close', { duration: 5000 });
        // Optionally auto-login
        setTimeout(() => {
          this.router.navigate(['/login'], { 
            queryParams: { email: this.registration.email } 
          });
        }, 2000);
      },
      error: (error) => {
        console.error('Registration error:', error);
        let errorMessage = 'Registration failed. Please try again.';
        
        if (error.error?.error) {
          errorMessage = error.error.error;
        } else if (error.status === 409) {
          errorMessage = 'This email is already registered.';
        }
        
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        this.registering = false;
      }
    });
  }
}
