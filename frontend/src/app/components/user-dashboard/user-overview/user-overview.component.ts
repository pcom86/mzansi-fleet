import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';

interface ServiceOption {
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
  available: boolean;
}

interface RecentActivity {
  id: string;
  type: 'tender' | 'rental' | 'trip';
  title: string;
  description: string;
  date: Date;
  status: string;
  icon: string;
}

@Component({
  selector: 'app-user-overview',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDividerModule
  ],
  template: `
    <div class="overview-container">
      <!-- Loading State -->
      <div class="loading-state" *ngIf="loading">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        <p>Loading your dashboard...</p>
      </div>

      <div *ngIf="!loading" class="content">
        <!-- User Profile Card -->
        <mat-card class="profile-card">
          <div class="profile-header">
            <div class="avatar-section">
              <div class="avatar">
                <mat-icon>person</mat-icon>
              </div>
              <div class="user-info">
                <h1>{{ userData?.fullName || userData?.email || 'User' }}</h1>
                <p class="user-email">{{ userData?.email }}</p>
                <mat-chip class="role-chip">{{ userData?.role || 'Normal User' }}</mat-chip>
              </div>
            </div>
            <div class="account-actions">
              <button mat-raised-button color="primary" (click)="editProfile()">
                <mat-icon>edit</mat-icon>
                Edit Profile
              </button>
            </div>
          </div>
          
          <mat-divider></mat-divider>
          
          <div class="profile-details">
            <div class="detail-item">
              <mat-icon>phone</mat-icon>
              <div>
                <span class="label">Phone Number</span>
                <span class="value">{{ userData?.phoneNumber || 'Not provided' }}</span>
              </div>
            </div>
            <div class="detail-item">
              <mat-icon>location_on</mat-icon>
              <div>
                <span class="label">Location</span>
                <span class="value">{{ userData?.location || 'Not specified' }}</span>
              </div>
            </div>
            <div class="detail-item">
              <mat-icon>calendar_today</mat-icon>
              <div>
                <span class="label">Member Since</span>
                <span class="value">{{ memberSince || 'Recently joined' }}</span>
              </div>
            </div>
            <div class="detail-item">
              <mat-icon>verified</mat-icon>
              <div>
                <span class="label">Account Status</span>
                <mat-chip [class.verified]="userData?.isVerified" [class.pending]="!userData?.isVerified">
                  {{ userData?.isVerified ? 'Verified' : 'Pending Verification' }}
                </mat-chip>
              </div>
            </div>
          </div>
        </mat-card>

        <!-- Quick Stats Dashboard -->
        <div class="stats-dashboard">
          <h2 class="section-title">
            <mat-icon>analytics</mat-icon>
            Your Activity Summary
          </h2>
          <div class="stats-grid">
            <mat-card class="stat-card tenders">
              <div class="stat-icon">
                <mat-icon>description</mat-icon>
              </div>
              <div class="stat-content">
                <h3>{{ activeTendersCount }}</h3>
                <p>Active Tenders</p>
                <span class="stat-detail">{{ totalTendersCount }} total posted</span>
              </div>
            </mat-card>
            
            <mat-card class="stat-card rentals">
              <div class="stat-icon">
                <mat-icon>car_rental</mat-icon>
              </div>
              <div class="stat-content">
                <h3>{{ activeRentalRequestsCount }}</h3>
                <p>Active Rentals</p>
                <span class="stat-detail">{{ totalRentalsCount }} total requests</span>
              </div>
            </mat-card>
            
            <mat-card class="stat-card trips">
              <div class="stat-icon">
                <mat-icon>map</mat-icon>
              </div>
              <div class="stat-content">
                <h3>{{ completedTripsCount }}</h3>
                <p>Completed Trips</p>
                <span class="stat-detail">{{ totalBookingsCount }} total bookings</span>
              </div>
            </mat-card>
            
            <mat-card class="stat-card savings">
              <div class="stat-icon">
                <mat-icon>savings</mat-icon>
              </div>
              <div class="stat-content">
                <h3>R{{ totalSpent.toFixed(0) }}</h3>
                <p>Total Spent</p>
                <span class="stat-detail">This month: R{{ monthlySpent.toFixed(0) }}</span>
              </div>
            </mat-card>
          </div>
        </div>

        <!-- Recent Activity -->
        <div class="recent-activity-section">
          <div class="section-header">
            <h2 class="section-title">
              <mat-icon>history</mat-icon>
              Recent Activity
            </h2>
            <button mat-button color="primary" (click)="viewAllActivity()">
              View All
              <mat-icon>arrow_forward</mat-icon>
            </button>
          </div>

          <div *ngIf="recentActivities.length === 0" class="no-activity">
            <mat-icon>inbox</mat-icon>
            <p>No recent activity</p>
            <span>Start using our services to see your activity here</span>
          </div>

          <div class="activity-list" *ngIf="recentActivities.length > 0">
            <mat-card *ngFor="let activity of recentActivities" class="activity-card">
              <div class="activity-icon" [class]="activity.type">
                <mat-icon>{{ activity.icon }}</mat-icon>
              </div>
              <div class="activity-content">
                <h4>{{ activity.title }}</h4>
                <p>{{ activity.description }}</p>
                <div class="activity-meta">
                  <span class="activity-date">{{ activity.date | date: 'short' }}</span>
                  <mat-chip [class]="'status-' + activity.status.toLowerCase()">
                    {{ activity.status }}
                  </mat-chip>
                </div>
              </div>
            </mat-card>
          </div>
        </div>

        <!-- Available Services -->
        <div class="services-section">
          <h2 class="section-title">
            <mat-icon>apps</mat-icon>
            Available Services
          </h2>
          <div class="services-grid">
            <mat-card 
              *ngFor="let service of services" 
              class="service-card"
              [class.unavailable]="!service.available"
              (click)="navigateTo(service)">
              <div class="service-header" [style.background]="service.color">
                <mat-icon class="service-icon">{{ service.icon }}</mat-icon>
              </div>
              <mat-card-content>
                <h3>{{ service.title }}</h3>
                <p>{{ service.description }}</p>
              </mat-card-content>
              <mat-card-actions>
                <button 
                  mat-raised-button 
                  color="primary" 
                  [disabled]="!service.available">
                  {{ service.available ? 'Get Started' : 'Coming Soon' }}
                  <mat-icon>{{ service.available ? 'arrow_forward' : 'schedule' }}</mat-icon>
                </button>
              </mat-card-actions>
              <div class="coming-soon-badge" *ngIf="!service.available">
                <mat-icon>schedule</mat-icon>
                Coming Soon
              </div>
            </mat-card>
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="quick-actions-section">
          <h2 class="section-title">
            <mat-icon>flash_on</mat-icon>
            Quick Actions
          </h2>
          <div class="quick-actions-grid">
            <button mat-raised-button class="quick-action-btn tender" (click)="router.navigate(['/user-dashboard/tenders/post'])">
              <mat-icon>add_circle</mat-icon>
              <span>Post New Tender</span>
            </button>
            <button mat-raised-button class="quick-action-btn rental" (click)="router.navigate(['/user-dashboard/rental/request'])">
              <mat-icon>directions_car</mat-icon>
              <span>Request Rental</span>
            </button>
            <button mat-raised-button class="quick-action-btn trips" (click)="router.navigate(['/user-dashboard/trips'])">
              <mat-icon>map</mat-icon>
              <span>View My Trips</span>
            </button>
            <button mat-raised-button class="quick-action-btn support" (click)="contactSupport()">
              <mat-icon>support_agent</mat-icon>
              <span>Contact Support</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .overview-container {
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem;
      gap: 1.5rem;
    }

    .loading-state p {
      font-size: 1.1rem;
      color: #6c757d;
    }

    .content {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    /* Profile Card */
    .profile-card {
      border-radius: 16px;
      overflow: hidden;
    }

    .profile-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 2rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .avatar-section {
      display: flex;
      gap: 1.5rem;
      align-items: center;
    }

    .avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      border: 3px solid rgba(255, 255, 255, 0.3);
    }

    .avatar mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: white;
    }

    .user-info h1 {
      margin: 0 0 0.5rem;
      font-size: 1.75rem;
      font-weight: 600;
    }

    .user-email {
      margin: 0 0 0.75rem;
      opacity: 0.9;
      font-size: 1rem;
    }

    .role-chip {
      background: rgba(255, 255, 255, 0.3) !important;
      color: white !important;
      font-weight: 600;
    }

    .account-actions button {
      background: white;
      color: #667eea;
    }

    .profile-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      padding: 2rem;
    }

    .detail-item {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .detail-item mat-icon {
      color: #667eea;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .detail-item .label {
      display: block;
      font-size: 0.875rem;
      color: #6c757d;
      margin-bottom: 0.25rem;
    }

    .detail-item .value {
      display: block;
      font-size: 1rem;
      color: #000;
      font-weight: 500;
    }

    .verified {
      background: #4CAF50 !important;
      color: white !important;
    }

    .pending {
      background: #FF9800 !important;
      color: white !important;
    }

    /* Section Titles */
    .section-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.5rem;
      font-weight: 600;
      color: #000;
      margin: 0 0 1.5rem;
    }

    .section-title mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #667eea;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .section-header button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    /* Stats Dashboard */
    .stats-dashboard {
      margin-bottom: 1rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding: 1.5rem;
      border-radius: 12px;
      transition: all 0.3s ease;
      border-left: 4px solid transparent;
    }

    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
    }

    .stat-card.tenders {
      border-left-color: #D4AF37;
    }

    .stat-card.rentals {
      border-left-color: #4CAF50;
    }

    .stat-card.trips {
      border-left-color: #9C27B0;
    }

    .stat-card.savings {
      border-left-color: #FF9800;
    }

    .stat-icon {
      width: 64px;
      height: 64px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .tenders .stat-icon {
      background: linear-gradient(135deg, #D4AF37 0%, #C5A028 100%);
    }

    .rentals .stat-icon {
      background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
    }

    .trips .stat-icon {
      background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%);
    }

    .savings .stat-icon {
      background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
    }

    .stat-icon mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: white;
    }

    .stat-content h3 {
      font-size: 2rem;
      font-weight: 700;
      color: #000;
      margin: 0 0 0.25rem;
    }

    .stat-content p {
      font-size: 0.95rem;
      color: #6c757d;
      margin: 0 0 0.5rem;
      font-weight: 500;
    }

    .stat-detail {
      font-size: 0.875rem;
      color: #9e9e9e;
    }

    /* Recent Activity */
    .no-activity {
      text-align: center;
      padding: 3rem;
      color: #9e9e9e;
    }

    .no-activity mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #e0e0e0;
      margin-bottom: 1rem;
    }

    .no-activity p {
      font-size: 1.25rem;
      font-weight: 500;
      margin: 0 0 0.5rem;
      color: #6c757d;
    }

    .no-activity span {
      font-size: 0.95rem;
    }

    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .activity-card {
      display: flex;
      gap: 1rem;
      padding: 1.5rem;
      border-radius: 12px;
      transition: all 0.3s ease;
    }

    .activity-card:hover {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .activity-icon {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .activity-icon.tender {
      background: linear-gradient(135deg, #D4AF37 0%, #C5A028 100%);
    }

    .activity-icon.rental {
      background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
    }

    .activity-icon.trip {
      background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%);
    }

    .activity-icon mat-icon {
      color: white;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .activity-content {
      flex: 1;
    }

    .activity-content h4 {
      margin: 0 0 0.5rem;
      font-size: 1.1rem;
      font-weight: 600;
      color: #000;
    }

    .activity-content p {
      margin: 0 0 0.75rem;
      color: #6c757d;
      font-size: 0.95rem;
    }

    .activity-meta {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 0.5rem;
    }

    .activity-date {
      font-size: 0.875rem;
      color: #9e9e9e;
    }

    .status-pending {
      background: #FF9800 !important;
      color: white !important;
    }

    .status-active {
      background: #2196F3 !important;
      color: white !important;
    }

    .status-completed {
      background: #4CAF50 !important;
      color: white !important;
    }

    .status-cancelled {
      background: #F44336 !important;
      color: white !important;
    }

    /* Services Section */
    .services-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
    }

    .service-card {
      cursor: pointer;
      transition: all 0.3s ease;
      border-radius: 12px;
      position: relative;
      overflow: visible;
    }

    .service-card:not(.unavailable):hover {
      transform: translateY(-6px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
    }

    .service-card.unavailable {
      opacity: 0.7;
      cursor: not-allowed;
    }

    .service-header {
      height: 100px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px 12px 0 0;
    }

    .service-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: white;
    }

    .service-card mat-card-content {
      padding: 1.5rem;
      text-align: center;
    }

    .service-card mat-card-content h3 {
      font-size: 1.25rem;
      color: #000;
      margin: 0 0 0.5rem;
      font-weight: 600;
    }

    .service-card mat-card-content p {
      color: #6c757d;
      line-height: 1.5;
      margin: 0;
      font-size: 0.95rem;
    }

    .service-card mat-card-actions {
      padding: 0 1.5rem 1.5rem;
    }

    .service-card button {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .coming-soon-badge {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .coming-soon-badge mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Quick Actions */
    .quick-actions-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1rem;
    }

    .quick-action-btn {
      height: 80px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 12px;
      transition: all 0.3s ease;
    }

    .quick-action-btn:hover {
      transform: translateY(-4px);
      box-shadow: 0 6px 16px rgba(0, 0, 0, 0.15);
    }

    .quick-action-btn mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .quick-action-btn.tender {
      background: linear-gradient(135deg, #D4AF37 0%, #C5A028 100%);
      color: white;
    }

    .quick-action-btn.rental {
      background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
      color: white;
    }

    .quick-action-btn.trips {
      background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%);
      color: white;
    }

    .quick-action-btn.support {
      background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
      color: white;
    }

    @media (max-width: 768px) {
      .overview-container {
        padding: 1rem;
      }

      .profile-header {
        flex-direction: column;
        gap: 1.5rem;
      }

      .profile-details {
        grid-template-columns: 1fr;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }

      .services-grid {
        grid-template-columns: 1fr;
      }

      .quick-actions-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .section-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }
    }
  `]
})
export class UserOverviewComponent implements OnInit {
  loading = true;
  userData: any = null;
  memberSince: string = '';
  activeTendersCount: number = 0;
  totalTendersCount: number = 0;
  totalBookingsCount: number = 0;
  completedTripsCount: number = 0;
  activeRentalRequestsCount: number = 0;
  totalRentalsCount: number = 0;
  totalSpent: number = 0;
  monthlySpent: number = 0;
  recentActivities: RecentActivity[] = [];

