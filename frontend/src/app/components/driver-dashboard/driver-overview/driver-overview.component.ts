import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-driver-overview',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="driver-overview">
      <div class="loading" *ngIf="loading">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        <p>Loading your dashboard...</p>
      </div>

      <div *ngIf="!loading" class="overview-content">
        <!-- Driver Status Card -->
        <mat-card class="status-card">
          <mat-card-header>
            <mat-icon mat-card-avatar class="card-icon">person</mat-icon>
            <mat-card-title>Driver Status</mat-card-title>
            <mat-card-subtitle>Your current profile information</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="status-grid">
              <div class="status-item">
                <span class="label">Status:</span>
                <mat-chip [class.active-chip]="driverProfile?.isActive" [class.inactive-chip]="!driverProfile?.isActive">
                  {{ driverProfile?.isActive ? 'Active' : 'Inactive' }}
                </mat-chip>
              </div>
              <div class="status-item">
                <span class="label">Availability:</span>
                <mat-chip [class.available-chip]="driverProfile?.isAvailable" [class.unavailable-chip]="!driverProfile?.isAvailable">
                  {{ driverProfile?.isAvailable ? 'Available' : 'Unavailable' }}
                </mat-chip>
              </div>
              <div class="status-item">
                <span class="label">Email:</span>
                <span class="value">{{ driverProfile?.email }}</span>
              </div>
              <div class="status-item">
                <span class="label">Phone:</span>
                <span class="value">{{ driverProfile?.phone || 'Not provided' }}</span>
              </div>
              <div class="status-item">
                <span class="label">License Category:</span>
                <span class="value">{{ driverProfile?.category || 'Not specified' }}</span>
              </div>
              <div class="status-item" *ngIf="driverProfile?.hasPdp">
                <span class="label">PDP:</span>
                <mat-chip class="pdp-chip">✓ Certified</mat-chip>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Vehicle Assignment Card -->
        <mat-card class="vehicle-card">
          <mat-card-header>
            <mat-icon mat-card-avatar class="card-icon">directions_car</mat-icon>
            <mat-card-title>Vehicle Assignment</mat-card-title>
            <mat-card-subtitle>Your current assigned vehicle</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="assignedVehicle" class="vehicle-info">
              <div class="vehicle-detail">
                <mat-icon>directions_car</mat-icon>
                <div>
                  <strong>{{ assignedVehicle.make }} {{ assignedVehicle.model }}</strong>
                  <span class="vehicle-reg">{{ assignedVehicle.registration }}</span>
                </div>
              </div>
              <div class="vehicle-stats">
                <div class="stat-item">
                  <span class="stat-label">Year</span>
                  <span class="stat-value">{{ assignedVehicle.year }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Status</span>
                  <span class="stat-value">{{ assignedVehicle.status }}</span>
                </div>
              </div>
            </div>
            <div *ngIf="!assignedVehicle" class="no-vehicle">
              <mat-icon>info</mat-icon>
              <p>No vehicle currently assigned</p>
              <span class="hint">Contact your administrator to get a vehicle assigned</span>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Quick Actions Card -->
        <mat-card class="actions-card">
          <mat-card-header>
            <mat-icon mat-card-avatar class="card-icon">dashboard</mat-icon>
            <mat-card-title>Quick Actions</mat-card-title>
            <mat-card-subtitle>Common tasks and shortcuts</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="action-grid">
              <button mat-raised-button color="primary" (click)="navigateTo('earnings')" [disabled]="!assignedVehicle">
                <mat-icon>attach_money</mat-icon>
                <span>View Earnings</span>
              </button>
              <button mat-raised-button color="primary" (click)="navigateTo('expenses')" [disabled]="!assignedVehicle">
                <mat-icon>receipt</mat-icon>
                <span>View Expenses</span>
              </button>
              <button mat-raised-button color="accent" (click)="navigateTo('maintenance')">
                <mat-icon>build</mat-icon>
                <span>Maintenance</span>
              </button>
              <button mat-raised-button color="accent" (click)="navigateTo('trips')">
                <mat-icon>map</mat-icon>
                <span>Trip History</span>
              </button>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Performance Summary Card -->
        <mat-card class="summary-card">
          <mat-card-header>
            <mat-icon mat-card-avatar class="card-icon">insights</mat-icon>
            <mat-card-title>This Month's Summary</mat-card-title>
            <mat-card-subtitle>Your performance at a glance</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="summary-grid">
              <div class="summary-item earnings">
                <mat-icon>trending_up</mat-icon>
                <div class="summary-details">
                  <span class="summary-label">Total Earnings</span>
                  <span class="summary-value">R 0.00</span>
                </div>
              </div>
              <div class="summary-item expenses">
                <mat-icon>trending_down</mat-icon>
                <div class="summary-details">
                  <span class="summary-label">Total Expenses</span>
                  <span class="summary-value">R 0.00</span>
                </div>
              </div>
              <div class="summary-item profit">
                <mat-icon>account_balance_wallet</mat-icon>
                <div class="summary-details">
                  <span class="summary-label">Net Profit</span>
                  <span class="summary-value">R 0.00</span>
                </div>
              </div>
              <div class="summary-item trips">
                <mat-icon>local_shipping</mat-icon>
                <div class="summary-details">
                  <span class="summary-label">Total Trips</span>
                  <span class="summary-value">0</span>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .driver-overview {
      padding: 1.5rem;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem;
      gap: 1.5rem;

      p {
        font-size: 1.1rem;
        color: #2196F3;
        font-weight: 500;
      }
    }

    .overview-content {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));
      gap: 1.5rem;
    }

    mat-card {
      border-radius: 16px;
      box-shadow: 0 2px 12px rgba(33, 150, 243, 0.1);
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(33, 150, 243, 0.15);
      }
    }

    .card-icon {
      background: linear-gradient(135deg, #2196F3 0%, #00BCD4 100%);
      color: #FFFFFF;
      font-size: 28px;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
    }

    mat-card-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #0D47A1;
    }

    mat-card-subtitle {
      color: #2196F3;
      font-size: 0.9rem;
    }

    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .status-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      .label {
        font-size: 0.85rem;
        color: #666;
        font-weight: 500;
      }

      .value {
        font-size: 0.95rem;
        color: #333;
        font-weight: 600;
      }
    }

    .active-chip {
      background: #4CAF50 !important;
      color: #FFFFFF !important;
    }

    .inactive-chip {
      background: #9E9E9E !important;
      color: #FFFFFF !important;
    }

    .available-chip {
      background: #2196F3 !important;
      color: #FFFFFF !important;
    }

    .unavailable-chip {
      background: #FF9800 !important;
      color: #FFFFFF !important;
    }

    .pdp-chip {
      background: #00BCD4 !important;
      color: #FFFFFF !important;
    }

    .vehicle-info {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      margin-top: 1rem;
    }

    .vehicle-detail {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: linear-gradient(135deg, #E3F2FD 0%, #F5F5F5 100%);
      border-radius: 12px;

      mat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        color: #2196F3;
      }

      div {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;

        strong {
          font-size: 1.1rem;
          color: #0D47A1;
        }

        .vehicle-reg {
          font-size: 0.9rem;
          color: #2196F3;
          font-weight: 600;
        }
      }
    }

    .vehicle-stats {
      display: flex;
      gap: 1rem;
    }

    .stat-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.75rem;
      background: #F5F5F5;
      border-radius: 8px;
      text-align: center;

      .stat-label {
        font-size: 0.8rem;
        color: #666;
      }

      .stat-value {
        font-size: 1rem;
        font-weight: 600;
        color: #2196F3;
      }
    }

    .no-vehicle {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 2rem;
      text-align: center;
      color: #999;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #BDBDBD;
      }

      p {
        margin: 0;
        font-size: 1rem;
        font-weight: 500;
      }

      .hint {
        font-size: 0.85rem;
        color: #BDBDBD;
      }
    }

    .action-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-top: 1rem;

      button {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        height: auto;
        border-radius: 12px;

        mat-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
        }

        span {
          font-size: 0.9rem;
          font-weight: 600;
        }
      }
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      border-radius: 12px;
      background: #F5F5F5;

      mat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
      }

      &.earnings {
        background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
        
        mat-icon {
          color: #4CAF50;
        }
      }

      &.expenses {
        background: linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%);
        
        mat-icon {
          color: #F44336;
        }
      }

      &.profit {
        background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
        
        mat-icon {
          color: #2196F3;
        }
      }

      &.trips {
        background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
        
        mat-icon {
          color: #FF9800;
        }
      }
    }

    .summary-details {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;

      .summary-label {
        font-size: 0.85rem;
        color: #666;
        font-weight: 500;
      }

      .summary-value {
        font-size: 1.25rem;
        font-weight: 700;
        color: #333;
      }
    }

    @media (max-width: 768px) {
      .overview-content {
        grid-template-columns: 1fr;
      }

      .action-grid,
      .summary-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }
  `]
})
export class DriverOverviewComponent implements OnInit {
  loading = true;
  driverProfile: any = null;
  assignedVehicle: any = null;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  async ngOnInit() {
    await this.loadDriverData();
  }

  async loadDriverData() {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        this.router.navigate(['/login']);
        return;
      }

      const user = JSON.parse(userStr);
      
      // Load driver profile
      const drivers: any = await this.http.get('http://localhost:5000/api/Identity/driverprofiles').toPromise();
      this.driverProfile = drivers.find((d: any) => d.userId === user.userId);

      if (this.driverProfile) {
        // Load assigned vehicle
        const vehicles: any = await this.http.get('http://localhost:5000/api/Vehicles').toPromise();
        this.assignedVehicle = vehicles.find((v: any) => v.driverId === user.id);
      }
    } catch (error) {
      console.error('Error loading driver data:', error);
    } finally {
      this.loading = false;
    }
  }

  navigateTo(route: string) {
    this.router.navigate(['/driver-dashboard/' + route]);
  }
}
