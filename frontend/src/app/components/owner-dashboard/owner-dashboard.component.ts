import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { HttpClient } from '@angular/common/http';
import { AuthService, IdentityService } from '../../services';
import { MzansiFleetLogoComponent } from '../shared/mzansi-fleet-logo.component';

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatGridListModule,
    MatToolbarModule,
    MatMenuModule,
    MatBadgeModule,
    MzansiFleetLogoComponent
  ],
  template: `
    <div class="dashboard-container">
      <mat-toolbar color="primary" class="toolbar">
        <span class="toolbar-title">
          <app-mzansi-fleet-logo [width]="150" [height]="60"></app-mzansi-fleet-logo>
          <span class="title-text">Owner Dashboard</span>
        </span>
        <span class="spacer"></span>
        <div class="user-info" *ngIf="userData">
          <span class="user-name">{{ userData.fullName || userData.email }}</span>
          <span class="user-role">{{ userData.role }}</span>
        </div>
        <button mat-icon-button [matMenuTriggerFor]="menu">
          <mat-icon>account_circle</mat-icon>
        </button>
        <mat-menu #menu="matMenu">
          <button mat-menu-item routerLink="/identity/owner-profiles">
            <mat-icon>person</mat-icon>
            <span>My Profile</span>
          </button>
          <button mat-menu-item (click)="logout()">
            <mat-icon>logout</mat-icon>
            <span>Logout</span>
          </button>
        </mat-menu>
      </mat-toolbar>

      <div class="content">
        <p class="subtitle">Manage your fleet operations from here</p>

        <mat-grid-list cols="3" rowHeight="200px" gutterSize="20px" class="grid">
          <mat-grid-tile>
            <mat-card class="dashboard-card">
              <mat-card-header>
                <mat-icon class="card-icon">analytics</mat-icon>
              </mat-card-header>
              <mat-card-content>
                <h2>Analytics Dashboard</h2>
                <p>View comprehensive fleet analytics, profitability, and forecasts</p>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button color="accent" routerLink="/owner-dashboard/analytics">
                  View Analytics
                </button>
              </mat-card-actions>
            </mat-card>
          </mat-grid-tile>

          <mat-grid-tile>
            <mat-card class="dashboard-card">
              <mat-card-header>
                <mat-icon class="card-icon">business</mat-icon>
              </mat-card-header>
              <mat-card-content>
                <h2>Owner Profiles</h2>
                <p>View and manage your owner profile information</p>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button color="primary" routerLink="/identity/owner-profiles">
                  View Profiles
                </button>
              </mat-card-actions>
            </mat-card>
          </mat-grid-tile>

          <mat-grid-tile>
            <mat-card class="dashboard-card">
              <mat-card-header>
                <mat-icon class="card-icon">directions_car</mat-icon>
              </mat-card-header>
              <mat-card-content>
                <h2>Vehicles</h2>
                <p>Manage your fleet vehicles and documentation</p>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button color="primary" routerLink="/vehicles">
                  View Vehicles
                </button>
              </mat-card-actions>
            </mat-card>
          </mat-grid-tile>

          <mat-grid-tile>
            <mat-card class="dashboard-card">
              <mat-card-header>
                <mat-icon class="card-icon">people</mat-icon>
              </mat-card-header>
              <mat-card-content>
                <h2>Drivers</h2>
                <p>Manage your drivers and their assignments</p>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button color="primary" routerLink="/drivers">
                  View Drivers
                </button>
              </mat-card-actions>
            </mat-card>
          </mat-grid-tile>

          <mat-grid-tile>
            <mat-card class="dashboard-card">
              <mat-card-header>
                <mat-icon class="card-icon">trip_origin</mat-icon>
              </mat-card-header>
              <mat-card-content>
                <h2>Trips</h2>
                <p>Track and manage all trip requests and history</p>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button color="primary" routerLink="/owner-dashboard/trips">
                  View Trips
                </button>
              </mat-card-actions>
            </mat-card>
          </mat-grid-tile>

          <mat-grid-tile>
            <mat-card class="dashboard-card maintenance-card">
              <mat-card-header>
                <mat-icon class="card-icon"
                         [matBadge]="tomorrowMaintenanceCount" 
                         [matBadgeHidden]="tomorrowMaintenanceCount === 0"
                         matBadgeColor="warn"
                         matBadgeSize="medium"
                         matBadgePosition="above after">build</mat-icon>
              </mat-card-header>
              <mat-card-content>
                <h2>Maintenance</h2>
                <p>Track mechanical requests and maintenance</p>
                <div *ngIf="tomorrowMaintenanceCount > 0" class="alert-message">
                  <mat-icon class="alert-icon">notifications_active</mat-icon>
                  <span>{{ tomorrowMaintenanceCount }} scheduled for tomorrow</span>
                </div>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button color="primary" routerLink="/maintenance">
                  View Maintenance
                </button>
              </mat-card-actions>
            </mat-card>
          </mat-grid-tile>

          <mat-grid-tile>
            <mat-card class="dashboard-card">
              <mat-card-header>
                <mat-icon class="card-icon">group</mat-icon>
              </mat-card-header>
              <mat-card-content>
                <h2>Users</h2>
                <p>Manage users and access permissions</p>
              </mat-card-content>
              <mat-card-actions>
                <button mat-raised-button color="primary" routerLink="/identity/users">
                  View Users
                </button>
              </mat-card-actions>
            </mat-card>
          </mat-grid-tile>
        </mat-grid-list>

        <div class="quick-actions">
          <h2>Quick Actions</h2>
          <div class="action-buttons">
            <button mat-raised-button color="accent" routerLink="/identity/owner-profiles/create">
              <mat-icon>add</mat-icon>
              Create Owner Profile
            </button>
            <button mat-raised-button color="accent" routerLink="/vehicles">
              <mat-icon>add</mat-icon>
              Add Vehicle
            </button>
            <button mat-raised-button color="accent" routerLink="/drivers">
              <mat-icon>add</mat-icon>
              Add Driver
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-container {
      min-height: 100vh;
      background: #FFFFFF;
    }

    .toolbar {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      border-bottom: 3px solid #D4AF37;
      background-color: #000000;
    }

    .toolbar-title {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .title-text {
      font-size: 1.25rem;
      font-weight: 500;
      color: #FFFFFF;
    }

    .spacer {
      flex: 1 1 auto;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      margin-right: 1rem;

      .user-name {
        font-weight: 500;
        font-size: 14px;
        color: #FFFFFF;
      }

      .user-role {
        font-size: 12px;
        opacity: 0.8;
        color: #FFFFFF;
      }
    }

    .content {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem;
    }

    h1 {
      font-size: 2.5rem;
      margin-bottom: 0.5rem;
      color: #001489;
      font-weight: 600;
    }

    .subtitle {
      color: #6c757d;
      font-size: 1.1rem;
      margin-bottom: 2rem;
    }

    .grid {
      margin-bottom: 2rem;
    }

    .dashboard-card {
      width: 100%;
      height: 100%;
      display: flex;
      flex-direction: column;
      cursor: pointer;
      transition: all 0.3s ease;
      border-radius: 12px;
      border: 2px solid rgba(212, 175, 55, 0.3);
      background: #FFFFFF;
    }

    .dashboard-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 12px 24px rgba(212, 175, 55, 0.3);
      border-color: #D4AF37;
    }

    .dashboard-card mat-card-header {
      display: flex;
      justify-content: center;
      padding: 1.5rem 0 0 0;
    }

    .card-icon {
      font-size: 56px;
      width: 56px;
      height: 56px;
    }

    .card-icon.profiles { color: #000000; }
    .card-icon.vehicles { color: #D4AF37; }
    .card-icon.drivers { color: #000000; }
    .card-icon.trips { color: #D4AF37; }
    .card-icon.maintenance { color: #FFD700; }
    .card-icon.users { color: #000000; }

    .dashboard-card mat-card-content {
      flex: 1;
      text-align: center;
      padding: 1rem;
    }

    .dashboard-card h2 {
      font-size: 1.4rem;
      margin-bottom: 0.5rem;
      color: #000000;
      font-weight: 600;
    }

    .dashboard-card p {
      color: #6c757d;
      font-size: 0.95rem;
      line-height: 1.5;
    }

    .dashboard-card mat-card-actions {
      padding: 1rem;
      display: flex;
      justify-content: center;
      border-top: 1px solid rgba(0, 20, 137, 0.1);
    }

    .alert-message {
      display: flex;
      align-items: center;
      gap: 6px;
      margin-top: 10px;
      padding: 8px 12px;
      background: rgba(255, 152, 0, 0.1);
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      color: #ff6b00;
    }

    .alert-message .alert-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      animation: ring 1.5s ease-in-out infinite;
    }

    @keyframes ring {
      0%, 100% {
        transform: rotate(0deg);
      }
      10%, 30% {
        transform: rotate(-15deg);
      }
      20%, 40% {
        transform: rotate(15deg);
      }
    }

    .quick-actions {
      margin-top: 2rem;
      padding: 2rem;
      background: #FFFFFF;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 2px solid rgba(212, 175, 55, 0.3);
    }

    .quick-actions h2 {
      font-size: 1.5rem;
      margin-bottom: 1.5rem;
      color: #000000;
      font-weight: 600;
    }

    .action-buttons {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
    }

    .action-buttons button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      border-radius: 8px;
      padding: 10px 20px;
      font-weight: 500;
    }

    @media (max-width: 1200px) {
      .grid {
        grid-template-columns: repeat(2, 1fr) !important;
      }
    }

    @media (max-width: 768px) {
      .grid {
        grid-template-columns: 1fr !important;
      }

      .user-info {
        display: none;
      }

      .content {
        padding: 1rem;
      }

      h1 {
        font-size: 2rem;
      }
    }
  `]
})
export class OwnerDashboardComponent implements OnInit {
  userData: any;
  tomorrowMaintenanceCount: number = 0;
  private apiUrl = 'http://localhost:5000/api';

