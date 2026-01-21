import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ServiceProviderService } from '../../services/service-provider.service';
import { UpdateServiceProvider } from '../../models/service-provider.model';

@Component({
  selector: 'app-service-provider-profile-edit',
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
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatSlideToggleModule
  ],
  template: `
    <div class="profile-edit-page">
      <div class="page-header">
        <button mat-raised-button (click)="goBack()" class="back-button">
          <mat-icon>arrow_back</mat-icon>
          Back to Dashboard
        </button>
        <h1><mat-icon>edit</mat-icon> Edit Business Profile</h1>
        <p>Update your business information and service offerings</p>
      </div>

      <div *ngIf="loading" class="loading-container">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        <p>Loading your profile...</p>
      </div>

      <form *ngIf="!loading" #profileForm="ngForm" (ngSubmit)="saveProfile()">
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>business</mat-icon>
            <mat-card-title>Business Information</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-grid">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Business Name</mat-label>
                <input matInput [(ngModel)]="profile.businessName" name="businessName" required>
                <mat-icon matSuffix>store</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Registration Number</mat-label>
                <input matInput [(ngModel)]="profile.registrationNumber" name="registrationNumber">
                <mat-icon matSuffix>badge</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Tax Number</mat-label>
                <input matInput [(ngModel)]="profile.taxNumber" name="taxNumber">
                <mat-icon matSuffix>receipt</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Business Address</mat-label>
                <textarea matInput [(ngModel)]="profile.address" name="address" rows="3"></textarea>
                <mat-icon matSuffix>location_on</mat-icon>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>contact_phone</mat-icon>
            <mat-card-title>Contact Information</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Contact Person</mat-label>
                <input matInput [(ngModel)]="profile.contactPerson" name="contactPerson" required>
                <mat-icon matSuffix>person</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Phone</mat-label>
                <input matInput [(ngModel)]="profile.phone" name="phone" type="tel" required>
                <mat-icon matSuffix>phone</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput [(ngModel)]="profile.email" name="email" type="email" required>
                <mat-icon matSuffix>email</mat-icon>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>build</mat-icon>
            <mat-card-title>Services Offered</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="services-section">
              <p class="section-description">Select all services your business provides</p>
              <div class="checkbox-grid">
                <mat-checkbox *ngFor="let service of availableServiceTypes"
                             [checked]="isServiceSelected(service)"
                             (change)="toggleService(service)">
                  {{ service }}
                </mat-checkbox>
              </div>
            </div>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Operating Hours</mat-label>
              <input matInput [(ngModel)]="profile.operatingHours" name="operatingHours" 
                     placeholder="e.g., Mon-Fri: 8AM-5PM, Sat: 9AM-1PM">
              <mat-icon matSuffix>schedule</mat-icon>
            </mat-form-field>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>directions_car</mat-icon>
            <mat-card-title>Vehicle Categories</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="services-section">
              <p class="section-description">Select vehicle types you can service</p>
              <div class="checkbox-grid">
                <mat-checkbox *ngFor="let category of availableVehicleCategories"
                             [checked]="isCategorySelected(category)"
                             (change)="toggleCategory(category)">
                  {{ category }}
                </mat-checkbox>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>attach_money</mat-icon>
            <mat-card-title>Pricing & Service Area</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Hourly Rate (R)</mat-label>
                <input matInput [(ngModel)]="profile.hourlyRate" name="hourlyRate" type="number" min="0" step="0.01">
                <mat-icon matSuffix>schedule</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Call Out Fee (R)</mat-label>
                <input matInput [(ngModel)]="profile.callOutFee" name="callOutFee" type="number" min="0" step="0.01">
                <mat-icon matSuffix>local_shipping</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Service Radius (km)</mat-label>
                <input matInput [(ngModel)]="profile.serviceRadiusKm" name="serviceRadiusKm" type="number" min="0">
                <mat-icon matSuffix>social_distance</mat-icon>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>account_balance</mat-icon>
            <mat-card-title>Banking Details</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Bank Account Number</mat-label>
              <input matInput [(ngModel)]="profile.bankAccount" name="bankAccount">
              <mat-icon matSuffix>account_balance_wallet</mat-icon>
            </mat-form-field>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>verified</mat-icon>
            <mat-card-title>Certifications & Additional Information</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Certifications & Licenses</mat-label>
              <textarea matInput [(ngModel)]="profile.certificationsLicenses" name="certifications" rows="3"
                        placeholder="List any relevant certifications, licenses, or qualifications"></textarea>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Additional Notes</mat-label>
              <textarea matInput [(ngModel)]="profile.notes" name="notes" rows="3"
                        placeholder="Any additional information about your services"></textarea>
            </mat-form-field>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>toggle_on</mat-icon>
            <mat-card-title>Availability</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="availability-section">
              <mat-slide-toggle [(ngModel)]="profile.isAvailable" name="isAvailable" color="primary">
                <strong>{{ profile.isAvailable ? 'Currently Available' : 'Currently Unavailable' }}</strong>
              </mat-slide-toggle>
              <p class="availability-hint">
                {{ profile.isAvailable 
                  ? 'Your business is visible to customers and can receive new job requests' 
                  : 'Your business is hidden from customers. No new job requests will be received.' }}
              </p>
            </div>
          </mat-card-content>
        </mat-card>

        <div class="form-actions">
          <button mat-button type="button" (click)="goBack()">
            <mat-icon>cancel</mat-icon>
            Cancel
          </button>
          <button mat-raised-button color="primary" type="submit" [disabled]="!profileForm.valid || saving">
            <mat-icon>{{ saving ? 'hourglass_empty' : 'save' }}</mat-icon>
            {{ saving ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .profile-edit-page {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 0 0.5rem 0;
      color: #1976d2;
    }

    .page-header p {
      margin: 0;
      color: #666;
    }

    .back-button {
      margin-bottom: 1rem;
    }

    .loading-container {
      text-align: center;
      padding: 4rem 2rem;
      color: #999;
    }

    .loading-container mat-progress-spinner {
      margin: 0 auto 1rem;
    }

    mat-card {
      margin-bottom: 1.5rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
    }

    .full-width {
      grid-column: 1 / -1;
    }

    .section-description {
      margin: 0 0 1rem 0;
      color: #666;
      font-size: 0.9rem;
    }

    .services-section {
      margin-bottom: 1.5rem;
    }

    .checkbox-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 0.5rem;
    }

    .availability-section {
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 8px;
    }

    .availability-hint {
      margin: 1rem 0 0 2.5rem;
      color: #666;
      font-size: 0.9rem;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1rem 0;
    }

    @media (max-width: 768px) {
      .profile-edit-page {
        padding: 1rem;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .checkbox-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ServiceProviderProfileEditComponent implements OnInit {
  profile: UpdateServiceProvider = {
    businessName: '',
    registrationNumber: '',
    contactPerson: '',
    phone: '',
    email: '',
    address: '',
    serviceTypes: '',
    vehicleCategories: '',
    operatingHours: '',
    isActive: true,
    isAvailable: true,
    hourlyRate: 0,
    callOutFee: 0,
    serviceRadiusKm: 50,
    bankAccount: '',
    taxNumber: '',
    certificationsLicenses: '',
    notes: ''
  };

  availableServiceTypes = [
    'Mechanical',
    'Electrical',
    'Bodywork',
    'Painting',
    'Towing',
    'Tire Service',
    'Air Conditioning',
    'Diagnostics',
    'Routine Service',
    'Glass Repair',
    'Tracking Device Installation',
    'Roadside Assistance'
  ];

  availableVehicleCategories = [
    'Sedan',
    'SUV',
    'Truck',
    'Minibus Taxi',
    'Van',
    'Motorcycle',
    'Bus',
    'Heavy Duty'
  ];

  selectedServiceTypes: string[] = [];
  selectedVehicleCategories: string[] = [];

  loading = false;
  saving = false;

  constructor(
    private serviceProviderService: ServiceProviderService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading = true;
    this.serviceProviderService.getMyProfile().subscribe({
      next: (data) => {
        this.profile = {
          businessName: data.businessName,
          registrationNumber: data.registrationNumber,
          contactPerson: data.contactPerson,
          phone: data.phone,
          email: data.email,
          address: data.address,
          serviceTypes: data.serviceTypes,
          vehicleCategories: data.vehicleCategories,
          operatingHours: data.operatingHours,
          isActive: data.isActive,
          isAvailable: data.isAvailable,
          hourlyRate: data.hourlyRate,
          callOutFee: data.callOutFee,
          serviceRadiusKm: data.serviceRadiusKm,
          bankAccount: data.bankAccount,
          taxNumber: data.taxNumber,
          certificationsLicenses: data.certificationsLicenses,
          notes: data.notes
        };
        this.selectedServiceTypes = data.serviceTypes ? data.serviceTypes.split(',').map(s => s.trim()) : [];
        this.selectedVehicleCategories = data.vehicleCategories ? data.vehicleCategories.split(',').map(s => s.trim()) : [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        this.snackBar.open('Failed to load profile. Please try again.', 'Close', { duration: 5000 });
        this.loading = false;
      }
    });
  }

  isServiceSelected(service: string): boolean {
    return this.selectedServiceTypes.includes(service);
  }

  toggleService(service: string): void {
    const index = this.selectedServiceTypes.indexOf(service);
    if (index > -1) {
      this.selectedServiceTypes.splice(index, 1);
    } else {
      this.selectedServiceTypes.push(service);
    }
  }

  isCategorySelected(category: string): boolean {
    return this.selectedVehicleCategories.includes(category);
  }

  toggleCategory(category: string): void {
    const index = this.selectedVehicleCategories.indexOf(category);
    if (index > -1) {
      this.selectedVehicleCategories.splice(index, 1);
    } else {
      this.selectedVehicleCategories.push(category);
    }
  }

  saveProfile(): void {
    // Convert arrays to comma-separated strings
    this.profile.serviceTypes = this.selectedServiceTypes.join(', ');
    this.profile.vehicleCategories = this.selectedVehicleCategories.join(', ');

    this.saving = true;

    this.serviceProviderService.updateMyProfile(this.profile).subscribe({
      next: () => {
        this.snackBar.open('Profile updated successfully!', 'Close', { 
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        this.saving = false;
        this.router.navigate(['/service-provider-dashboard']);
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.snackBar.open(error.error?.message || 'Failed to update profile. Please try again.', 'Close', { 
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        this.saving = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/service-provider-dashboard']);
  }
}