  services: ServiceOption[] = [
    {
      title: 'Post Tenders',
      description: 'Advertise transport tenders and receive competitive bids from fleet owners',
      icon: 'description',
      route: '/user-dashboard/tenders',
      color: 'linear-gradient(135deg, #D4AF37 0%, #C5A028 100%)',
      available: true
    },
    {
      title: 'Rent a Car',
      description: 'View and manage your vehicle rental requests',
      icon: 'car_rental',
      route: '/user-dashboard/rental',
      color: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)',
      available: true
    },
    {
      title: 'Call a Cab',
      description: 'Request an on-demand taxi service for immediate transportation',
      icon: 'local_taxi',
      route: '/user-dashboard/cab',
      color: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)',
      available: false
    },
    {
      title: 'Manage Trips',
      description: 'View, track, and manage all your scheduled and completed trips',
      icon: 'map',
      route: '/user-dashboard/trips',
      color: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)',
      available: false
    }
  ];

  constructor(
    public router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    this.loadUserData();
  }

  async loadUserData(): Promise<void> {
    try {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        this.userData = JSON.parse(userStr);
        
        // Calculate member since date
        if (this.userData.createdAt) {
          const createdDate = new Date(this.userData.createdAt);
          this.memberSince = createdDate.toLocaleDateString('en-US', { 
            month: 'long', 
            year: 'numeric' 
          });
        }
        
        // Load user statistics
        await this.loadUserStats();
        await this.loadRecentActivity();
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadUserStats(): Promise<void> {
    try {
      // Load tenders
      const tenders: any = await this.http.get('http://localhost:5000/api/Tenders').toPromise();
      const userTenders = Array.isArray(tenders) 
        ? tenders.filter((t: any) => t.userId === this.userData.userId || t.createdBy === this.userData.email)
        : [];
      this.totalTendersCount = userTenders.length;
      this.activeTendersCount = userTenders.filter((t: any) => 
        t.status === 'Open' || t.status === 'Active'
      ).length;

      // Load rental requests
      const rentals: any = await this.http.get('http://localhost:5000/api/RentalRequests').toPromise();
      const userRentals = Array.isArray(rentals)
        ? rentals.filter((r: any) => r.userId === this.userData.userId || r.requesterId === this.userData.userId)
        : [];
      this.totalRentalsCount = userRentals.length;
      this.activeRentalRequestsCount = userRentals.filter((r: any) => 
        r.status === 'Pending' || r.status === 'Active'
      ).length;

      // Calculate spending (mock data for now)
      this.totalSpent = userRentals.reduce((sum: number, r: any) => sum + (r.totalCost || 0), 0);
      
      // Calculate monthly spending
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthlyRentals = userRentals.filter((r: any) => {
        const rentalDate = new Date(r.createdAt || r.startDate);
        return rentalDate >= startOfMonth;
      });
      this.monthlySpent = monthlyRentals.reduce((sum: number, r: any) => sum + (r.totalCost || 0), 0);

      // Mock trip data (to be replaced with actual API call)
      this.completedTripsCount = 0;
      this.totalBookingsCount = 0;

    } catch (error) {
      console.error('Error loading user stats:', error);
    }
  }

  async loadRecentActivity(): Promise<void> {
    try {
      const activities: RecentActivity[] = [];

      // Load recent tenders
      const tenders: any = await this.http.get('http://localhost:5000/api/Tenders').toPromise();
      const userTenders = Array.isArray(tenders)
        ? tenders.filter((t: any) => t.userId === this.userData.userId || t.createdBy === this.userData.email)
        : [];
      
      userTenders.slice(0, 3).forEach((tender: any) => {
        activities.push({
          id: tender.id,
          type: 'tender',
          title: tender.title || 'Tender Posted',
          description: tender.description || 'Transport tender posted',
          date: new Date(tender.createdAt || tender.postDate),
          status: tender.status || 'Active',
          icon: 'description'
        });
      });

      // Load recent rentals
      const rentals: any = await this.http.get('http://localhost:5000/api/RentalRequests').toPromise();
      const userRentals = Array.isArray(rentals)
        ? rentals.filter((r: any) => r.userId === this.userData.userId || r.requesterId === this.userData.userId)
        : [];
      
      userRentals.slice(0, 2).forEach((rental: any) => {
        activities.push({
          id: rental.id,
          type: 'rental',
          title: 'Vehicle Rental Request',
          description: `${rental.vehicleType || 'Vehicle'} rental from ${rental.pickupLocation || 'location'}`,
          date: new Date(rental.createdAt || rental.startDate),
          status: rental.status || 'Pending',
          icon: 'car_rental'
        });
      });

      // Sort by date (most recent first)
      this.recentActivities = activities
        .sort((a, b) => b.date.getTime() - a.date.getTime())
        .slice(0, 5);

    } catch (error) {
      console.error('Error loading recent activity:', error);
      this.recentActivities = [];
    }
  }

  navigateTo(service: ServiceOption): void {
    if (service.available) {
      this.router.navigate([service.route]);
    }
  }

  editProfile(): void {
    this.router.navigate(['/profile']);
  }

  viewAllActivity(): void {
    this.router.navigate(['/user-dashboard/activity']);
  }

  contactSupport(): void {
    // Open support dialog or navigate to support page
    window.open('mailto:support@mzansifleet.com', '_blank');
  }
}
