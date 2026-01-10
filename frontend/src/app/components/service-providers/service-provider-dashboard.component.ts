import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface MaintenanceJob {
  id: string;
  vehicleId: string;
  vehicleRegistration: string;
  issueDescription: string;
  requestedDate: Date;
  scheduledDate?: Date;
  status: string;
  priority: string;
  estimatedCost?: number;
}

interface ScheduledAppointment {
  id: string;
  vehicleId: string;
  vehicleRegistration: string;
  scheduledDate: Date;
  category: string;
  description: string;
  location: string;
  priority: string;
  scheduledBy: string;
}

interface CompletedMaintenance {
  id: string;
  vehicleId: string;
  vehicleRegistration: string;
  maintenanceDate: Date;
  completedDate: Date;
  maintenanceType: string;
  component: string;
  description: string;
  cost: number;
  invoiceNumber: string;
  mileageAtMaintenance: number;
}

interface MonthlyRevenue {
  year: number;
  month: number;
  revenue: number;
  jobCount: number;
}

interface FinancialData {
  totalRevenue: number;
  last30DaysRevenue: number;
  last60DaysRevenue: number;
  revenueGrowth: number;
  totalJobsCompleted: number;
  averageJobValue: number;
  monthlyRevenue: MonthlyRevenue[];
}

interface ServiceProviderProfile {
  id: string;
  businessName: string;
  serviceTypes: string;
  isAvailable: boolean;
  isActive: boolean;
  rating?: number;
  totalJobs: number;
  completedJobs: number;
}

