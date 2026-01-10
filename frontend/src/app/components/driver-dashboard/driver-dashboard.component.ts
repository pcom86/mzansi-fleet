import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatBadgeModule } from '@angular/material/badge';

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatChipsModule,
    MatBadgeModule
  ],
  template: `
    <div class="driver-dashboard">
      <div class="dashboard-header">
        <div class="welcome-section">
          <h1>Driver Dashboard</h1>
          <p class="subtitle">Manage your profile and trips</p>
        </div>
      </div>

      <!-- Maintenance Alerts Banner -->
      <div *ngIf="!loading && tomorrowMaintenanceCount > 0" class="alert-banner">
        <div class="alert-icon">
          <mat-icon>notifications_active</mat-icon>
        </div>
        <div class="alert-content">
          <h3>Upcoming Maintenance</h3>
          <p>You have <strong>{{ tomorrowMaintenanceCount }}</strong> maintenance {{ tomorrowMaintenanceCount === 1 ? 'appointment' : 'appointments' }} scheduled for tomorrow</p>
        </div>
        <div class="alert-action">
          <button mat-raised-button color="warn" (click)="viewScheduledAppointments()">
            <mat-icon>event</mat-icon>
            View Schedule
          </button>
        </div>
        <mat-icon class="alert-close">chevron_right</mat-icon>
      </div>

      <div class="loading" *ngIf="loading">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        <p>Loading your dashboard...</p>
      </div>

      <div class="dashboard-content" *ngIf="!loading">
        <!-- Error Message -->
        <div class="error-message" *ngIf="!driverProfile">
          <mat-card>
            <mat-card-content>
              <h2>Unable to Load Profile</h2>
              <p>We couldn't find your driver profile. Please contact support.</p>
              <button mat-raised-button color="primary" (click)="logout()">
                Back to Login
              </button>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Driver Status Card -->
        <mat-card class="status-card" *ngIf="driverProfile">
          <mat-card-header>
            <mat-icon mat-card-avatar>person</mat-icon>
            <mat-card-title>Driver Status</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="status-info">
              <div class="info-item">
                <span class="label">Status:</span>
                <mat-chip [class.active]="driverProfile?.isActive" [class.inactive]="!driverProfile?.isActive">
                  {{ driverProfile?.isActive ? 'Active' : 'Inactive' }}
                </mat-chip>
              </div>
              <div class="info-item">
                <span class="label">Availability:</span>
                <mat-chip [class.available]="driverProfile?.isAvailable" [class.unavailable]="!driverProfile?.isAvailable">
                  {{ driverProfile?.isAvailable ? 'Available' : 'Unavailable' }}
                </mat-chip>
              </div>
              <div class="info-item">
                <span class="label">Email:</span>
                <span class="value">{{ driverProfile?.email }}</span>
              </div>
              <div class="info-item">
                <span class="label">Phone:</span>
                <span class="value">{{ driverProfile?.phone }}</span>
              </div>
              <div class="info-item">
                <span class="label">License Category:</span>
                <span class="value">{{ driverProfile?.category }}</span>
              </div>
              <div class="info-item" *ngIf="driverProfile?.hasPdp">
                <span class="label">PDP:</span>
                <mat-chip class="pdp-chip">✓ Certified</mat-chip>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Quick Actions Card -->
        <mat-card class="actions-card" *ngIf="driverProfile">
          <mat-card-header>
            <mat-icon mat-card-avatar>dashboard</mat-icon>
            <mat-card-title>Quick Actions</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="action-buttons">
              <button mat-raised-button color="primary" (click)="openAddEarningDialog()" [disabled]="!assignedVehicle">
                <mat-icon>attach_money</mat-icon>
                Add Earning
              </button>
              <button mat-raised-button color="primary" (click)="openAddExpenseDialog()" [disabled]="!assignedVehicle">
                <mat-icon>receipt</mat-icon>
                Add Expense
              </button>
              <button mat-raised-button color="accent" routerLink="/driver-maintenance"
                      [matBadge]="tomorrowMaintenanceCount" 
                      [matBadgeHidden]="tomorrowMaintenanceCount === 0"
                      matBadgeColor="warn"
                      matBadgeSize="small">
                <mat-icon>build</mat-icon>
                Maintenance Requests
              </button>
              <button mat-raised-button [color]="driverProfile?.isAvailable ? 'warn' : 'accent'" (click)="toggleAvailability()">
                <mat-icon>{{ driverProfile?.isAvailable ? 'pause' : 'play_arrow' }}</mat-icon>
                {{ driverProfile?.isAvailable ? 'Go Offline' : 'Go Online' }}
              </button>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Vehicle Assignment Card -->
        <mat-card class="vehicle-card" *ngIf="driverProfile">
          <mat-card-header>
            <mat-icon mat-card-avatar>directions_car</mat-icon>
            <mat-card-title>Vehicle Assignment</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="assignedVehicle" class="vehicle-info">
              <p><strong>Vehicle:</strong> {{ assignedVehicle.make }} {{ assignedVehicle.model }}</p>
              <p><strong>Registration:</strong> {{ assignedVehicle.registration }}</p>
              <p><strong>Year:</strong> {{ assignedVehicle.year }}</p>
              <p><strong>Next Service Date:</strong> 
                <span [class.service-due]="isServiceDueSoon(assignedVehicle.nextServiceDate)">
                  {{ assignedVehicle.nextServiceDate ? (assignedVehicle.nextServiceDate | date:'mediumDate') : 'Not scheduled' }}
                </span>
              </p>
            </div>
            <div *ngIf="!assignedVehicle" class="no-vehicle">
              <mat-icon>info</mat-icon>
              <p>No vehicle currently assigned</p>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Maintenance Requests Status Card -->
        <mat-card class="maintenance-card" *ngIf="driverProfile && assignedVehicle">
          <mat-card-header>
            <mat-icon mat-card-avatar>build_circle</mat-icon>
            <mat-card-title>Maintenance Requests</mat-card-title>
            <mat-card-subtitle>Track your service requests</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="loadingRequests" class="loading-requests">
              <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
            </div>

            <div *ngIf="!loadingRequests" class="requests-summary">
              <div class="status-counts">
                <div class="count-item pending">
                  <mat-icon>pending</mat-icon>
                  <div class="count-details">
                    <span class="count">{{ pendingRequestsCount }}</span>
                    <span class="label">Pending</span>
                  </div>
                </div>
                <div class="count-item approved">
                  <mat-icon>check_circle</mat-icon>
                  <div class="count-details">
                    <span class="count">{{ approvedRequestsCount }}</span>
                    <span class="label">Approved</span>
                  </div>
                </div>
                <div class="count-item scheduled">
                  <mat-icon>event</mat-icon>
                  <div class="count-details">
                    <span class="count">{{ scheduledRequestsCount }}</span>
                    <span class="label">Scheduled</span>
                  </div>
                </div>
              </div>

              <div *ngIf="maintenanceRequests.length > 0" class="recent-requests">
                <h4>Recent Requests</h4>
                <div class="request-list">
                  <div *ngFor="let request of maintenanceRequests.slice(0, 3)" class="request-item-mini">
                    <div class="request-info">
                      <span class="request-category">{{ request.category }}</span>
                      <mat-chip [class]="'status-' + request.status.toLowerCase()">
                        {{ request.status }}
                      </mat-chip>
                    </div>
                    <p class="request-desc">{{ request.description | slice:0:50 }}{{ request.description.length > 50 ? '...' : '' }}</p>
                    <span class="request-date-mini">{{ request.createdAt | date:'short' }}</span>
                  </div>
                </div>
              </div>

              <div *ngIf="maintenanceRequests.length === 0" class="no-requests">
                <mat-icon>inbox</mat-icon>
                <p>No maintenance requests yet</p>
              </div>
            </div>
          </mat-card-content>
          <mat-card-actions>
            <button mat-raised-button color="primary" routerLink="/driver-maintenance">
              <mat-icon>visibility</mat-icon>
              View All Requests
            </button>
          </mat-card-actions>
        </mat-card>

        <!-- Stats Card -->
        <mat-card class="stats-card" *ngIf="driverProfile">
          <mat-card-header>
            <mat-icon mat-card-avatar>analytics</mat-icon>
            <mat-card-title>Financial Summary - {{ currentMonthName }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="stats-grid">
              <div class="stat-item stat-earnings">
                <mat-icon>trending_up</mat-icon>
                <h3>R{{ totalEarnings.toFixed(2) }}</h3>
                <p>Total Earnings</p>
              </div>
              <div class="stat-item stat-expenses">
                <mat-icon>trending_down</mat-icon>
                <h3>R{{ totalExpenses.toFixed(2) }}</h3>
                <p>Total Expenses</p>
              </div>
              <div class="stat-item" [class.positive-profit]="profit > 0" [class.negative-profit]="profit < 0">
                <mat-icon>account_balance_wallet</mat-icon>
                <h3>R{{ profit.toFixed(2) }}</h3>
                <p>Net Profit</p>
              </div>
              <div class="stat-item stat-transactions">
                <mat-icon>receipt_long</mat-icon>
                <h3>{{ earningsCount + expensesCount }}</h3>
                <p>Total Transactions</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .driver-dashboard {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 30px;
      padding: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      color: white;
    }

    .alert-banner {
      margin: 20px 0;
      padding: 20px 25px;
      background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 20px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
      animation: slideIn 0.5s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .alert-banner:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(255, 152, 0, 0.4);
    }

    .alert-banner .alert-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      flex-shrink: 0;
    }

    .alert-banner .alert-icon mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: white;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
    }

    .alert-banner .alert-content {
      flex: 1;
      color: white;
    }

    .alert-banner .alert-content h3 {
      margin: 0 0 5px 0;
      font-size: 1.3rem;
      font-weight: 600;
      color: white;
    }

    .alert-banner .alert-content p {
      margin: 0;
      font-size: 1rem;
      opacity: 0.95;
      color: white;
    }

    .alert-banner .alert-content strong {
      font-weight: 700;
      font-size: 1.1rem;
    }

    .alert-banner .alert-action {
      flex-shrink: 0;
    }

    .alert-banner .alert-action button {
      background: white !important;
      color: #ff9800 !important;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .alert-banner .alert-action button:hover {
      background: #fff !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .alert-banner .alert-close {
      color: white;
      font-size: 32px;
      width: 32px;
      height: 32px;
      opacity: 0.8;
    }

    @media (max-width: 768px) {
      .alert-banner {
        flex-direction: column;
        text-align: center;
        padding: 20px;
      }

      .alert-banner .alert-close {
        display: none;
      }
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.85;
      }
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

    .welcome-section h1 {
      margin: 0;
      font-size: 2rem;
      font-weight: 600;
    }

    .subtitle {
      margin: 5px 0 0 0;
      opacity: 0.9;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px;
      gap: 20px;
    }

    .error-message {
      grid-column: 1 / -1;
      text-align: center;
    }

    .error-message mat-card {
      padding: 40px;
      background: #fff3cd;
      border: 2px solid #ffc107;
    }

    .error-message h2 {
      color: #856404;
      margin-bottom: 15px;
    }

    .error-message p {
      color: #856404;
      margin-bottom: 20px;
    }

    .dashboard-content {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
    }

    mat-card {
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    mat-card-header {
      margin-bottom: 15px;
    }

    mat-card-header mat-icon[mat-card-avatar] {
      width: 40px;
      height: 40px;
      font-size: 40px;
      color: #667eea;
    }

    .status-info {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .info-item .label {
      font-weight: 600;
      min-width: 140px;
      color: #666;
    }

    .info-item .value {
      color: #333;
    }

    mat-chip {
      font-size: 0.85rem;
      font-weight: 500;
    }

    mat-chip.active, mat-chip.available {
      background-color: #4caf50 !important;
      color: white !important;
    }

    mat-chip.inactive, mat-chip.unavailable {
      background-color: #f44336 !important;
      color: white !important;
    }

    mat-chip.pdp-chip {
      background-color: #2196f3 !important;
      color: white !important;
    }

    .vehicle-info p {
      margin: 8px 0;
      color: #333;
    }

    .vehicle-info .service-due {
      color: #f44336;
      font-weight: 600;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.7;
      }
    }

    .no-vehicle {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 20px;
      background: #f5f5f5;
      border-radius: 8px;
      color: #666;
    }

    .no-vehicle mat-icon {
      color: #999;
    }

    .action-buttons {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 12px;
    }

    .action-buttons button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 14px 16px;
      white-space: nowrap;
      min-height: 48px;
    }

    .action-buttons button mat-icon {
      flex-shrink: 0;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 20px;
    }

    .stat-item {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 15px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 8px;
      color: white;
      min-height: 140px;
      overflow: hidden;
    }

    .stat-item mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      margin-bottom: 8px;
      flex-shrink: 0;
    }

    .stat-item h3 {
      margin: 5px 0;
      font-size: clamp(1.2rem, 3vw, 1.8rem);
      font-weight: 600;
      word-break: break-word;
      text-align: center;
      max-width: 100%;
      overflow-wrap: break-word;
      line-height: 1.2;
    }

    .stat-item p {
      margin: 0;
      font-size: 0.85rem;
      opacity: 0.9;
      text-align: center;
      white-space: nowrap;
    }
    
    .stat-item.stat-earnings {
      background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
      box-shadow: 0 4px 8px rgba(76, 175, 80, 0.3);
    }
    
    .stat-item.stat-earnings mat-icon {
      color: #ffffff;
    }
    
    .stat-item.stat-expenses {
      background: linear-gradient(135deg, #f44336 0%, #e53935 100%);
      box-shadow: 0 4px 8px rgba(244, 67, 54, 0.3);
    }
    
    .stat-item.stat-expenses mat-icon {
      color: #ffffff;
    }
    
    .stat-item.stat-transactions {
      background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
      box-shadow: 0 4px 8px rgba(33, 150, 243, 0.3);
    }
    
    .stat-item.stat-transactions mat-icon {
      color: #ffffff;
    }
    
    .stat-item.positive-profit {
      background: linear-gradient(135deg, #4caf50 0%, #2e7d32 100%);
      box-shadow: 0 4px 8px rgba(76, 175, 80, 0.4);
      border: 2px solid #66bb6a;
    }
    
    .stat-item.positive-profit mat-icon {
      color: #ffffff;
    }
    
    .stat-item.negative-profit {
      background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
      box-shadow: 0 4px 8px rgba(255, 152, 0, 0.4);
      border: 2px solid #ffb74d;
    }
    
    .stat-item.negative-profit mat-icon {
      color: #ffffff;
    }

    .maintenance-card {
      grid-column: 1 / -1;
    }

    .loading-requests {
      display: flex;
      justify-content: center;
      padding: 20px;
    }

    .requests-summary {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .status-counts {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 15px;
    }

    .count-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 15px;
      border-radius: 8px;
      background: #f5f5f5;
    }

    .count-item mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .count-item.pending {
      background: linear-gradient(135deg, #ff9800 0%, #fb8c00 100%);
      color: white;
    }

    .count-item.pending mat-icon {
      color: white;
    }

    .count-item.approved {
      background: linear-gradient(135deg, #4caf50 0%, #43a047 100%);
      color: white;
    }

    .count-item.approved mat-icon {
      color: white;
    }

    .count-item.scheduled {
      background: linear-gradient(135deg, #2196f3 0%, #1e88e5 100%);
      color: white;
    }

    .count-item.scheduled mat-icon {
      color: white;
    }

    .count-details {
      display: flex;
      flex-direction: column;
    }

    .count-details .count {
      font-size: 24px;
      font-weight: 600;
    }

    .count-details .label {
      font-size: 12px;
      opacity: 0.9;
    }

    .recent-requests h4 {
      margin: 0 0 15px 0;
      font-size: 16px;
      color: #666;
    }

    .request-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .request-item-mini {
      padding: 12px;
      background: #f8f9fa;
      border-radius: 8px;
      border-left: 3px solid #2196f3;
    }

    .request-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .request-category {
      font-weight: 600;
      color: #333;
    }

    .request-desc {
      margin: 5px 0;
      font-size: 14px;
      color: #666;
      line-height: 1.4;
    }

    .request-date-mini {
      font-size: 12px;
      color: #999;
    }

    .no-requests {
      text-align: center;
      padding: 30px;
      color: #999;
    }

    .no-requests mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      opacity: 0.3;
      margin-bottom: 10px;
    }

    mat-chip.status-pending {
      background-color: #ff9800;
      color: white;
    }

    mat-chip.status-approved {
      background-color: #4caf50;
      color: white;
    }

    mat-chip.status-declined {
      background-color: #f44336;
      color: white;
    }

    mat-chip.status-scheduled {
      background-color: #2196f3;
      color: white;
    }

    mat-chip.status-completed {
      background-color: #9e9e9e;
      color: white;
    }

    @media (max-width: 768px) {
      .dashboard-content {
        grid-template-columns: 1fr;
      }

      .dashboard-header {
        flex-direction: column;
        gap: 15px;
        text-align: center;
      }

      .welcome-section h1 {
        font-size: 1.5rem;
      }

      .status-counts {
        grid-template-columns: 1fr;
      }

      .maintenance-card {
        grid-column: 1;
      }
    }
  `]
})
export class DriverDashboardComponent implements OnInit {
  driverProfile: any = null;
  assignedVehicle: any = null;
  loading = true;
  loadingRequests = false;
  totalEarnings = 0;
  totalExpenses = 0;
  profit = 0;
  earningsCount = 0;
  expensesCount = 0;
  currentMonthName = '';
  maintenanceRequests: any[] = [];
  pendingRequestsCount = 0;
  approvedRequestsCount = 0;
  scheduledRequestsCount = 0;
  tomorrowMaintenanceCount = 0;
  private apiUrl = 'http://localhost:5000/api/Identity';

