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
    <div class="dashboard-content">
      <!-- Metrics Grid -->
      <div class="metrics-grid">
        <mat-card class="metric-card" *ngFor="let stat of userStats">
          <div class="metric-icon" [ngStyle]="{'background': stat.bg}">
            <mat-icon>{{ stat.icon }}</mat-icon>
          </div>
          <div class="metric-info">
            <span class="metric-title">{{ stat.title }}</span>
            <span class="metric-value">{{ stat.value }}</span>
          </div>
        </mat-card>
      </div>

      <!-- Main Content Grid -->
      <div class="content-grid">
        <!-- Recent Activity Card -->
        <mat-card class="chart-card activity-card">
          <div class="card-header">
            <h3>
              <mat-icon>history</mat-icon>
              Recent Activity
            </h3>
            <button mat-stroked-button color="primary" (click)="viewAllActivity()">
              View All
            </button>
          </div>
          <mat-divider></mat-divider>
          <div class="card-body">
            <div *ngIf="recentActivities && recentActivities.length; else noActivity" class="activity-list">
              <div class="activity-item" *ngFor="let activity of recentActivities">
                <div class="activity-icon-wrap" [ngClass]="activity.type">
                  <mat-icon>{{ activity.icon }}</mat-icon>
                </div>
                <div class="activity-details">
                  <span class="activity-title">{{ activity.title }}</span>
                  <span class="activity-desc">{{ activity.description }}</span>
                  <span class="activity-date">{{ activity.date | date:'medium' }}</span>
                </div>
                <span class="activity-status" [ngClass]="activity.status.toLowerCase()">{{ activity.status }}</span>
              </div>
            </div>
            <ng-template #noActivity>
              <div class="empty-state">
                <mat-icon>inbox</mat-icon>
                <p>No recent activity</p>
                <span>Your activity will appear here</span>
              </div>
            </ng-template>
          </div>
        </mat-card>

        <!-- Quick Actions Card -->
        <mat-card class="chart-card quick-actions-card">
          <div class="card-header">
            <h3>
              <mat-icon>flash_on</mat-icon>
              Quick Actions
            </h3>
          </div>
          <mat-divider></mat-divider>
          <div class="card-body">
            <div class="quick-actions-grid">
              <button class="action-btn taxi" (click)="router.navigate(['/user-dashboard/passenger-booking'])">
                <mat-icon>local_taxi</mat-icon>
                <span>Book Taxi</span>
              </button>
              <button class="action-btn schedule" (click)="router.navigate(['/user-dashboard/schedule'])">
                <mat-icon>schedule</mat-icon>
                <span>Taxi Schedules</span>
              </button>
              <button class="action-btn tender" (click)="router.navigate(['/user-dashboard/tenders'])">
                <mat-icon>description</mat-icon>
                <span>Post Tender</span>
              </button>
              <button class="action-btn rental" (click)="router.navigate(['/user-dashboard/rental'])">
                <mat-icon>car_rental</mat-icon>
                <span>Rent Vehicle</span>
              </button>
              <button class="action-btn trips" (click)="router.navigate(['/user-dashboard/trips'])">
                <mat-icon>map</mat-icon>
                <span>My Trips</span>
              </button>
              <button class="action-btn support" (click)="contactSupport()">
                <mat-icon>support_agent</mat-icon>
                <span>Get Support</span>
              </button>
            </div>
          </div>
        </mat-card>
      </div>

      <!-- Available Services -->
      <mat-card class="services-section">
        <div class="card-header">
          <h3>
            <mat-icon>apps</mat-icon>
            Available Services
          </h3>
        </div>
        <mat-divider></mat-divider>
        <div class="card-body">
          <div class="services-grid">
            <div class="service-item" *ngFor="let service of services" 
                 [class.unavailable]="!service.available"
                 (click)="navigateTo(service)">
              <div class="service-icon" [ngStyle]="{'background': service.color}">
                <mat-icon>{{ service.icon }}</mat-icon>
              </div>
              <div class="service-info">
                <span class="service-title">{{ service.title }}</span>
                <span class="service-desc">{{ service.description }}</span>
              </div>
              <div class="service-badge" *ngIf="!service.available">
                <mat-icon>schedule</mat-icon>
                Coming Soon
              </div>
              <mat-icon class="service-arrow" *ngIf="service.available">chevron_right</mat-icon>
            </div>
          </div>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    /* Dashboard Header - Matches Owner Dashboard */
    .dashboard-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
      color: white;
      margin-bottom: 0;
    }

    .header-content {
      max-width: 100%;
      margin: 0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .welcome-section h1 {
      margin: 0 0 0.5rem;
      font-size: 1.75rem;
      font-weight: 600;
    }

    .welcome-section p {
      margin: 0;
      opacity: 0.9;
      font-size: 1rem;
    }

    .date-display {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: rgba(255, 255, 255, 0.2);
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.9rem;
    }

    .date-display mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Dashboard Content */
    .dashboard-content {
      max-width: 100%;
      margin: 0;
      padding: 2rem;
      display: flex;
      flex-direction: column;
      gap: 2rem;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      min-height: calc(100vh - 200px);
    }

    /* Metrics Grid - Matches Owner Dashboard */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .metric-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.5rem;
      border-radius: 12px;
      transition: all 0.3s ease;
      cursor: default;
    }

    .metric-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .metric-icon {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .metric-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: white;
    }

    .metric-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .metric-title {
      font-size: 0.9rem;
      color: #6c757d;
      font-weight: 500;
    }

    .metric-value {
      font-size: 1.75rem;
      font-weight: 700;
      color: #212529;
    }

    /* Content Grid */
    .content-grid {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 2rem;
    }

    /* Chart Cards - Matches Owner Dashboard */
    .chart-card {
      border-radius: 12px;
      overflow: hidden;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem 1.5rem;
      background: #f8f9fa;
    }

    .card-header h3 {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.1rem;
      font-weight: 600;
      color: #212529;
    }

    .card-header h3 mat-icon {
      color: #667eea;
    }

    .card-body {
      padding: 1.5rem;
    }

    /* Activity List */
    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .activity-item {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1rem;
      background: #f8f9fa;
      border-radius: 8px;
      transition: background 0.2s;
    }

    .activity-item:hover {
      background: #e9ecef;
    }

    .activity-icon-wrap {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .activity-icon-wrap mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: white;
    }

    .activity-icon-wrap.tender {
      background: linear-gradient(135deg, #D4AF37 0%, #C5A028 100%);
    }

    .activity-icon-wrap.rental {
      background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
    }

    .activity-icon-wrap.trip {
      background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%);
    }

    .activity-details {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }

    .activity-title {
      font-weight: 600;
      color: #212529;
      font-size: 0.95rem;
    }

    .activity-desc {
      color: #6c757d;
      font-size: 0.85rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .activity-date {
      color: #adb5bd;
      font-size: 0.8rem;
    }

    .activity-status {
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: capitalize;
    }

    .activity-status.active, .activity-status.open {
      background: #e3f2fd;
      color: #1976d2;
    }

    .activity-status.pending {
      background: #fff3e0;
      color: #f57c00;
    }

    .activity-status.completed {
      background: #e8f5e9;
      color: #388e3c;
    }

    .activity-status.cancelled {
      background: #ffebee;
      color: #d32f2f;
    }

    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #6c757d;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #dee2e6;
      margin-bottom: 1rem;
    }

    .empty-state p {
      margin: 0 0 0.5rem;
      font-weight: 600;
      color: #495057;
    }

    .empty-state span {
      font-size: 0.9rem;
    }

    /* Quick Actions */
    .quick-actions-card .card-body {
      padding: 1.5rem;
    }

    .quick-actions-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .action-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1.5rem 1rem;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      color: white;
      font-weight: 600;
      font-size: 0.9rem;
    }

    .action-btn:hover {
      transform: translateY(-3px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
    }

    .action-btn mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .action-btn.tender {
      background: linear-gradient(135deg, #D4AF37 0%, #C5A028 100%);
    }

    .action-btn.rental {
      background: linear-gradient(135deg, #4CAF50 0%, #388E3C 100%);
    }

    .action-btn.trips {
      background: linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%);
    }

    .action-btn.support {
      background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
    }

    .action-btn.taxi {
      background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
    }

    .action-btn.schedule {
      background: linear-gradient(135deg, #00BCD4 0%, #0097A7 100%);
    }

    /* Services Section */
    .services-section {
      border-radius: 12px;
    }

    .services-grid {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .service-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.5rem;
      background: #f8f9fa;
      border-radius: 12px;
      cursor: pointer;
      transition: all 0.3s ease;
      position: relative;
    }

    .service-item:not(.unavailable):hover {
      background: #e9ecef;
      transform: translateX(4px);
    }

    .service-item.unavailable {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .service-icon {
      width: 50px;
      height: 50px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .service-icon mat-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
      color: white;
    }

    .service-info {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      min-width: 0;
    }

    .service-title {
      font-weight: 600;
      color: #212529;
      font-size: 1rem;
    }

    .service-desc {
      color: #6c757d;
      font-size: 0.85rem;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .service-badge {
      display: flex;
      align-items: center;
      gap: 0.25rem;
      background: linear-gradient(135deg, #FF9800 0%, #F57C00 100%);
      color: white;
      padding: 0.35rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .service-badge mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
    }

    .service-arrow {
      color: #adb5bd;
    }

    /* Responsive */
    @media (max-width: 1024px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
    }

    @media (max-width: 768px) {
      .dashboard-header {
        padding: 1.5rem 1rem;
      }

      .header-content {
        flex-direction: column;
        align-items: flex-start;
      }

      .dashboard-content {
        padding: 1rem;
      }

      .metrics-grid {
        grid-template-columns: 1fr;
      }

      .quick-actions-grid {
        grid-template-columns: 1fr;
      }

      .welcome-section h1 {
        font-size: 1.4rem;
      }
    }
  `]
})
export class UserOverviewComponent implements OnInit {
  today: Date = new Date();
  loading = true;
  userData: any = null;
  memberSince: string = '';

  get displayName(): string {
    if (this.userData?.fullName) return this.userData.fullName;
    if (this.userData?.name) return this.userData.name;
    if (this.userData?.email) {
      // Extract name from email (capitalize first letter)
      const emailName = this.userData.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    return 'User';
  }
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
      const userId = this.userData.id || this.userData.userId;
      const userEmail = this.userData.email;
      
      // Load tenders
      const tenders: any = await this.http.get('http://localhost:5000/api/Tenders').toPromise();
      const userTenders = Array.isArray(tenders) 
        ? tenders.filter((t: any) => 
            t.userId === userId || 
            t.createdBy === userEmail ||
            t.postedBy === userEmail
          )
        : [];
      this.totalTendersCount = userTenders.length;
      this.activeTendersCount = userTenders.filter((t: any) => 
        t.status === 'Open' || t.status === 'Active'
      ).length;

      // Load rental requests
      const rentals: any = await this.http.get('http://localhost:5000/api/RentalRequests').toPromise();
      const userRentals = Array.isArray(rentals)
        ? rentals.filter((r: any) => 
            r.userId === userId || 
            r.requesterId === userId ||
            r.requesterEmail === userEmail
          )
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
      const userId = this.userData.id || this.userData.userId;
      const userEmail = this.userData.email;

      // Load recent tenders
      const tenders: any = await this.http.get('http://localhost:5000/api/Tenders').toPromise();
      const userTenders = Array.isArray(tenders)
        ? tenders.filter((t: any) => 
            t.userId === userId || 
            t.createdBy === userEmail ||
            t.postedBy === userEmail
          )
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
        ? rentals.filter((r: any) => 
            r.userId === userId || 
            r.requesterId === userId ||
            r.requesterEmail === userEmail
          )
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

  // Add userStats as a getter in the class
  get userStats() {
    return [
      {
        title: 'Active Tenders',
        value: this.activeTendersCount,
        icon: 'description',
        bg: 'linear-gradient(135deg, #D4AF37 0%, #C5A028 100%)'
      },
      {
        title: 'Total Tenders',
        value: this.totalTendersCount,
        icon: 'assignment',
        bg: 'linear-gradient(135deg, #FFD700 0%, #FFA500 100%)'
      },
      {
        title: 'Active Rentals',
        value: this.activeRentalRequestsCount,
        icon: 'car_rental',
        bg: 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)'
      },
      {
        title: 'Total Rentals',
        value: this.totalRentalsCount,
        icon: 'directions_car',
        bg: 'linear-gradient(135deg, #2196F3 0%, #1976D2 100%)'
      },
      {
        title: 'Completed Trips',
        value: this.completedTripsCount,
        icon: 'check_circle',
        bg: 'linear-gradient(135deg, #9C27B0 0%, #7B1FA2 100%)'
      },
      {
        title: 'Total Spent',
        value: this.totalSpent,
        icon: 'payments',
        bg: 'linear-gradient(135deg, #FF9800 0%, #F57C00 100%)'
      }
    ];
  }
}
