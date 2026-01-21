import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-marshal-overview',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule
  ],
  template: `
    <div class="dashboard-cards">
      <mat-card (click)="navigateToTripCapture()">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>add_circle</mat-icon>
            Capture Trip Details
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Record new trips, passenger counts, and departure times.</p>
        </mat-card-content>
      </mat-card>

      <mat-card (click)="navigateToTripHistory()">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>history</mat-icon>
            Trip History
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>View all trips recorded for your assigned rank.</p>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>schedule</mat-icon>
            Today's Schedule
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Your shift and scheduled tasks will appear here.</p>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>directions_bus</mat-icon>
            Active Vehicles
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div *ngIf="loadingVehicles" class="loading-text">
            <p>Loading vehicles...</p>
          </div>
          <div *ngIf="!loadingVehicles && activeVehicles.length === 0" class="no-data">
            <p>No vehicles assigned to this rank</p>
          </div>
          <div *ngIf="!loadingVehicles && activeVehicles.length > 0" class="vehicle-list">
            <p><strong>{{ activeVehicles.length }}</strong> vehicle(s) assigned</p>
            <div class="vehicle-items">
              <div *ngFor="let vehicle of activeVehicles" class="vehicle-item">
                <mat-icon>directions_car</mat-icon>
                <span>{{ vehicle.registration }} - {{ vehicle.make }} {{ vehicle.model }}</span>
              </div>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>people</mat-icon>
            Passenger Management
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Manage passenger queues and boarding.</p>
        </mat-card-content>
      </mat-card>

      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>report_problem</mat-icon>
            Incidents
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <p>Report and track incidents at your rank.</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .dashboard-cards {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
      padding: 1.5rem;
    }

    mat-card {
      cursor: pointer;
      transition: all 0.3s ease;
      border: 2px solid transparent;
      height: 100%;
    }

    mat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
      border-color: #D4AF37;
    }

    mat-card-header {
      padding-bottom: 0.5rem;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.1rem;
      font-weight: 600;
      color: #333;
    }

    mat-card-title mat-icon {
      color: #D4AF37;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    mat-card-content {
      padding-top: 0.5rem;
    }

    mat-card-content p {
      margin: 0;
      color: #666;
      font-size: 0.95rem;
      line-height: 1.5;
    }

    .loading-text,
    .no-data {
      text-align: center;
      color: #999;
      font-style: italic;
    }

    .vehicle-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .vehicle-list p {
      margin: 0;
      color: #333;
      font-weight: 600;
    }

    .vehicle-items {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-height: 120px;
      overflow-y: auto;
    }

    .vehicle-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      background: #f5f5f5;
      border-radius: 4px;
      font-size: 0.9rem;
    }

    .vehicle-item mat-icon {
      color: #D4AF37;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    @media (max-width: 768px) {
      .dashboard-cards {
        grid-template-columns: 1fr;
        padding: 1rem;
        gap: 1rem;
      }
    }
  `]
})
export class MarshalOverviewComponent implements OnInit {
  activeVehicles: any[] = [];
  loadingVehicles = false;
  userData: any;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
      this.loadActiveVehicles();
    }
  }

  loadActiveVehicles(): void {
    if (!this.userData?.taxiRankId) return;
    
    this.loadingVehicles = true;
    this.http.get<any[]>(`${environment.apiUrl}/Vehicles/rank/${this.userData.taxiRankId}`)
      .subscribe({
        next: (vehicles) => {
          this.activeVehicles = vehicles.filter(v => v.status === 'Active');
          this.loadingVehicles = false;
        },
        error: (err) => {
          console.error('Failed to load vehicles:', err);
          this.loadingVehicles = false;
        }
      });
  }

  navigateToTripCapture(): void {
    this.router.navigate(['/marshal-dashboard/trip-details']);
  }

  navigateToTripHistory(): void {
    this.router.navigate(['/marshal-dashboard/trip-history']);
  }
}