  constructor(
    private authService: AuthService,
    private identityService: IdentityService,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Get user info from local storage
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
    }
    this.loadMaintenanceAlerts();
  }

  logout(): void {
    this.authService.logout();
  }

  async loadMaintenanceAlerts(): Promise<void> {
    try {
      const userInfoStr = localStorage.getItem('user');
      if (!userInfoStr) return;

      const userInfo = JSON.parse(userInfoStr);
      const allRequests: any = await this.http.get(`${this.apiUrl}/MechanicalRequests`).toPromise();

      if (!Array.isArray(allRequests)) return;

      // Filter requests for this owner's vehicles
      const allVehicles: any = await this.http.get(`${this.apiUrl}/Vehicles`).toPromise();
      const ownerVehicles = allVehicles.filter((v: any) => v.ownerId === userInfo.tenantId || v.ownerId === userInfo.userId);
      
      const ownerRequests = allRequests
        .filter((r: any) => ownerVehicles.some((v: any) => v.id === r.vehicleId))
        .map((r: any) => ({
          ...r,
          status: r.state || 'Pending',
          scheduledDate: r.scheduledDate
        }));

      this.tomorrowMaintenanceCount = this.countTomorrowMaintenance(ownerRequests);
    } catch (error) {
      console.error('Error loading maintenance alerts:', error);
    }
  }

  countTomorrowMaintenance(requests: any[]): number {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    return requests.filter(r => {
      if (r.status !== 'Scheduled' || !r.scheduledDate) return false;

      const scheduledDate = new Date(r.scheduledDate);
      scheduledDate.setHours(0, 0, 0, 0);

      return scheduledDate >= tomorrow && scheduledDate < dayAfterTomorrow;
    }).length;
  }
}
