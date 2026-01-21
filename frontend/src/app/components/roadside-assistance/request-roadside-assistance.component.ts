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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RoadsideAssistanceService } from '../../services/roadside-assistance.service';
import { VehicleService } from '../../services/vehicle.service';
import { Vehicle } from '../../models/vehicle.model';
import { 
  RoadsideAssistanceRequest,
  ASSISTANCE_TYPES,
  ASSISTANCE_PRIORITIES
} from '../../models/roadside-assistance.model';

@Component({
  selector: 'app-request-roadside-assistance',
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
    MatSnackBarModule
  ],
  template: `
    <div class="roadside-container">
      <div class="page-header">
        <h1><mat-icon>local_shipping</mat-icon> Roadside Assistance</h1>
        <p>Request emergency roadside or towing assistance</p>
      </div>

      <div class="content-grid">
        <!-- Request Form -->
        <mat-card class="request-card">
          <mat-card-header>
            <mat-card-title>Request Assistance</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <form (ngSubmit)="submitRequest()" #form="ngForm">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Assistance Type</mat-label>
                <mat-select [(ngModel)]="assistanceType" name="type" required>
                  <mat-option *ngFor="let type of assistanceTypes" [value]="type">
                    {{ type }}
                  </mat-option>
                </mat-select>
                <mat-icon matPrefix>build</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Select Vehicle (Optional)</mat-label>
                <mat-select [(ngModel)]="vehicleId" name="vehicle">
                  <mat-option [value]="null">No Vehicle</mat-option>
                  <mat-option *ngFor="let vehicle of vehicles" [value]="vehicle.id">
                    {{ vehicle.registration }} - {{ vehicle.make }} {{ vehicle.model }}
                  </mat-option>
                </mat-select>
                <mat-icon matPrefix>directions_car</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Current Location</mat-label>
                <input matInput [(ngModel)]="location" name="location" 
                       placeholder="e.g., N1 Highway, near Sandton" required>
                <mat-icon matPrefix>location_on</mat-icon>
                <button mat-icon-button matSuffix type="button" 
                        (click)="getCurrentLocation()" matTooltip="Use current location">
                  <mat-icon>my_location</mat-icon>
                </button>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Issue Description</mat-label>
                <textarea matInput [(ngModel)]="issueDescription" name="issue" 
                          rows="3" placeholder="Describe the problem" required></textarea>
                <mat-icon matPrefix>description</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Additional Notes (Optional)</mat-label>
                <textarea matInput [(ngModel)]="additionalNotes" name="notes" 
                          rows="2" placeholder="Any special requirements"></textarea>
                <mat-icon matPrefix>notes</mat-icon>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Priority</mat-label>
                <mat-select [(ngModel)]="priority" name="priority" required>
                  <mat-option *ngFor="let p of priorities" [value]="p">
                    {{ p }}
                  </mat-option>
                </mat-select>
                <mat-icon matPrefix>priority_high</mat-icon>
              </mat-form-field>

              <div class="form-actions">
                <button mat-raised-button color="warn" type="submit" 
                        [disabled]="!form.valid || submitting">
                  <mat-icon>sos</mat-icon>
                  {{ submitting ? 'Requesting...' : 'Request Assistance' }}
                </button>
                <button mat-button type="button" (click)="resetForm()">
                  <mat-icon>refresh</mat-icon>
                  Reset
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>

        <!-- My Requests -->
        <mat-card class="requests-card">
          <mat-card-header>
            <mat-card-title>My Requests</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="loading" class="loading">
              <mat-icon class="spinning">refresh</mat-icon>
              <p>Loading...</p>
            </div>

            <div *ngIf="!loading && requests.length === 0" class="empty-state">
              <mat-icon>inbox</mat-icon>
              <p>No requests yet</p>
            </div>

            <div *ngIf="!loading && requests.length > 0" class="requests-list">
              <div *ngFor="let request of requests" class="request-item"
                   [class.emergency]="request.priority === 'Emergency'">
                <div class="request-header">
                  <mat-chip [class]="'status-' + request.status.toLowerCase()">
                    {{ request.status }}
                  </mat-chip>
                  <mat-chip *ngIf="request.priority !== 'Normal'" 
                            [class]="'priority-' + request.priority.toLowerCase()">
                    {{ request.priority }}
                  </mat-chip>
                </div>
                <div class="request-details">
                  <h3>{{ request.assistanceType }}</h3>
                  <p><mat-icon>location_on</mat-icon> {{ request.location }}</p>
                  <p><mat-icon>description</mat-icon> {{ request.issueDescription }}</p>
                  <p *ngIf="request.vehicleRegistration" class="vehicle">
                    <mat-icon>directions_car</mat-icon>
                    {{ request.vehicleRegistration }} - {{ request.vehicleMake }} {{ request.vehicleModel }}
                  </p>
                  <div *ngIf="request.status === 'Assigned' || request.status === 'InProgress'" class="provider-info">
                    <p><strong>Service Provider:</strong> {{ request.serviceProviderName }}</p>
                    <p *ngIf="request.serviceProviderRating">
                      <mat-icon>star</mat-icon>
                      <strong>{{ request.serviceProviderRating.toFixed(1) }}</strong>
                      <span class="reviews">({{ request.serviceProviderReviews }} reviews)</span>
                    </p>
                    <p *ngIf="request.technicianName"><strong>Technician:</strong> {{ request.technicianName }}</p>
                    <p *ngIf="request.estimatedArrivalTime"><strong>ETA:</strong> {{ request.estimatedArrivalTime }}</p>
                    <p *ngIf="request.serviceProviderPhone"><mat-icon>phone</mat-icon> {{ request.serviceProviderPhone }}</p>
                  </div>
                </div>
                <div class="request-footer">
                  <span class="date">{{ formatDate(request.requestedAt) }}</span>
                  <button mat-icon-button color="warn" (click)="deleteRequest(request.id)"
                          *ngIf="request.status === 'Pending'">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .roadside-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 0 0.5rem 0;
      color: #d32f2f;
    }

    .page-header p {
      margin: 0;
      color: #666;
    }

    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin-top: 2rem;
    }

    @media (max-width: 968px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
    }

    .full-width {
      width: 100%;
      margin-bottom: 1rem;
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
    }

    .request-item.emergency {
      border-left: 4px solid #d32f2f;
      background: #ffebee;
    }

    .request-header {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 0.75rem;
    }

    .request-details h3 {
      margin: 0 0 0.5rem 0;
      color: #333;
    }

    .request-details p {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0.5rem 0;
      font-size: 0.9rem;
    }

    .request-details mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #666;
    }

    .provider-info {
      background: #e8f5e9;
      padding: 0.75rem;
      border-radius: 4px;
      margin-top: 0.75rem;
    }

    .provider-info p {
      margin: 0.25rem 0;
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

    .reviews {
      color: #999;
      font-size: 0.85rem;
      margin-left: 0.25rem;
    }

    mat-chip {
      font-size: 0.75rem;
      min-height: 24px;
    }

    .status-pending {
      background: #fff3e0;
      color: #f57c00;
    }

    .status-assigned {
      background: #e3f2fd;
      color: #1976d2;
    }

    .status-inprogress {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .status-completed {
      background: #e8f5e9;
      color: #388e3c;
    }

    .status-cancelled {
      background: #e0e0e0;
      color: #616161;
    }

    .priority-high {
      background: #ffe0b2;
      color: #e65100;
    }

    .priority-emergency {
      background: #ffcdd2;
      color: #c62828;
    }
  `]
})
export class RequestRoadsideAssistanceComponent implements OnInit {
  vehicles: Vehicle[] = [];
  requests: RoadsideAssistanceRequest[] = [];
  
