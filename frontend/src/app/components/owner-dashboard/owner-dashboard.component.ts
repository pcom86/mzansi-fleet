import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { FormsModule } from '@angular/forms';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { HttpClient } from '@angular/common/http';
import { AuthService, IdentityService } from '../../services';
import { TenderService, Tender } from '../../services/tender.service';
import { MessagingService } from '../../services/messaging.service';
import { RentalMarketplaceComponent } from '../rental/rental-marketplace.component';
import { MzansiFleetLogoComponent } from '../shared/mzansi-fleet-logo.component';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';

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
    MatChipsModule,
    MatDividerModule,
    MatTabsModule,
    MatDialogModule,
    MatSidenavModule,
    MatListModule,
    FormsModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MzansiFleetLogoComponent,
    RentalMarketplaceComponent
  ],
  templateUrl: './owner-dashboard.component.html',
  styleUrls: ['./owner-dashboard.component.scss']
})
export class OwnerDashboardComponent implements OnInit {
  userData: any;
  companyName: string = 'Mzansi Fleet';
  sidebarCollapsed = false;
  menuGroups: any[] = [];
  topMenuItems: any[] = [];
  unreadNotifications = 0;
  unreadMessages = 0;

  tomorrowMaintenanceCount: number = 0;
  recentTenders: Tender[] = [];
  allTenders: Tender[] = [];
  filteredTenders: Tender[] = [];
  searchQuery: string = '';
  filterStatus: string = 'all';
  filterTransportType: string = 'all';
  filterMaxBudget: number | null = null;
  private apiUrl = 'http://localhost:5000/api';