@Component({
  selector: 'app-service-provider-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTabsModule
  ],
  template: `
    <div class="dashboard-page">
      <div class="page-header">
        <div class="header-content">
          <h1><mat-icon>dashboard</mat-icon> Service Provider Dashboard</h1>
          <div class="user-info" *ngIf="userData">
            <span class="user-name">{{ userData.fullName || userData.email }}</span>
            <span class="user-role">{{ userData.role }}</span>
          </div>
          <button mat-raised-button color="warn" (click)="logout()">
            <mat-icon>logout</mat-icon>
            Logout
          </button>
        </div>
      </div>

      <div *ngIf="loading" class="loading-container">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        <p>Loading your dashboard...</p>
      </div>

      <div *ngIf="!loading" class="dashboard-content">
        <!-- Profile Summary Card -->
        <mat-card class="profile-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>business</mat-icon>
            <mat-card-title>{{ profile?.businessName }}</mat-card-title>
            <mat-card-subtitle>{{ profile?.serviceTypes }}</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="profile-stats">
              <div class="stat">
                <mat-icon>star</mat-icon>
                <div>
                  <strong>{{ profile?.rating?.toFixed(1) || 'N/A' }}</strong>
                  <span>Rating</span>
                </div>
              </div>
              <div class="stat">
                <mat-icon>assignment</mat-icon>
                <div>
                  <strong>{{ financialData?.totalJobsCompleted || 0 }}</strong>
                  <span>Total Jobs</span>
                </div>
              </div>
              <div class="stat">
                <mat-icon>payments</mat-icon>
                <div>
                  <strong>R{{ financialData?.totalRevenue || 0 | number:'1.2-2' }}</strong>
                  <span>Total Revenue</span>
                </div>
              </div>
              <div class="stat">
                <mat-icon>trending_up</mat-icon>
                <div>
                  <strong>R{{ financialData?.averageJobValue || 0 | number:'1.2-2' }}</strong>
                  <span>Avg Job Value</span>
                </div>
              </div>
            </div>

            <div class="availability-toggle">
              <mat-slide-toggle 
                [checked]="profile?.isAvailable" 
                (change)="toggleAvailability()"
                color="primary">
                {{ profile?.isAvailable ? 'Available for Jobs' : 'Not Available' }}
              </mat-slide-toggle>
              <p class="availability-hint">
                Toggle to {{ profile?.isAvailable ? 'stop' : 'start' }} receiving new job requests
              </p>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Financial Summary Card -->
        <mat-card class="financial-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>account_balance_wallet</mat-icon>
            <mat-card-title>Financial Overview</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="financial-stats">
              <div class="financial-item">
                <div class="financial-label">Last 30 Days</div>
                <div class="financial-value">R{{ financialData?.last30DaysRevenue || 0 | number:'1.2-2' }}</div>
              </div>
              <div class="financial-item">
                <div class="financial-label">Previous 30 Days</div>
                <div class="financial-value">R{{ financialData?.last60DaysRevenue || 0 | number:'1.2-2' }}</div>
              </div>
              <div class="financial-item" [class.positive]="(financialData?.revenueGrowth || 0) > 0" 
                   [class.negative]="(financialData?.revenueGrowth || 0) < 0">
                <div class="financial-label">Revenue Growth</div>
                <div class="financial-value">
                  <mat-icon>{{ (financialData?.revenueGrowth || 0) >= 0 ? 'trending_up' : 'trending_down' }}</mat-icon>
                  {{ financialData?.revenueGrowth || 0 | number:'1.1-1' }}%
                </div>
              </div>
            </div>

            <!-- Monthly Revenue Chart -->
            <div class="monthly-revenue" *ngIf="(financialData?.monthlyRevenue?.length || 0) > 0">
              <h4>Monthly Revenue Trend</h4>
              <div class="revenue-bars">
                <div *ngFor="let month of (financialData?.monthlyRevenue || [])" class="revenue-bar-item">
                  <div class="bar-container">
                    <div class="bar" [style.height.%]="getBarHeight(month.revenue)"></div>
                  </div>
                  <div class="bar-label">{{ getMonthName(month.month) }}</div>
                  <div class="bar-value">R{{ month.revenue | number:'1.0-0' }}</div>
                  <div class="bar-jobs">{{ month.jobCount }} jobs</div>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Tabbed Content -->
        <mat-card class="content-tabs">
          <mat-tab-group>
            <!-- Service Schedule Tab -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon>calendar_today</mat-icon>
                Service Schedule ({{ scheduledAppointments.length }})
              </ng-template>
              <div class="tab-content">
                <div *ngIf="scheduledAppointments.length === 0" class="empty-state">
                  <mat-icon>event_busy</mat-icon>
                  <p>No upcoming appointments scheduled</p>
                  <p class="empty-hint">Scheduled appointments will appear here</p>
                </div>

                <div *ngIf="scheduledAppointments.length > 0" class="appointments-list">
                  <div *ngFor="let appointment of scheduledAppointments" class="appointment-item">
                    <div class="appointment-date">
                      <div class="date-icon">
                        <mat-icon>calendar_today</mat-icon>
                      </div>
                      <div class="date-info">
                        <strong>{{ appointment.scheduledDate | date:'fullDate' }}</strong>
                        <span>{{ appointment.scheduledDate | date:'shortTime' }}</span>
                      </div>
                    </div>
                    <div class="appointment-details">
                      <h3>{{ appointment.vehicleRegistration }}</h3>
                      <p><strong>{{ appointment.category }}</strong></p>
                      <p>{{ appointment.description }}</p>
                      <div class="detail-row">
                        <mat-icon>location_on</mat-icon>
                        <span>{{ appointment.location }}</span>
                      </div>
                      <div class="detail-row">
                        <mat-chip [class]="'priority-' + appointment.priority.toLowerCase()">
                          {{ appointment.priority }} Priority
                        </mat-chip>
                        <mat-chip class="scheduled-by">
                          Scheduled by {{ appointment.scheduledBy }}
                        </mat-chip>
                      </div>
                    </div>
                    <div class="appointment-actions">
                      <button mat-raised-button color="primary">
                        <mat-icon>check_circle</mat-icon>
                        Start Job
                      </button>
                      <button mat-stroked-button>
                        <mat-icon>phone</mat-icon>
                        Contact Owner
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </mat-tab>

            <!-- Recent Maintenance Tab -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon>history</mat-icon>
                Recent Maintenance ({{ completedMaintenance.length }})
              </ng-template>
              <div class="tab-content">
                <div *ngIf="completedMaintenance.length === 0" class="empty-state">
                  <mat-icon>build_circle</mat-icon>
                  <p>No completed maintenance records</p>
                  <p class="empty-hint">Completed jobs will appear here</p>
                </div>

                <div *ngIf="completedMaintenance.length > 0" class="maintenance-list">
                  <div *ngFor="let record of completedMaintenance" class="maintenance-item">
                    <div class="maintenance-header">
                      <div>
                        <h3>{{ record.vehicleRegistration }}</h3>
                        <p class="completion-date">
                          <mat-icon>event</mat-icon>
                          Completed: {{ record.completedDate | date:'medium' }}
                        </p>
                      </div>
                      <div class="maintenance-cost">
                        <strong>R{{ record.cost | number:'1.2-2' }}</strong>
                        <span class="invoice-number" *ngIf="record.invoiceNumber">
                          #{{ record.invoiceNumber }}
                        </span>
                      </div>
                    </div>
                    <div class="maintenance-details">
                      <div class="detail-item">
                        <mat-icon>build</mat-icon>
                        <span><strong>Type:</strong> {{ record.maintenanceType }}</span>
                      </div>
                      <div class="detail-item">
                        <mat-icon>settings</mat-icon>
                        <span><strong>Component:</strong> {{ record.component }}</span>
                      </div>
                      <div class="detail-item">
                        <mat-icon>speed</mat-icon>
                        <span><strong>Mileage:</strong> {{ record.mileageAtMaintenance | number }} km</span>
                      </div>
                    </div>
                    <p class="maintenance-description">{{ record.description }}</p>
                  </div>
                </div>
              </div>
            </mat-tab>

            <!-- Financial Details Tab -->
            <mat-tab>
              <ng-template mat-tab-label>
                <mat-icon>analytics</mat-icon>
                Financial Details
              </ng-template>
              <div class="tab-content">
                <div class="financial-details">
                  <div class="summary-cards">
                    <mat-card class="summary-card revenue">
                      <mat-icon>attach_money</mat-icon>
                      <div class="card-content">
                        <h3>Total Revenue</h3>
                        <p class="amount">R{{ financialData?.totalRevenue || 0 | number:'1.2-2' }}</p>
                        <span class="subtitle">All time earnings</span>
                      </div>
                    </mat-card>

                    <mat-card class="summary-card jobs">
                      <mat-icon>assignment_turned_in</mat-icon>
                      <div class="card-content">
                        <h3>Completed Jobs</h3>
                        <p class="amount">{{ financialData?.totalJobsCompleted || 0 }}</p>
                        <span class="subtitle">Total jobs completed</span>
                      </div>
                    </mat-card>

                    <mat-card class="summary-card average">
                      <mat-icon>show_chart</mat-icon>
                      <div class="card-content">
                        <h3>Average Job Value</h3>
                        <p class="amount">R{{ financialData?.averageJobValue || 0 | number:'1.2-2' }}</p>
                        <span class="subtitle">Per completed job</span>
                      </div>
                    </mat-card>

                    <mat-card class="summary-card recent">
                      <mat-icon>calendar_month</mat-icon>
                      <div class="card-content">
                        <h3>Last 30 Days</h3>
                        <p class="amount">R{{ financialData?.last30DaysRevenue || 0 | number:'1.2-2' }}</p>
                        <span class="subtitle" [class.positive]="(financialData?.revenueGrowth || 0) > 0" 
                              [class.negative]="(financialData?.revenueGrowth || 0) < 0">
                          {{ (financialData?.revenueGrowth || 0) >= 0 ? '+' : '' }}{{ financialData?.revenueGrowth || 0 | number:'1.1-1' }}% vs previous month
                        </span>
                      </div>
                    </mat-card>
                  </div>
                </div>
              </div>
            </mat-tab>
          </mat-tab-group>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .dashboard-page {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
      background: #f5f5f5;
      min-height: 100vh;
    }

    .page-header {
      margin-bottom: 30px;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 20px;
    }

    .user-info {
      display: flex;
      flex-direction: column;
      align-items: flex-end;

      .user-name {
        font-weight: 500;
        font-size: 14px;
      }

      .user-role {
        font-size: 12px;
        opacity: 0.8;
      }
    }

    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 60px;
    }

    .dashboard-content {
      display: grid;
      grid-template-columns: 1fr;
      gap: 20px;
    }

    .profile-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .profile-card mat-card-header {
      color: white;
    }

    .profile-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 20px;
      margin: 20px 0;
      padding: 20px 0;
      border-top: 1px solid rgba(255,255,255,0.2);
      border-bottom: 1px solid rgba(255,255,255,0.2);
    }

    .stat {
      display: flex;
      align-items: center;
      gap: 10px;
      text-align: left;
    }

    .stat mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      opacity: 0.8;
    }

    .stat strong {
      font-size: 24px;
      display: block;
    }

    .stat span {
      font-size: 12px;
      opacity: 0.8;
      display: block;
    }

    .availability-toggle {
      margin-top: 20px;
      text-align: center;
    }

    .availability-hint {
      margin: 10px 0 0 0;
      font-size: 13px;
      opacity: 0.9;
    }

    .financial-card {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
    }

    .financial-card mat-card-header {
      color: white;
    }

    .financial-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin: 20px 0;
    }

    .financial-item {
      background: rgba(255,255,255,0.1);
      padding: 15px;
      border-radius: 8px;
      text-align: center;
    }

    .financial-label {
      font-size: 13px;
      opacity: 0.9;
      margin-bottom: 8px;
    }

    .financial-value {
      font-size: 24px;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 5px;
    }

    .financial-item.positive .financial-value {
      color: #4caf50;
    }

    .financial-item.negative .financial-value {
      color: #f44336;
    }

    .monthly-revenue {
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid rgba(255,255,255,0.2);
    }

    .monthly-revenue h4 {
      margin-bottom: 20px;
    }

    .revenue-bars {
      display: flex;
      justify-content: space-around;
      align-items: flex-end;
      height: 200px;
      gap: 10px;
    }

    .revenue-bar-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
    }

    .bar-container {
      width: 100%;
      height: 150px;
      display: flex;
      align-items: flex-end;
    }

    .bar {
      width: 100%;
      background: rgba(255,255,255,0.8);
      border-radius: 4px 4px 0 0;
      transition: all 0.3s ease;
      min-height: 5px;
    }

    .bar:hover {
      background: rgba(255,255,255,1);
    }

    .bar-label {
      font-size: 11px;
      margin-top: 5px;
      opacity: 0.9;
    }

    .bar-value {
      font-size: 13px;
      font-weight: bold;
      margin-top: 2px;
    }

    .bar-jobs {
      font-size: 10px;
      opacity: 0.8;
    }

    .content-tabs {
      margin-top: 20px;
    }

    .tab-content {
      padding: 20px;
    }

    .empty-state {
      text-align: center;
      padding: 60px 40px;
      color: #666;
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      opacity: 0.3;
      margin-bottom: 10px;
    }

    .empty-hint {
      font-size: 13px;
      color: #999;
      margin-top: 10px;
    }

    /* Appointments Styles */
    .appointments-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .appointment-item {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      background: white;
      display: grid;
      grid-template-columns: auto 1fr auto;
      gap: 20px;
      align-items: start;
      transition: box-shadow 0.3s;
    }

    .appointment-item:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .appointment-date {
      display: flex;
      align-items: center;
      gap: 15px;
      background: #f5f5f5;
      padding: 15px;
      border-radius: 8px;
      min-width: 200px;
    }

    .date-icon mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #667eea;
    }

    .date-info strong {
      display: block;
      font-size: 14px;
      margin-bottom: 4px;
    }

    .date-info span {
      font-size: 13px;
      color: #666;
    }

    .appointment-details h3 {
      margin: 0 0 10px 0;
      font-size: 18px;
    }

    .appointment-details p {
      margin: 5px 0;
      color: #666;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 10px 0;
      color: #666;
    }

    .detail-row mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .appointment-actions {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 160px;
    }

    /* Maintenance Styles */
    .maintenance-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .maintenance-item {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      background: white;
      transition: box-shadow 0.3s;
    }

    .maintenance-item:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .maintenance-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
    }

    .maintenance-header h3 {
      margin: 0 0 5px 0;
      font-size: 18px;
    }

    .completion-date {
      display: flex;
      align-items: center;
      gap: 5px;
      color: #666;
      font-size: 13px;
      margin: 0;
    }

    .completion-date mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .maintenance-cost {
      text-align: right;
    }

    .maintenance-cost strong {
      font-size: 24px;
      color: #4caf50;
      display: block;
    }

    .invoice-number {
      font-size: 12px;
      color: #666;
      display: block;
      margin-top: 4px;
    }

    .maintenance-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin: 15px 0;
      padding: 15px;
      background: #f5f5f5;
      border-radius: 8px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 14px;
    }

    .detail-item mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #667eea;
    }

    .maintenance-description {
      color: #666;
      line-height: 1.5;
      margin: 10px 0 0 0;
    }

    /* Financial Details Styles */
    .financial-details {
      padding: 20px 0;
    }

    .summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .summary-card {
      padding: 24px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 20px;
      transition: transform 0.2s;
    }

    .summary-card:hover {
      transform: translateY(-4px);
    }

    .summary-card.revenue {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .summary-card.jobs {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
    }

    .summary-card.average {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      color: white;
    }

    .summary-card.recent {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
      color: white;
    }

    .summary-card mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      opacity: 0.9;
    }

    .summary-card .card-content h3 {
      margin: 0 0 8px 0;
      font-size: 14px;
      opacity: 0.9;
      font-weight: normal;
    }

    .summary-card .amount {
      margin: 0;
      font-size: 28px;
      font-weight: bold;
    }

    .summary-card .subtitle {
      font-size: 12px;
      opacity: 0.8;
      display: block;
      margin-top: 4px;
    }

    .subtitle.positive {
      color: #4caf50;
    }

    .subtitle.negative {
      color: #f44336;
    }

    /* Chip Styles */
    mat-chip {
      font-weight: 500;
    }

    .priority-high {
      background-color: #f44336 !important;
      color: white !important;
    }

    .priority-medium {
      background-color: #ff9800 !important;
      color: white !important;
    }

    .priority-low {
      background-color: #4caf50 !important;
      color: white !important;
    }

    .scheduled-by {
      background-color: #2196f3 !important;
      color: white !important;
    }

    @media (max-width: 768px) {
      .profile-stats,
      .financial-stats,
      .maintenance-details,
      .summary-cards {
        grid-template-columns: 1fr;
      }

      .appointment-item {
        grid-template-columns: 1fr;
      }

      .appointment-date {
        min-width: auto;
      }

      .appointment-actions {
        min-width: auto;
      }

      .appointment-actions button {
        width: 100%;
      }

      .revenue-bars {
        height: 150px;
      }

      .bar-container {
        height: 100px;
      }
    }
  `]
})
export class ServiceProviderDashboardComponent implements OnInit {
  userData: any;
  profile: ServiceProviderProfile | null = null;
  scheduledAppointments: ScheduledAppointment[] = [];
  completedMaintenance: CompletedMaintenance[] = [];
  financialData: FinancialData | null = null;
  loading = true;

  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit(): Promise<void> {
    // Get user info from local storage
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
    }
    await this.loadDashboardData();
  }

  async loadDashboardData(): Promise<void> {
    try {
      const userStr = localStorage.getItem('user');
      console.log('Service Provider Dashboard - Raw user data:', userStr);
      
      if (!userStr) {
        console.error('No user found in localStorage, redirecting to login');
        this.router.navigate(['/login']);
        return;
      }

      const user = JSON.parse(userStr);
      console.log('Service Provider Dashboard - Parsed user object:', user);
      
      // Try to get userId from different possible properties
      const userId = user.userId || user.id || user.UserId || user.Id;
      
      console.log('Service Provider userId extracted:', userId);

      if (!userId) {
        console.error('No userId found in user object. Available keys:', Object.keys(user));
        this.snackBar.open('User ID not found. Please log in again.', 'Close', { duration: 5000 });
        this.router.navigate(['/login']);
        return;
      }

      // Load profile
      console.log('Attempting to load service provider profile...');
      const profileUrl = `${environment.apiUrl}/ServiceProviderProfiles/user/${userId}`;
      console.log('Profile URL:', profileUrl);
      
      try {
        this.profile = await this.http.get<ServiceProviderProfile>(profileUrl).toPromise() as ServiceProviderProfile;
        console.log('Service provider profile loaded successfully:', this.profile);

        // Load dashboard data if profile exists and has a business name
        if (this.profile && this.profile.businessName) {
          console.log('Loading dashboard data for business:', this.profile.businessName);
          try {
            const dashboardData = await this.http.get<any>(
              `${environment.apiUrl}/ServiceProviderDashboard/${encodeURIComponent(this.profile.businessName)}`
            ).toPromise();

            console.log('Dashboard data loaded:', dashboardData);

            // Load appointments
            this.scheduledAppointments = dashboardData.upcomingAppointments?.appointments || [];
            
            // Load completed maintenance
            this.completedMaintenance = dashboardData.recentMaintenance?.records || [];
            
            // Load financial data
            this.financialData = dashboardData.financial || {
              totalRevenue: 0,
              last30DaysRevenue: 0,
              last60DaysRevenue: 0,
              revenueGrowth: 0,
              totalJobsCompleted: 0,
              averageJobValue: 0,
              monthlyRevenue: []
            };
          } catch (dashboardError: any) {
            console.error('Error loading dashboard data:', dashboardError);
            // Initialize with empty data if dashboard load fails
            this.financialData = {
              totalRevenue: 0,
              last30DaysRevenue: 0,
              last60DaysRevenue: 0,
              revenueGrowth: 0,
              totalJobsCompleted: 0,
              averageJobValue: 0,
              monthlyRevenue: []
            };
            this.snackBar.open('Dashboard data not available yet. Complete some jobs to see statistics.', 'Close', { duration: 3000 });
          }
        } else {
          console.warn('Profile loaded but businessName is missing');
          // Initialize with empty financial data
          this.financialData = {
            totalRevenue: 0,
            last30DaysRevenue: 0,
            last60DaysRevenue: 0,
            revenueGrowth: 0,
            totalJobsCompleted: 0,
            averageJobValue: 0,
            monthlyRevenue: []
          };
        }
      } catch (profileError: any) {
        console.error('Error loading service provider profile:', profileError);
        
        // If profile doesn't exist yet (404), create a placeholder
        if (profileError.status === 404) {
          console.log('Service provider profile not found - this may be a new registration');
          this.profile = {
            id: '',
            businessName: user.email || 'Service Provider',
            serviceTypes: 'General Maintenance',
            isAvailable: true,
            isActive: true,
            totalJobs: 0,
            completedJobs: 0
          };
          this.financialData = {
            totalRevenue: 0,
            last30DaysRevenue: 0,
            last60DaysRevenue: 0,
            revenueGrowth: 0,
            totalJobsCompleted: 0,
            averageJobValue: 0,
            monthlyRevenue: []
          };
          this.snackBar.open('Welcome! Please complete your profile setup.', 'Close', { duration: 5000 });
        } else {
          throw profileError;
        }
      }

      this.loading = false;
    } catch (error) {
      console.error('Error loading dashboard:', error);
      this.snackBar.open('Failed to load dashboard data. Please try refreshing the page.', 'Close', { duration: 5000 });
      this.loading = false;
    }
  }

  getBarHeight(revenue: number): number {
    if (!this.financialData || !this.financialData.monthlyRevenue || this.financialData.monthlyRevenue.length === 0) {
      return 0;
    }
    const maxRevenue = Math.max(...this.financialData.monthlyRevenue.map(m => m.revenue));
    return maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
  }

  getMonthName(month: number): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1] || '';
  }

  async toggleAvailability(): Promise<void> {
    try {
      await this.http.patch(
        `${environment.apiUrl}/ServiceProviderProfiles/${this.profile?.id}/toggle-availability`,
        {}
      ).toPromise();

      if (this.profile) {
        this.profile.isAvailable = !this.profile.isAvailable;
      }

      this.snackBar.open(
        `You are now ${this.profile?.isAvailable ? 'available' : 'unavailable'} for jobs`,
        'Close',
        { duration: 3000 }
      );
    } catch (error) {
      console.error('Error toggling availability:', error);
      this.snackBar.open('Failed to update availability', 'Close', { duration: 5000 });
    }
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
    this.router.navigate(['/login']);
  }
}
