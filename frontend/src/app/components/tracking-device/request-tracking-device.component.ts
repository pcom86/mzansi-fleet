import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTableModule } from '@angular/material/table';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTabsModule } from '@angular/material/tabs';
import { TrackingDeviceService } from '../../services/tracking-device.service';
import { VehicleService } from '../../services/vehicle.service';
import { TrackingDeviceRequest } from '../../models/tracking-device.model';
import { Vehicle } from '../../models/vehicle.model';
import { TrackMyFleetComponent } from './track-my-fleet.component';

@Component({
  selector: 'app-request-tracking-device',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTableModule,
    MatBadgeModule,
    MatSnackBarModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTabsModule,
    TrackMyFleetComponent
  ],
  template: `
    <div class="tracking-device-container">
      <div class="page-header">
        <h1><mat-icon>gps_fixed</mat-icon> Tracking Device Management</h1>
        <p>Manage tracking device installations and monitor your fleet</p>
      </div>

      <mat-tab-group class="tracking-tabs">
        <mat-tab label="Track My Fleet">
          <app-track-my-fleet></app-track-my-fleet>
        </mat-tab>

        <mat-tab label="Request Installation">
          <div class="tab-content">
            <div class="content-grid">
        <!-- Request Form -->
        <mat-card class="request-form-card">
          <mat-card-header>
            <mat-card-title>Request Installation</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form (ngSubmit)="submitRequest()" #requestForm="ngForm">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Select Vehicle</mat-label>
                <mat-select [(ngModel)]="selectedVehicleId" name="vehicleId" required>
                  <mat-option *ngFor="let vehicle of vehicles" [value]="vehicle.id">
                    {{ vehicle.registration }} - {{ vehicle.make }} {{ vehicle.model }} ({{ vehicle.year }})
                  </mat-option>
                </mat-select>
                <mat-icon matPrefix>directions_car</mat-icon>
                <mat-hint *ngIf="vehicles.length === 0">No vehicles available</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Installation Location</mat-label>
                <input matInput [(ngModel)]="installationLocation" name="location" 
                       placeholder="e.g., Johannesburg, Sandton" required>
                <mat-icon matPrefix>location_on</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Preferred Installation Date</mat-label>
                <input matInput [matDatepicker]="picker" [(ngModel)]="preferredDate" name="date" 
                       placeholder="Select date" required>
                <mat-icon matPrefix>calendar_today</mat-icon>
                <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
                <mat-datepicker #picker></mat-datepicker>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Required Device Features</mat-label>
                <textarea matInput [(ngModel)]="deviceFeatures" name="features" rows="3"
                          placeholder="e.g., Real-time GPS tracking, Geofencing, Speed alerts, Engine immobilizer" required></textarea>
                <mat-icon matPrefix>settings</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Special Requirements (Optional)</mat-label>
                <textarea matInput [(ngModel)]="specialRequirements" name="requirements" rows="2"
                          placeholder="Any special installation needs or preferences"></textarea>
                <mat-icon matPrefix>notes</mat-icon>
              </mat-form-field>

              <div class="budget-fields">
                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Minimum Budget (R)</mat-label>
                  <input matInput type="number" [(ngModel)]="budgetMin" name="budgetMin" 
                         placeholder="0" min="0">
                  <mat-icon matPrefix>attach_money</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" class="half-width">
                  <mat-label>Maximum Budget (R)</mat-label>
                  <input matInput type="number" [(ngModel)]="budgetMax" name="budgetMax" 
                         placeholder="0" min="0">
                  <mat-icon matPrefix>attach_money</mat-icon>
                </mat-form-field>
              </div>

              <div class="form-actions">
                <button mat-raised-button color="primary" type="submit" 
                        [disabled]="!requestForm.valid || submitting">
                  <mat-icon>send</mat-icon>
                  {{ submitting ? 'Submitting...' : 'Submit Request' }}
                </button>
                <button mat-button type="button" (click)="resetForm()">
                  <mat-icon>refresh</mat-icon>
                  Reset
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>

        <!-- My Requests List -->
        <mat-card class="requests-list-card">
          <mat-card-header>
            <mat-card-title>My Requests</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="loading" class="loading">
              <mat-icon class="spinning">refresh</mat-icon>
              <p>Loading requests...</p>
            </div>

            <div *ngIf="!loading && myRequests.length === 0" class="empty-state">
              <mat-icon>inbox</mat-icon>
              <p>No requests yet</p>
              <p class="hint">Submit a request to get started</p>
            </div>

            <div *ngIf="!loading && myRequests.length > 0" class="requests-list">
              <div *ngFor="let request of myRequests" class="request-item" 
                   [class.has-offers]="request.offerCount > 0"
                   (click)="viewOffers(request)">
                <div class="request-header">
                  <div class="vehicle-info">
                    <mat-icon>directions_car</mat-icon>
                    <strong>{{ request.vehicleRegistration }}</strong>
                    <span class="vehicle-details">{{ request.vehicleMake }} {{ request.vehicleModel }}</span>
                  </div>
                  <mat-chip [class]="'status-' + request.status.toLowerCase()">
                    {{ request.status }}
                  </mat-chip>
                </div>
                <div class="request-details">
                  <p><mat-icon>location_on</mat-icon> {{ request.installationLocation }}</p>
                  <p><mat-icon>calendar_today</mat-icon> {{ request.preferredInstallationDate }}</p>
                  <p class="features"><mat-icon>settings</mat-icon> {{ request.deviceFeatures }}</p>
                </div>
                <div class="request-footer">
                  <span class="date">{{ formatDate(request.createdAt) }}</span>
                  <div class="actions">
                    <button mat-button color="primary" *ngIf="request.offerCount > 0" 
                            (click)="viewOffers(request); $event.stopPropagation()">
                      <mat-icon [matBadge]="request.offerCount" matBadgeColor="warn">local_offer</mat-icon>
                      View {{ request.offerCount }} Offer(s)
                    </button>
                    <button mat-icon-button color="warn" (click)="deleteRequest(request.id); $event.stopPropagation()"
                            *ngIf="request.status === 'Open' || request.status === 'OfferReceived'">
                      <mat-icon>delete</mat-icon>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .tracking-device-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 1.5rem;
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

    .tracking-tabs {
      margin-top: 1rem;
    }

    .tab-content {
      padding: 1.5rem 0;
    }

    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
    }

    @media (max-width: 968px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
    }

    mat-card {
      height: fit-content;
    }

    .full-width {
      width: 100%;
      margin-bottom: 1rem;
    }

    .budget-fields {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .half-width {
      flex: 1;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 1rem;
    }

    .loading, .empty-state {
      text-align: center;
      padding: 3rem;
      color: #999;
    }

    .loading mat-icon, .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 1rem;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .requests-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .request-item {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 1rem;
      cursor: pointer;
      transition: all 0.2s;
    }

    .request-item:hover {
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
      border-color: #1976d2;
    }

    .request-item.has-offers {
      border-left: 4px solid #4caf50;
    }

    .request-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .vehicle-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .vehicle-details {
      color: #666;
      font-size: 0.9rem;
    }

    .request-details {
      margin: 0.75rem 0;
    }

    .request-details p {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0.5rem 0;
      font-size: 0.9rem;
      color: #555;
    }

    .request-details mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #1976d2;
    }

    .features {
      color: #777 !important;
      font-style: italic;
    }

    .request-footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid #f0f0f0;
    }

    .date {
      font-size: 0.85rem;
      color: #999;
    }

    .actions {
      display: flex;
      gap: 0.5rem;
    }

    mat-chip {
      font-size: 0.75rem;
      min-height: 24px;
      padding: 0 8px;
    }

    .status-open {
      background: #e3f2fd;
      color: #1976d2;
    }

    .status-offerreceived {
      background: #fff3e0;
      color: #f57c00;
    }

    .status-accepted {
      background: #e8f5e9;
      color: #388e3c;
    }

    .status-scheduled {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .status-completed {
      background: #e0e0e0;
      color: #616161;
    }

    .hint {
      font-size: 0.9rem;
    }
  `]
})
export class RequestTrackingDeviceComponent implements OnInit {
  vehicles: Vehicle[] = [];
  myRequests: TrackingDeviceRequest[] = [];
  
