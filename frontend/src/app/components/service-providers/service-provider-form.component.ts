import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, ActivatedRoute } from '@angular/router';
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
import { ServiceProviderService } from '../../services/service-provider.service';
import { CreateServiceProvider, UpdateServiceProvider, ServiceProvider } from '../../models/service-provider.model';

@Component({
  selector: 'app-service-provider-form',
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
    MatSnackBarModule
  ],
  template: `
    <div class="service-provider-form-page">
      <div class="page-header">
        <button mat-raised-button routerLink="/service-providers" class="back-button">
          <mat-icon>arrow_back</mat-icon>
          Back to List
        </button>
        <h1>{{ isEditMode ? 'Edit' : 'Add' }} Service Provider</h1>
      </div>

      <div *ngIf="loading" class="loading-container">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        <p>{{ isEditMode ? 'Loading provider details...' : 'Processing...' }}</p>
      </div>

      <form *ngIf="!loading" #providerForm="ngForm" (ngSubmit)="saveProvider()">
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>business</mat-icon>
            <mat-card-title>Business Information</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="form-grid">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Business Name</mat-label>
                <input matInput [(ngModel)]="provider.businessName" name="businessName" required>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Registration Number</mat-label>
                <input matInput [(ngModel)]="provider.registrationNumber" name="registrationNumber">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Tax Number</mat-label>
                <input matInput [(ngModel)]="provider.taxNumber" name="taxNumber">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Business Address</mat-label>
                <textarea matInput [(ngModel)]="provider.address" name="address" rows="3"></textarea>
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
                <input matInput [(ngModel)]="provider.contactPerson" name="contactPerson" required>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Phone</mat-label>
                <input matInput [(ngModel)]="provider.phone" name="phone" type="tel" required>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Email</mat-label>
                <input matInput [(ngModel)]="provider.email" name="email" type="email" required>
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
                <input matInput [(ngModel)]="provider.operatingHours" name="operatingHours" 
                           placeholder="e.g., Mon-Fri: 8AM-5PM, Sat: 9AM-1PM">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Hourly Rate (Optional)</mat-label>
                <input matInput [(ngModel)]="provider.hourlyRate" name="hourlyRate" type="number" step="0.01">
                <span matPrefix>R&nbsp;</span>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Call-Out Fee (Optional)</mat-label>
                <input matInput [(ngModel)]="provider.callOutFee" name="callOutFee" type="number" step="0.01">
                <span matPrefix>R&nbsp;</span>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Service Radius (km)</mat-label>
                <input matInput [(ngModel)]="provider.serviceRadiusKm" name="serviceRadiusKm" type="number">
                <mat-hint>How far the provider will travel</mat-hint>
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
                <textarea matInput [(ngModel)]="provider.bankAccount" name="bankAccount" rows="2"
                          placeholder="Bank name, account number, branch code"></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Certifications & Licenses</mat-label>
                <textarea matInput [(ngModel)]="provider.certificationsLicenses" name="certificationsLicenses" rows="3"
                          placeholder="List all relevant certifications and licenses"></textarea>
              </mat-form-field>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>note</mat-icon>
            <mat-card-title>Additional Information</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Notes</mat-label>
              <textarea matInput [(ngModel)]="provider.notes" name="notes" rows="4"
                        placeholder="Any additional information about this provider"></textarea>
            </mat-form-field>

            <mat-checkbox *ngIf="isEditMode" [(ngModel)]="providerIsActive" name="isActive">
              Provider is Active
            </mat-checkbox>
          </mat-card-content>
        </mat-card>

        <div class="form-actions">
          <button mat-raised-button type="button" routerLink="/service-providers">
            Cancel
          </button>
          <button mat-raised-button color="primary" type="submit" [disabled]="!providerForm.valid || saving">
            <mat-icon>{{ saving ? 'hourglass_empty' : 'save' }}</mat-icon>
            {{ saving ? 'Saving...' : (isEditMode ? 'Update Provider' : 'Create Provider') }}
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    .service-provider-form-page {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 20px;
    }

    .page-header h1 {
      margin: 0;
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

    .full-width {
      grid-column: 1 / -1;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 20px;
    }

    mat-checkbox {
      margin-top: 10px;
    }
  `]
})
export class ServiceProviderFormComponent implements OnInit {
  provider: CreateServiceProvider | UpdateServiceProvider = {
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

  selectedServiceTypes: string[] = [];
  selectedVehicleCategories: string[] = [];
  providerIsActive = true;
  isEditMode = false;
  providerId?: string;
  loading = false;
  saving = false;

  constructor(
    private serviceProviderService: ServiceProviderService,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.providerId = params['id'];
      this.isEditMode = !!this.providerId;

      if (this.isEditMode && this.providerId) {
        this.loadProvider(this.providerId);
      }
    });
  }

  loadProvider(id: string): void {
    this.loading = true;
    this.serviceProviderService.getById(id).subscribe({
      next: (data) => {
        this.provider = {
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
          hourlyRate: data.hourlyRate,
          callOutFee: data.callOutFee,
          serviceRadiusKm: data.serviceRadiusKm,
          bankAccount: data.bankAccount,
          taxNumber: data.taxNumber,
          certificationsLicenses: data.certificationsLicenses,
          notes: data.notes
        };
        this.providerIsActive = data.isActive;
        this.selectedServiceTypes = data.serviceTypes ? data.serviceTypes.split(',').map(s => s.trim()) : [];
        this.selectedVehicleCategories = data.vehicleCategories ? data.vehicleCategories.split(',').map(s => s.trim()) : [];
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading provider:', error);
        this.snackBar.open('Failed to load provider details', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  saveProvider(): void {
    // Convert arrays to comma-separated strings
    this.provider.serviceTypes = this.selectedServiceTypes.join(', ');
    this.provider.vehicleCategories = this.selectedVehicleCategories.join(', ');

    if (this.isEditMode) {
      (this.provider as UpdateServiceProvider).isActive = this.providerIsActive;
    }

    this.saving = true;

    if (this.isEditMode && this.providerId) {
      this.serviceProviderService.update(this.providerId, this.provider as UpdateServiceProvider).subscribe({
        next: () => {
          this.snackBar.open('Service provider updated successfully', 'Close', { duration: 3000 });
          this.router.navigate(['/service-providers']);
        },
        error: (error) => {
          console.error('Error updating provider:', error);
          this.snackBar.open('Failed to update provider', 'Close', { duration: 3000 });
          this.saving = false;
        }
      });
    } else {
      this.serviceProviderService.create(this.provider as CreateServiceProvider).subscribe({
        next: () => {
          this.snackBar.open('Service provider created successfully', 'Close', { duration: 3000 });
          this.router.navigate(['/service-providers']);
        },
        error: (error) => {
          console.error('Error creating provider:', error);
          this.snackBar.open('Failed to create provider', 'Close', { duration: 3000 });
          this.saving = false;
        }
      });
    }
  }
}
