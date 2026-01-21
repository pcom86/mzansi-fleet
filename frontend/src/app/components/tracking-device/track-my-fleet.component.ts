import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { MatChipsModule } from '@angular/material/chips';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { VehicleService } from '../../services/vehicle.service';
import { Vehicle } from '../../models/vehicle.model';

interface VehicleWithTracking extends Vehicle {
  hasTracking?: boolean;
  driver?: string;
}

@Component({
  selector: 'app-track-my-fleet',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatChipsModule,
    MatSnackBarModule
  ],
  template: `
    <div class="track-fleet-container">
      <div class="controls-section">
        <mat-card class="controls-card">
          <mat-card-content>
            <div class="control-group">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Select Vehicle</mat-label>
                <mat-select [(ngModel)]="selectedVehicleId" (ngModelChange)="onVehicleChange()">
                  <mat-option value="">All Vehicles</mat-option>
                  <mat-option *ngFor="let vehicle of vehicles" [value]="vehicle.id">
                    {{ vehicle.registration }} - {{ vehicle.make }} {{ vehicle.model }}
                  </mat-option>
                </mat-select>
                <mat-icon matPrefix>directions_car</mat-icon>
              </mat-form-field>

              <button mat-raised-button color="primary" (click)="refreshTracking()">
                <mat-icon>refresh</mat-icon>
                Refresh
              </button>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Map Integration Section -->
      <mat-card class="map-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>map</mat-icon>
            Fleet Location
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="integration-notice">
            <mat-icon class="large-icon">gps_not_fixed</mat-icon>
            <h3>Tracking Device Integration</h3>
            <p>To enable real-time fleet tracking, you need to:</p>
            <ol>
              <li>Install tracking devices on your vehicles</li>
              <li>Connect with a tracking service provider</li>
              <li>Configure API integration credentials</li>
            </ol>
            <p class="info-text">
              Once configured, this screen will display real-time locations, 
              routes, speed data, and other tracking information from your 
              tracking device provider.
            </p>
            <button mat-raised-button color="accent" (click)="navigateToRequest()">
              <mat-icon>add_circle</mat-icon>
              Request Device Installation
            </button>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Vehicle Status Cards -->
      <div class="vehicles-grid" *ngIf="vehicles.length > 0">
        <mat-card *ngFor="let vehicle of filteredVehicles" class="vehicle-card">
          <mat-card-header>
            <mat-card-title>
              <div class="vehicle-header">
                <mat-icon>directions_car</mat-icon>
                {{ vehicle.registration }}
              </div>
            </mat-card-title>
            <mat-chip class="status-chip" [class.has-tracking]="vehicle.hasTracking">
              {{ vehicle.hasTracking ? 'Tracked' : 'Not Tracked' }}
            </mat-chip>
          </mat-card-header>
          <mat-card-content>
            <div class="vehicle-info">
              <p><strong>Vehicle:</strong> {{ vehicle.make }} {{ vehicle.model }} ({{ vehicle.year }})</p>
              <p *ngIf="vehicle.driver"><strong>Driver:</strong> {{ vehicle.driver }}</p>
              <p class="tracking-status">
                <mat-icon>{{ vehicle.hasTracking ? 'check_circle' : 'cancel' }}</mat-icon>
                {{ vehicle.hasTracking ? 'Tracking device installed' : 'No tracking device' }}
              </p>
            </div>
          </mat-card-content>
          <mat-card-actions *ngIf="!vehicle.hasTracking">
            <button mat-button color="primary" (click)="navigateToRequest()">
              <mat-icon>add</mat-icon>
              Request Installation
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .track-fleet-container {
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .controls-section {
      margin-bottom: 1.5rem;
    }

    .controls-card {
      background: white;
    }

    .control-group {
      display: flex;
      gap: 1rem;
      align-items: flex-start;
    }

    .full-width {
      flex: 1;
    }

    .map-card {
      margin-bottom: 2rem;
      min-height: 500px;
    }

    .integration-notice {
      text-align: center;
      padding: 3rem 2rem;
      color: #666;
    }

    .large-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #1976d2;
      margin-bottom: 1rem;
    }

    .integration-notice h3 {
      color: #333;
      margin: 1rem 0;
    }

    .integration-notice ol {
      text-align: left;
      max-width: 500px;
      margin: 1.5rem auto;
      padding-left: 1.5rem;
    }

    .integration-notice li {
      margin: 0.5rem 0;
      font-size: 0.95rem;
    }

    .info-text {
      margin: 1.5rem 0;
      font-size: 0.9rem;
      color: #666;
      max-width: 600px;
      margin-left: auto;
      margin-right: auto;
    }

    .vehicles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 1.5rem;
      margin-top: 2rem;
    }

    .vehicle-card {
      height: fit-content;
    }

    .vehicle-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .status-chip {
      background: #ff9800;
      color: white;
    }

    .status-chip.has-tracking {
      background: #4caf50;
    }

    .vehicle-info {
      padding: 0.5rem 0;
    }

    .vehicle-info p {
      margin: 0.5rem 0;
      color: #666;
    }

    .tracking-status {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1rem !important;
      padding: 0.5rem;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .tracking-status mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    mat-card-actions {
      padding: 16px;
      border-top: 1px solid #e0e0e0;
    }
  `]
})
export class TrackMyFleetComponent implements OnInit {
  vehicles: VehicleWithTracking[] = [];
  filteredVehicles: VehicleWithTracking[] = [];
  selectedVehicleId: string = '';
  loading = false;

  constructor(
    private vehicleService: VehicleService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadVehicles();
  }

  loadVehicles(): void {
    this.loading = true;
    this.vehicleService.getAll().subscribe({
      next: (vehicles: Vehicle[]) => {
        this.vehicles = vehicles.map((v: Vehicle): VehicleWithTracking => ({
          ...v,
          hasTracking: false, // TODO: Check if vehicle has tracking device installed
          driver: undefined // TODO: Get driver assignment from API
        }));
        this.filteredVehicles = this.vehicles;
        this.loading = false;
      },
      error: (error: any) => {
        console.error('Error loading vehicles:', error);
        this.snackBar.open('Failed to load vehicles', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onVehicleChange(): void {
    if (this.selectedVehicleId) {
      this.filteredVehicles = this.vehicles.filter(v => v.id === this.selectedVehicleId);
    } else {
      this.filteredVehicles = this.vehicles;
    }
  }

  refreshTracking(): void {
    this.snackBar.open('Refreshing tracking data...', 'Close', { duration: 2000 });
    this.loadVehicles();
  }

  navigateToRequest(): void {
    // This will be handled by parent component with tab change
    this.snackBar.open('Switch to "Request Installation" tab to request tracking device installation', 'Close', { duration: 3000 });
  }
}