  constructor(
    private router: Router,
    private http: HttpClient,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadDriverProfile();
  }

  async loadDriverProfile() {
    // Get user info from localStorage
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      console.log('No user found in localStorage, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    let user: any = null;
    try {
      user = JSON.parse(userStr);
    } catch (e) {
      console.error('Failed to parse user from localStorage');
      this.router.navigate(['/login']);
      return;
    }

    console.log('Driver dashboard - user:', user);

    if (!user?.userId || user?.role !== 'Driver') {
      console.log('Not a driver or no userId, redirecting to login');
      this.router.navigate(['/login']);
      return;
    }

    try {
      // Get all driver profiles and find the one matching this user
      const drivers: any = await this.http.get(`${this.apiUrl}/driverprofiles`).toPromise();
      console.log('All drivers:', drivers);
      
      this.driverProfile = drivers.find((d: any) => d.userId === user.userId);
      console.log('Found driver profile:', this.driverProfile);

      if (!this.driverProfile) {
        console.error('Driver profile not found for userId:', user.userId);
        this.loading = false;
        return;
      }

      // Load vehicles assigned to this driver using the same method as maintenance request component
      await this.loadDriverVehicles(user.id);

    } catch (error) {
      console.error('Error loading driver profile:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadDriverVehicles(driverId: string) {
    try {
      // Load all vehicles and filter by driverId (same as maintenance request component)
      const allVehicles: any = await this.http.get('http://localhost:5000/api/Vehicles').toPromise();
      const driverVehicles = allVehicles.filter((v: any) => v.driverId === driverId);
      
      console.log('Driver vehicles found:', driverVehicles);
      
      // Set the first vehicle as assigned vehicle for display
      if (driverVehicles.length > 0) {
        this.assignedVehicle = driverVehicles[0];
        console.log('Assigned vehicle:', this.assignedVehicle);
        
        // Load financial summary after vehicle is loaded
        await this.loadFinancialSummary(this.assignedVehicle.id);
        
        // Load maintenance requests for all driver's vehicles
        await this.loadMaintenanceRequests(driverVehicles);
      } else {
        console.log('No vehicles assigned to this driver');
      }
    } catch (error) {
      console.error('Error loading driver vehicles:', error);
    }
  }

  async loadMaintenanceRequests(vehicles: any[]) {
    this.loadingRequests = true;
    try {
      const allRequests: any = await this.http.get('http://localhost:5000/api/MechanicalRequests').toPromise();
      
      console.log('All mechanical requests:', allRequests);
      console.log('Driver vehicles:', vehicles);
      
      // Ensure allRequests is an array
      if (!Array.isArray(allRequests)) {
        console.error('allRequests is not an array:', allRequests);
        this.maintenanceRequests = [];
        return;
      }
      
      // Filter requests for this driver's vehicles (same logic as maintenance request component)
      this.maintenanceRequests = allRequests
        .filter((r: any) => vehicles.some(v => v.id === r.vehicleId))
        .map((r: any) => {
          const vehicle = vehicles.find(v => v.id === r.vehicleId);
          return {
            ...r,
            vehicleName: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.registration})` : 'Unknown',
            status: r.state || 'Pending',
            createdAt: r.createdAt || new Date(),
            category: r.category || 'General'
          };
        })
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      // Count requests by status
      this.pendingRequestsCount = this.maintenanceRequests.filter(r => r.status === 'Pending').length;
      this.approvedRequestsCount = this.maintenanceRequests.filter(r => r.status === 'Approved').length;
      this.scheduledRequestsCount = this.maintenanceRequests.filter(r => r.status === 'Scheduled').length;

      // Count maintenance scheduled for tomorrow
      this.tomorrowMaintenanceCount = this.countTomorrowMaintenance();

      console.log('Maintenance requests loaded:', {
        totalFromAPI: allRequests.length,
        filteredForDriver: this.maintenanceRequests.length,
        pending: this.pendingRequestsCount,
        approved: this.approvedRequestsCount,
        scheduled: this.scheduledRequestsCount,
        requests: this.maintenanceRequests
      });
    } catch (error) {
      console.error('Error loading maintenance requests:', error);
      this.maintenanceRequests = [];
      this.pendingRequestsCount = 0;
      this.approvedRequestsCount = 0;
      this.scheduledRequestsCount = 0;
    } finally {
      this.loadingRequests = false;
    }
  }

  countTomorrowMaintenance(): number {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    return this.maintenanceRequests.filter(r => {
      if (r.status !== 'Scheduled' || !r.scheduledDate) return false;

      const scheduledDate = new Date(r.scheduledDate);
      scheduledDate.setHours(0, 0, 0, 0);

      return scheduledDate >= tomorrow && scheduledDate < dayAfterTomorrow;
    }).length;
  }

  viewScheduledAppointments() {
    const scheduledRequests = this.maintenanceRequests.filter(r => r.status === 'Scheduled');
    
    this.dialog.open(ScheduledAppointmentsDialogComponent, {
      width: '900px',
      maxHeight: '90vh',
      data: {
        appointments: scheduledRequests,
        vehicleName: this.assignedVehicle?.vehicleName || 'Unknown Vehicle'
      }
    });
  }

  async loadFinancialSummary(vehicleId: string) {
    try {
      // Get current month start and end dates
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      // Format dates for API (YYYY-MM-DD)
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      // Set current month name for display
      this.currentMonthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      // Load earnings for current month
      const earnings: any = await this.http.get(
        `http://localhost:5000/api/VehicleEarnings/vehicle/${vehicleId}/period?startDate=${startDateStr}&endDate=${endDateStr}`
      ).toPromise();
      this.earningsCount = earnings?.length || 0;
      this.totalEarnings = earnings?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
      
      // Load expenses for current month
      const expenses: any = await this.http.get(
        `http://localhost:5000/api/VehicleExpenses/vehicle/${vehicleId}/period?startDate=${startDateStr}&endDate=${endDateStr}`
      ).toPromise();
      this.expensesCount = expenses?.length || 0;
      this.totalExpenses = expenses?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
      
      // Calculate profit
      this.profit = this.totalEarnings - this.totalExpenses;
      
      console.log('Financial Summary (Current Month):', {
        period: `${startDateStr} to ${endDateStr}`,
        earnings: this.totalEarnings,
        expenses: this.totalExpenses,
        profit: this.profit
      });
    } catch (error) {
      console.error('Error loading financial summary:', error);
    }
  }

  openAddEarningDialog() {
    const dialogRef = this.dialog.open(AddEarningDialogComponent, {
      width: '500px',
      data: { vehicleId: this.assignedVehicle?.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Earning added successfully!', 'Close', { duration: 3000 });
        // Reload financial summary
        if (this.assignedVehicle?.id) {
          this.loadFinancialSummary(this.assignedVehicle.id);
        }
      }
    });
  }

  openAddExpenseDialog() {
    const dialogRef = this.dialog.open(AddExpenseDialogComponent, {
      width: '500px',
      data: { vehicleId: this.assignedVehicle?.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Expense added successfully!', 'Close', { duration: 3000 });
        // Reload financial summary
        if (this.assignedVehicle?.id) {
          this.loadFinancialSummary(this.assignedVehicle.id);
        }
      }
    });
  }

  openServiceRequestDialog() {
    const dialogRef = this.dialog.open(ServiceRequestDialogComponent, {
      width: '600px',
      data: { 
        vehicleId: this.assignedVehicle?.id,
        ownerId: this.assignedVehicle?.ownerId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Service request submitted successfully!', 'Close', { duration: 3000 });
      }
    });
  }

  async toggleAvailability() {
    if (!this.driverProfile) return;

    this.loading = true;
    try {
      const updatedProfile = {
        ...this.driverProfile,
        isAvailable: !this.driverProfile.isAvailable
      };

      await this.http.put(`${this.apiUrl}/driverprofiles/${this.driverProfile.id}`, updatedProfile).toPromise();
      this.driverProfile.isAvailable = !this.driverProfile.isAvailable;
    } catch (error) {
      console.error('Error updating availability:', error);
    } finally {
      this.loading = false;
    }
  }

  isServiceDueSoon(nextServiceDate: string | null | undefined): boolean {
    if (!nextServiceDate) return false;
    
    const serviceDate = new Date(nextServiceDate);
    const today = new Date();
    const daysUntilService = Math.floor((serviceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    // Highlight if service is due within 7 days or overdue
    return daysUntilService <= 7;
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
}

// Add Earning Dialog Component
@Component({
  selector: 'add-earning-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule],
  template: `
    <h2 mat-dialog-title>Add Vehicle Earning</h2>
    <mat-dialog-content>
      <form #earningForm="ngForm">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Amount (R)</mat-label>
          <input matInput type="number" [(ngModel)]="earning.amount" name="amount" required min="0">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Source</mat-label>
          <mat-select [(ngModel)]="earning.source" name="source" required>
            <mat-option value="Trip">Trip</mat-option>
            <mat-option value="Delivery">Delivery</mat-option>
            <mat-option value="Bonus">Bonus</mat-option>
            <mat-option value="Other">Other</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput [(ngModel)]="earning.description" name="description" rows="3"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Date</mat-label>
          <input matInput [matDatepicker]="earningPicker" [(ngModel)]="earning.date" name="date" required
                 [min]="minDate" [max]="maxDate">
          <mat-datepicker-toggle matIconSuffix [for]="earningPicker"></mat-datepicker-toggle>
          <mat-datepicker #earningPicker></mat-datepicker>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="!earningForm.valid || loading">
        {{ loading ? 'Saving...' : 'Add Earning' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; margin-bottom: 15px; }
  `]
})
export class AddEarningDialogComponent {
  earning: any = {
    amount: null,
    source: '',
    description: '',
    date: new Date()
  };
  loading = false;
  minDate: Date;
  maxDate: Date;

  constructor(
    private dialogRef: MatDialogRef<AddEarningDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    // Set min date to first day of current month
    const now = new Date();
    this.minDate = new Date(now.getFullYear(), now.getMonth(), 1);
    // Set max date to today
    this.maxDate = new Date();
  }

  async onSubmit() {
    if (!this.data.vehicleId) {
      this.snackBar.open('No vehicle assigned', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    try {
      const payload = {
        vehicleId: this.data.vehicleId,
        amount: this.earning.amount,
        source: this.earning.source,
        description: this.earning.description,
        date: this.earning.date instanceof Date ? this.earning.date.toISOString().split('T')[0] : this.earning.date
      };

      await this.http.post('http://localhost:5000/api/VehicleEarnings', payload).toPromise();
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error adding earning:', error);
      this.snackBar.open('Failed to add earning', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}

// Add Expense Dialog Component
@Component({
  selector: 'add-expense-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule],
  template: `
    <h2 mat-dialog-title>Add Vehicle Expense</h2>
    <mat-dialog-content>
      <form #expenseForm="ngForm">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Amount (R)</mat-label>
          <input matInput type="number" [(ngModel)]="expense.amount" name="amount" required min="0">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Category</mat-label>
          <mat-select [(ngModel)]="expense.category" name="category" required>
            <mat-option value="Fuel">Fuel</mat-option>
            <mat-option value="Maintenance">Maintenance</mat-option>
            <mat-option value="Repairs">Repairs</mat-option>
            <mat-option value="Insurance">Insurance</mat-option>
            <mat-option value="Toll">Toll</mat-option>
            <mat-option value="Other">Other</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput [(ngModel)]="expense.description" name="description" rows="3"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Date</mat-label>
          <input matInput [matDatepicker]="expensePicker" [(ngModel)]="expense.date" name="date" required
                 [min]="minDate" [max]="maxDate">
          <mat-datepicker-toggle matIconSuffix [for]="expensePicker"></mat-datepicker-toggle>
          <mat-datepicker #expensePicker></mat-datepicker>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="!expenseForm.valid || loading">
        {{ loading ? 'Saving...' : 'Add Expense' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; margin-bottom: 15px; }
  `]
})
export class AddExpenseDialogComponent {
  expense: any = {
    amount: null,
    category: '',
    description: '',
    date: new Date()
  };
  loading = false;
  minDate: Date;
  maxDate: Date;

  constructor(
    private dialogRef: MatDialogRef<AddExpenseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    // Set min date to first day of current month
    const now = new Date();
    this.minDate = new Date(now.getFullYear(), now.getMonth(), 1);
    // Set max date to today
    this.maxDate = new Date();
  }

  async onSubmit() {
    if (!this.data.vehicleId) {
      this.snackBar.open('No vehicle assigned', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    try {
      const payload = {
        vehicleId: this.data.vehicleId,
        amount: this.expense.amount,
        category: this.expense.category,
        description: this.expense.description,
        date: this.expense.date instanceof Date ? this.expense.date.toISOString().split('T')[0] : this.expense.date
      };

      await this.http.post('http://localhost:5000/api/VehicleExpenses', payload).toPromise();
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error adding expense:', error);
      this.snackBar.open('Failed to add expense', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}

// Service Request Dialog Component
@Component({
  selector: 'service-request-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Request Service/Maintenance</h2>
    <mat-dialog-content>
      <form #serviceForm="ngForm">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Category</mat-label>
          <mat-select [(ngModel)]="request.category" name="category" required>
            <mat-option value="Engine">Engine</mat-option>
            <mat-option value="Brakes">Brakes</mat-option>
            <mat-option value="Tires">Tires</mat-option>
            <mat-option value="Oil Change">Oil Change</mat-option>
            <mat-option value="Transmission">Transmission</mat-option>
            <mat-option value="Electrical">Electrical</mat-option>
            <mat-option value="Body Work">Body Work</mat-option>
            <mat-option value="Other">Other</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Location</mat-label>
          <input matInput [(ngModel)]="request.location" name="location" required 
            placeholder="Where is the vehicle located?">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput [(ngModel)]="request.description" name="description" rows="4" required 
            placeholder="Describe the issue or service needed..."></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Preferred Time</mat-label>
          <input matInput type="datetime-local" [(ngModel)]="request.preferredTime" name="preferredTime">
        </mat-form-field>

        <div class="full-width" style="margin-bottom: 15px;">
          <label>
            <input type="checkbox" [(ngModel)]="request.callOutRequired" name="callOutRequired">
            Call-out service required
          </label>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="accent" (click)="onSubmit()" [disabled]="!serviceForm.valid || loading">
        {{ loading ? 'Submitting...' : 'Submit Request' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; margin-bottom: 15px; }
  `]
})
export class ServiceRequestDialogComponent {
  request: any = {
    category: '',
    location: '',
    description: '',
    preferredTime: null,
    callOutRequired: false
  };
  loading = false;

  constructor(
    private dialogRef: MatDialogRef<ServiceRequestDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  async onSubmit() {
    if (!this.data.vehicleId) {
      this.snackBar.open('No vehicle assigned', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    try {
      const payload = {
        ownerId: this.data.ownerId || '00000000-0000-0000-0000-000000000000',
        vehicleId: this.data.vehicleId,
        category: this.request.category,
        location: this.request.location,
        description: this.request.description,
        mediaUrls: '',
        preferredTime: this.request.preferredTime ? new Date(this.request.preferredTime).toISOString() : null,
        callOutRequired: this.request.callOutRequired,
        state: 'OPEN'
      };

      await this.http.post('http://localhost:5000/api/MechanicalRequests', payload).toPromise();
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error submitting service request:', error);
      this.snackBar.open('Failed to submit request', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}

// Scheduled Appointments Dialog Component
@Component({
  selector: 'scheduled-appointments-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>event</mat-icon>
      Scheduled Maintenance Appointments
    </h2>
    <mat-dialog-content>
      <div class="appointments-container">
        <p class="subtitle" *ngIf="data.appointments.length > 0">
          You have {{ data.appointments.length }} scheduled appointment{{ data.appointments.length > 1 ? 's' : '' }}
        </p>

        <div *ngIf="data.appointments.length === 0" class="empty-state">
          <mat-icon>event_available</mat-icon>
          <h3>No Scheduled Appointments</h3>
          <p>You don't have any maintenance appointments scheduled at the moment.</p>
        </div>

        <div *ngIf="data.appointments.length > 0" class="appointments-list">
          <div *ngFor="let appointment of data.appointments" class="appointment-card">
            <div class="appointment-header">
              <div class="appointment-title">
                <mat-icon>build</mat-icon>
                <h3>{{ appointment.category || 'Maintenance' }}</h3>
              </div>
              <mat-chip class="status-chip">{{ appointment.status }}</mat-chip>
            </div>

            <div class="appointment-details">
              <div class="detail-row">
                <mat-icon>directions_car</mat-icon>
                <span><strong>Vehicle:</strong> {{ appointment.vehicleName || data.vehicleName }}</span>
              </div>

              <div class="detail-row" *ngIf="appointment.scheduledDate">
                <mat-icon>calendar_today</mat-icon>
                <span><strong>Scheduled:</strong> {{ appointment.scheduledDate | date: 'EEEE, MMMM d, yyyy' }}</span>
              </div>

              <div class="detail-row" *ngIf="appointment.serviceProvider">
                <mat-icon>engineering</mat-icon>
                <span><strong>Service Provider:</strong> {{ appointment.serviceProvider }}</span>
              </div>

              <div class="detail-row" *ngIf="appointment.location">
                <mat-icon>location_on</mat-icon>
                <span><strong>Location:</strong> {{ appointment.location }}</span>
              </div>

              <div class="detail-row" *ngIf="appointment.description">
                <mat-icon>description</mat-icon>
                <span><strong>Description:</strong> {{ appointment.description }}</span>
              </div>

              <div class="detail-row" *ngIf="appointment.estimatedCost">
                <mat-icon>attach_money</mat-icon>
                <span><strong>Estimated Cost:</strong> R{{ appointment.estimatedCost }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-height: 300px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .appointments-container {
      padding: 10px 0;
    }

    .subtitle {
      color: #666;
      font-size: 14px;
      margin-bottom: 20px;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #999;
    }

    .empty-state mat-icon {
      font-size: 72px;
      width: 72px;
      height: 72px;
      color: #ddd;
      margin-bottom: 20px;
    }

    .empty-state h3 {
      font-size: 20px;
      font-weight: 500;
      color: #666;
      margin: 10px 0;
    }

    .empty-state p {
      font-size: 14px;
      color: #999;
    }

    .appointments-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .appointment-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      background: #fafafa;
      transition: all 0.2s ease;
    }

    .appointment-card:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      background: white;
    }

    .appointment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e0e0e0;
    }

    .appointment-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .appointment-title mat-icon {
      color: #ff9800;
    }

    .appointment-title h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }

    .status-chip {
      background: #4caf50 !important;
      color: white !important;
      font-weight: 600;
    }

    .appointment-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .detail-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      font-size: 14px;
      color: #666;
    }

    .detail-row mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #999;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .detail-row span {
      flex: 1;
    }

    .detail-row strong {
      color: #333;
      margin-right: 4px;
    }

    mat-dialog-actions {
      padding: 16px 24px;
    }
  `]
})
export class ScheduledAppointmentsDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}
}
