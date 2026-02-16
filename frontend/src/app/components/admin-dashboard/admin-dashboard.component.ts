import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MessagingService } from '../../services/messaging.service';
import { MzansiFleetLogoComponent } from '../shared/mzansi-fleet-logo.component';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule,
    MzansiFleetLogoComponent
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  userData: any;
  taxiRankName = '';
  sidebarCollapsed = false;
  menuItems: any[] = [];
  unreadNotifications = 3;
  unreadMessages = 0;

  topMenuItems = [
    { title: 'Active Trips', icon: 'local_taxi', badge: '0', action: 'trips' },
    { title: 'Pending Tasks', icon: 'assignment', badge: '0', action: 'tasks' },
    { title: 'Rank Status', icon: 'info', badge: '0', action: 'status' }
  ];

  // Role-based menu configurations with grouping
  private roleMenuConfig: { [key: string]: any[] } = {
    'TaxiRankAdmin': [
      {
        group: 'Rank Management',
        icon: 'local_taxi',
        items: [
          { title: 'Taxi Rank', icon: 'local_taxi', route: '/admin/rank-overview' },
          { title: 'Route Management', icon: 'alt_route', route: '/admin/routes' }
        ]
      },
      {
        group: 'Operations',
        icon: 'settings',
        items: [
          { title: 'Owner Assignment', icon: 'group_add', route: '/admin/owners' },
          { title: 'Vehicle Assignment', icon: 'directions_car', route: '/admin/vehicles' },
          { title: 'Marshal Management', icon: 'security', route: '/admin/marshals' },
          { title: 'Passenger Capture', icon: 'people', route: '/admin/capture' }
        ]
      },
      {
        group: 'Scheduling',
        icon: 'schedule',
        items: [
          { title: 'Today\'s Schedule', icon: 'today', route: '/admin/schedule' },
          { title: 'Trip Details', icon: 'list_alt', route: '/admin/trip-details' }
        ]
      },
      {
        group: 'Communication',
        icon: 'message',
        items: [
          { title: 'Messages', icon: 'inbox', route: '/admin/messages' }
        ]
      }
    ],
    'TaxiMarshal': [
      {
        group: 'Operations',
        icon: 'settings',
        items: [
          { title: 'Dashboard', icon: 'dashboard', route: '/marshal/dashboard' },
          { title: 'Capture Trip', icon: 'add_circle', route: '/marshal/capture-trip' },
          { title: 'Scheduled Trips', icon: 'schedule', route: '/marshal/scheduled-trips' },
          { title: 'My Trips', icon: 'list_alt', route: '/marshal/trips' },
          { title: 'Passenger Queue', icon: 'people', route: '/marshal/queue' },
          { title: 'Rank Operations', icon: 'local_taxi', route: '/marshal/operations' }
        ]
      }
    ],
    'Owner': [
      { title: 'Dashboard', icon: 'dashboard', route: '/owner/dashboard' },
      { title: 'My Vehicles', icon: 'directions_car', route: '/owner/vehicles' },
      { title: 'My Drivers', icon: 'people', route: '/owner/drivers' },
      { title: 'Earnings', icon: 'account_balance_wallet', route: '/owner/earnings' },
      { title: 'Reports', icon: 'assessment', route: '/owner/reports' }
    ],
    'Driver': [
      { title: 'Dashboard', icon: 'dashboard', route: '/driver/dashboard' },
      { title: 'My Trips', icon: 'local_taxi', route: '/driver/trips' },
      { title: 'Earnings', icon: 'account_balance_wallet', route: '/driver/earnings' },
      { title: 'Vehicle Info', icon: 'directions_car', route: '/driver/vehicle' },
      { title: 'Schedule', icon: 'event', route: '/driver/schedule' }
    ],
    'ServiceProvider': [
      { title: 'Dashboard', icon: 'dashboard', route: '/service-provider/dashboard' },
      { title: 'Service Requests', icon: 'build', route: '/service-provider/requests' },
      { title: 'My Services', icon: 'work', route: '/service-provider/services' },
      { title: 'Earnings', icon: 'account_balance_wallet', route: '/service-provider/earnings' },
      { title: 'Ratings', icon: 'star', route: '/service-provider/ratings' }
    ],
    'Admin': [
      { title: 'System Overview', icon: 'dashboard', route: '/admin/overview' },
      { title: 'User Management', icon: 'people', route: '/admin/users' },
      { title: 'Tenant Management', icon: 'business', route: '/admin/tenants' },
      { title: 'System Settings', icon: 'settings', route: '/admin/settings' },
      { title: 'Reports', icon: 'assessment', route: '/admin/reports' },
      { title: 'Messages', icon: 'inbox', route: '/admin/messages' }
    ]
  };

  constructor(
    private router: Router,
    private messagingService: MessagingService
  ) {}

  ngOnInit(): void {
    // Get user info from local storage
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
      this.loadMenuForRole();
    }
    this.loadUnreadMessages();
  }

  private loadMenuForRole(): void {
    const userRole = this.userData?.role || 'TaxiRankAdmin';

    // Load sidebar menu items based on role
    this.menuItems = this.roleMenuConfig[userRole] || this.roleMenuConfig['TaxiRankAdmin'];

    // Set rank name if available
    if (this.userData?.taxiRankName) {
      this.taxiRankName = this.userData.taxiRankName;
    }
  }

  getRoleDisplayName(): string {
    const roleMap: { [key: string]: string } = {
      'TaxiRankAdmin': 'Rank Administrator',
      'TaxiMarshal': 'Taxi Marshal',
      'Owner': 'Vehicle Owner',
      'Driver': 'Driver',
      'ServiceProvider': 'Service Provider',
      'Admin': 'System Administrator',
      'Staff': 'Staff Member',
      'Passenger': 'Passenger'
    };
    return roleMap[this.userData?.role] || 'User';
  }

  isRankAdministrator(): boolean {
    return this.userData?.role === 'TaxiRankAdmin';
  }

  isSystemAdmin(): boolean {
    return this.userData?.role === 'Admin';
  }

  onMenuItemClick(): void {
    // Optional: Add any additional logic when menu item is clicked
    // For mobile, you might want to collapse the sidebar
    if (window.innerWidth < 768) {
      this.sidebarCollapsed = true;
    }
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onTopMenuAction(action: string): void {
    switch (action) {
      case 'trips':
        this.navigateTo('/admin/schedule');
        break;
      case 'tasks':
        this.navigateTo('/admin/trip-details');
        break;
      case 'status':
        this.navigateTo('/admin/rank-overview');
        break;
      default:
        break;
    }
  }

  logout(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  navigateToMessages(): void {
    this.router.navigate(['/admin/messages']);
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
}