  selectedVehicleId: string = '';
  installationLocation: string = '';
  preferredDate: Date | null = null;
  deviceFeatures: string = '';
  specialRequirements: string = '';
  budgetMin?: number;
  budgetMax?: number;
  
  loading = false;
  submitting = false;

  constructor(
    private trackingService: TrackingDeviceService,
    private vehicleService: VehicleService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadVehicles();
    this.loadMyRequests();
  }

  loadVehicles() {
    this.vehicleService.getAll().subscribe({
      next: (vehicles: Vehicle[]) => {
        this.vehicles = vehicles;
      },
      error: (error: any) => {
        console.error('Error loading vehicles:', error);
        this.snackBar.open('Failed to load vehicles', 'Close', { duration: 3000 });
      }
    });
  }

  loadMyRequests() {
    this.loading = true;
    this.trackingService.getMyRequests().subscribe({
      next: (requests) => {
        this.myRequests = requests;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading requests:', error);
        this.loading = false;
        this.snackBar.open('Failed to load requests', 'Close', { duration: 3000 });
      }
    });
  }

  submitRequest() {
    if (this.submitting) return;

    this.submitting = true;
    const request = {
      vehicleId: this.selectedVehicleId,
      installationLocation: this.installationLocation,
      preferredInstallationDate: this.preferredDate ? this.preferredDate.toISOString().split('T')[0] : '',
      deviceFeatures: this.deviceFeatures,
      specialRequirements: this.specialRequirements || '',
      budgetMin: this.budgetMin,
      budgetMax: this.budgetMax
    };

    this.trackingService.createRequest(request).subscribe({
      next: (response) => {
        this.snackBar.open('Request submitted successfully!', 'Close', { duration: 3000 });
        this.resetForm();
        this.loadMyRequests();
        this.submitting = false;
      },
      error: (error) => {
        console.error('Error submitting request:', error);
        this.snackBar.open('Failed to submit request', 'Close', { duration: 3000 });
        this.submitting = false;
      }
    });
  }

  resetForm() {
    this.selectedVehicleId = '';
    this.installationLocation = '';
    this.preferredDate = null;
    this.deviceFeatures = '';
    this.specialRequirements = '';
    this.budgetMin = undefined;
    this.budgetMax = undefined;
  }

  viewOffers(request: TrackingDeviceRequest) {
    this.router.navigate(['/owner-dashboard/tracking-offers', request.id]);
  }

  deleteRequest(requestId: string) {
    if (confirm('Are you sure you want to delete this request?')) {
      this.trackingService.deleteRequest(requestId).subscribe({
        next: () => {
          this.snackBar.open('Request deleted successfully', 'Close', { duration: 3000 });
          this.loadMyRequests();
        },
        error: (error) => {
          console.error('Error deleting request:', error);
          this.snackBar.open('Failed to delete request', 'Close', { duration: 3000 });
        }
      });
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