  constructor(
    private authService: AuthService,
    private identityService: IdentityService,
    private http: HttpClient,
    private tenderService: TenderService,
    private messagingService: MessagingService,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    // Get user info from local storage
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
      // Company name is now hardcoded as 'Mzansi Fleet'
    }
    this.loadMaintenanceAlerts();
    this.loadRecentTenders();
    this.loadAllTenders();
    this.loadMenuItems();
    this.loadUnreadMessages();
  }

  loadRecentTenders(): void {
    this.tenderService.getRecentTenders(7).subscribe({
      next: (tenders) => {
        // Limit to 3 most recent tenders for the dashboard
        this.recentTenders = tenders.slice(0, 3);
      },
      error: (error) => {
        console.error('Error loading recent tenders:', error);
      }
    });
  }

  loadAllTenders(): void {
    this.tenderService.getAllTenders().subscribe({
      next: (tenders) => {
        this.allTenders = tenders;
        this.filteredTenders = tenders;
      },
      error: (error) => {
        console.error('Error loading all tenders:', error);
      }
    });
  }

  filterTenders(): void {
    let filtered = this.allTenders;

    // Apply search filter
    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(tender =>
        tender.title.toLowerCase().includes(query) ||
        tender.description.toLowerCase().includes(query) ||
        tender.pickupLocation.toLowerCase().includes(query) ||
        tender.dropoffLocation.toLowerCase().includes(query) ||
        tender.serviceArea?.toLowerCase().includes(query) ||
        tender.publisherName?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (this.filterStatus && this.filterStatus !== 'all') {
      filtered = filtered.filter(tender => tender.status === this.filterStatus);
    }

    // Apply transport type filter
    if (this.filterTransportType && this.filterTransportType !== 'all') {
      filtered = filtered.filter(tender => tender.transportType === this.filterTransportType);
    }

    // Apply budget filter
    if (this.filterMaxBudget && this.filterMaxBudget > 0) {
      filtered = filtered.filter(tender =>
        tender.budgetMax && tender.budgetMax <= this.filterMaxBudget!
      );
    }

    this.filteredTenders = filtered;
  }

  resetFilters(): void {
    this.searchQuery = '';
    this.filterStatus = 'all';
    this.filterTransportType = 'all';
    this.filterMaxBudget = null;
    this.filteredTenders = this.allTenders;
  }

  clearSearch(): void {
    this.searchQuery = '';
    this.filterTenders();
  }

  getDaysUntilDeadline(deadline: string): string {
    const deadlineDate = new Date(deadline);
    const today = new Date();
    const diffTime = deadlineDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return 'Expired';
    } else if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return '1 day left';
    } else if (diffDays <= 7) {
      return `${diffDays} days left`;
    } else {
      return `${Math.ceil(diffDays / 7)} weeks left`;
    }
  }

  confirmApplyToTender(tenderId: string): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Apply to Tender',
        message: 'Are you ready to apply for this tender? You will be taken to the application form.',
        confirmText: 'Continue',
        cancelText: 'Cancel'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.router.navigate(['/owner-dashboard/tenders', tenderId, 'apply']);
      }
    });
  }

  viewTenderDetails(tenderId: string): void {
    this.router.navigate(['/owner-dashboard/tenders', tenderId]);
  }

  applyToTender(tenderId: string): void {
    this.confirmApplyToTender(tenderId);
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
    } catch (error: any) {
      console.error('Error loading maintenance alerts:', error);
      console.error('API URL:', this.apiUrl);
      if (error.status === 404) {
        console.error('404 Error - Endpoint not found. Check if backend is running on http://localhost:5000');
      }
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

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onMenuItemClick(): void {
    if (window.innerWidth < 768) {
      this.sidebarCollapsed = true;
    }
  }

  toggleMenuGroup(group: any): void {
    group.expanded = !group.expanded;
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  navigateToMessages(): void {
    this.router.navigate(['/owner-dashboard/messages']);
  }

  onTopMenuAction(action: string): void {
    switch(action) {
      case 'stats':
        this.router.navigate(['/owner-dashboard/analytics']);
        break;
      case 'vehicles':
        this.router.navigate(['/owner-dashboard/vehicles']);
        break;
      case 'trips':
        this.router.navigate(['/owner-dashboard/trips']);
        break;
      case 'maintenance':
        this.router.navigate(['/owner-dashboard/maintenance']);
        break;
    }
  }

  private loadMenuItems(): void {
    this.menuGroups = [
      {
        title: 'Overview',
        icon: 'dashboard',
        expanded: true,
        items: [
          { title: 'Dashboard', icon: 'dashboard', route: '/owner-dashboard', badge: null },
          { title: 'Fleet Analytics', icon: 'analytics', route: '/owner-dashboard/analytics', badge: null }
        ]
      },
      {
        title: 'Fleet Management',
        icon: 'directions_car',
        expanded: true,
        items: [
          { title: 'Vehicles', icon: 'directions_car', route: '/owner-dashboard/vehicles', badge: null },
          { title: 'Drivers', icon: 'people', route: '/owner-dashboard/drivers', badge: null },
          { title: 'Trips', icon: 'trip_origin', route: '/owner-dashboard/trips', badge: null }
        ]
      },
      {
        title: 'Operations',
        icon: 'build',
        expanded: true,
        items: [
          { title: 'Maintenance', icon: 'build', route: '/owner-dashboard/maintenance', badge: this.tomorrowMaintenanceCount > 0 ? this.tomorrowMaintenanceCount.toString() : null },
          { title: 'Tracking Device', icon: 'gps_fixed', route: '/owner-dashboard/tracking-device', badge: null },
          { title: 'Roadside Assistance', icon: 'emergency', route: '/owner-dashboard/roadside-assistance', badge: null }
        ]
      },
      {
        title: 'Business',
        icon: 'business',
        expanded: false,
        items: [
          { title: 'Tenders', icon: 'description', route: '/owner-dashboard/tenders', badge: null },
          { title: 'Rentals', icon: 'car_rental', route: '/owner-dashboard/rental/marketplace', badge: null }
        ]
      },
      {
        title: 'Communication',
        icon: 'message',
        expanded: false,
        items: [
          { title: 'Messages', icon: 'inbox', route: '/owner-dashboard/messages', badge: null },
          { title: 'Users', icon: 'group', route: '/identity/users', badge: null }
        ]
      }
    ];

    this.topMenuItems = [
      { title: 'Fleet Stats', icon: 'analytics', action: 'stats', badge: null },
      { title: 'Vehicles', icon: 'directions_car', action: 'vehicles', badge: null },
      { title: 'Trips', icon: 'trip_origin', action: 'trips', badge: null },
      { title: 'Maintenance', icon: 'build', action: 'maintenance', badge: this.tomorrowMaintenanceCount > 0 ? this.tomorrowMaintenanceCount.toString() : null }
    ];
  }

  loadUnreadMessages(): void {
    if (this.userData?.id || this.userData?.userId) {
      const userId = this.userData.id || this.userData.userId;
      this.messagingService.getUnreadCount(userId).subscribe({
        next: (count) => {
          this.unreadMessages = count;
        },
        error: (error) => console.error('Error loading unread messages:', error)
      });
    }
  }

  isMobileView(): boolean {
    return window.innerWidth <= 430;
  }
}