  vehicleId: string | null = null;
  assistanceType: string = '';
  location: string = '';
  latitude?: string;
  longitude?: string;
  issueDescription: string = '';
  additionalNotes: string = '';
  priority: string = 'Normal';
  
  assistanceTypes = ASSISTANCE_TYPES;
  priorities = ASSISTANCE_PRIORITIES;
  
  loading = false;
  submitting = false;

  constructor(
    private assistanceService: RoadsideAssistanceService,
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
      }
    });
  }

  loadMyRequests() {
    this.loading = true;
    this.assistanceService.getMyRequests().subscribe({
      next: (requests) => {
        this.requests = requests;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading requests:', error);
        this.loading = false;
      }
    });
  }

  getCurrentLocation() {
    if (navigator.geolocation) {
      this.snackBar.open('Getting your location...', 'Close', { duration: 2000 });
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.latitude = position.coords.latitude.toString();
          this.longitude = position.coords.longitude.toString();
          this.location = `Lat: ${this.latitude}, Lng: ${this.longitude}`;
          this.snackBar.open('Location obtained!', 'Close', { duration: 2000 });
        },
        (error) => {
          console.error('Error getting location:', error);
          this.snackBar.open('Could not get location', 'Close', { duration: 3000 });
        }
      );
    } else {
      this.snackBar.open('Geolocation not supported', 'Close', { duration: 3000 });
    }
  }

  submitRequest() {
    if (this.submitting) return;

    this.submitting = true;
    const request = {
      vehicleId: this.vehicleId || undefined,
      assistanceType: this.assistanceType,
      location: this.location,
      latitude: this.latitude,
      longitude: this.longitude,
      issueDescription: this.issueDescription,
      additionalNotes: this.additionalNotes,
      priority: this.priority
    };

    this.assistanceService.createRequest(request).subscribe({
      next: () => {
        this.snackBar.open('Assistance request submitted!', 'Close', { duration: 3000 });
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
    this.vehicleId = null;
    this.assistanceType = '';
    this.location = '';
    this.latitude = undefined;
    this.longitude = undefined;
    this.issueDescription = '';
    this.additionalNotes = '';
    this.priority = 'Normal';
  }

  deleteRequest(id: string) {
    if (confirm('Are you sure you want to cancel this request?')) {
      this.assistanceService.deleteRequest(id).subscribe({
        next: () => {
          this.snackBar.open('Request cancelled', 'Close', { duration: 3000 });
          this.loadMyRequests();
        },
        error: (error) => {
          console.error('Error deleting request:', error);
          this.snackBar.open('Failed to cancel request', 'Close', { duration: 3000 });
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
