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
  topMenuItems: any[] = [];
  unreadNotifications = 3;
  
  // Role-based menu configurations
  private roleMenuConfig: { [key: string]: any[] } = {
    'TaxiRankAdmin': [
      { title: 'Overview', icon: 'dashboard', route: '/admin/overview' },
      { title: 'Route Management', icon: 'alt_route', route: '/admin/routes' },
      { title: 'Owner Assignment', icon: 'group_add', route: '/admin/owners' },
      { title: 'Vehicle Assignment', icon: 'directions_car', route: '/admin/vehicles' },
      { title: 'Marshal Management', icon: 'security', route: '/admin/marshals' },
      { title: 'Trip Schedule', icon: 'event', route: '/admin/schedule' },
      { title: 'Trip Details', icon: 'list_alt', route: '/admin/trip-details' }
    ],
    'TaxiMarshal': [
      { title: 'Dashboard', icon: 'dashboard', route: '/marshal/dashboard' },
      { title: 'Capture Trip', icon: 'add_circle', route: '/marshal/capture-trip' },
      { title: 'My Trips', icon: 'list_alt', route: '/marshal/trips' },
      { title: 'Passenger Queue', icon: 'people', route: '/marshal/queue' },
      { title: 'Rank Operations', icon: 'local_taxi', route: '/marshal/operations' }
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
      { title: 'Reports', icon: 'assessment', route: '/admin/reports' }
    ]
  };

  // Top menu configurations by role
  private roleTopMenuConfig: { [key: string]: any[] } = {
    'TaxiRankAdmin': [
      { title: 'Quick Stats', icon: 'analytics', action: 'stats' },
      { title: 'Active Trips', icon: 'local_taxi', badge: '5', action: 'trips' },
      { title: 'Messages', icon: 'message', badge: '2', action: 'messages' }
    ],
    'TaxiMarshal': [
      { title: 'Active Queue', icon: 'people', badge: '12', action: 'queue' },
      { title: 'Today\'s Trips', icon: 'local_taxi', badge: '8', action: 'trips' }
    ],
    'Owner': [
      { title: 'Active Vehicles', icon: 'directions_car', badge: '4', action: 'vehicles' },
      { title: 'Today\'s Earnings', icon: 'attach_money', action: 'earnings' }
    ],
    'Driver': [
      { title: 'Current Trip', icon: 'navigation', action: 'current-trip' },
      { title: 'Messages', icon: 'message', badge: '1', action: 'messages' }
    ],
    'ServiceProvider': [
      { title: 'Pending Requests', icon: 'pending', badge: '3', action: 'requests' },
      { title: 'In Progress', icon: 'build', badge: '2', action: 'progress' }
    ],
    'Admin': [
      { title: 'System Health', icon: 'health_and_safety', action: 'health' },
      { title: 'Active Users', icon: 'people', badge: '142', action: 'users' }
    ]
  };

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Get user info from local storage
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
      this.loadMenuForRole();
    }
  }

  private loadMenuForRole(): void {
    const userRole = this.userData?.role || 'TaxiRankAdmin';
    
    // Load sidebar menu items based on role
    this.menuItems = this.roleMenuConfig[userRole] || this.roleMenuConfig['TaxiRankAdmin'];
    
    // Load top menu items based on role
    this.topMenuItems = this.roleTopMenuConfig[userRole] || [];
    
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

  onMenuItemClick(): void {
    // Optional: Add any additional logic when menu item is clicked
    // For mobile, you might want to collapse the sidebar
    if (window.innerWidth < 768) {
      this.sidebarCollapsed = true;
    }
  }

  onTopMenuAction(action: string): void {
    // Handle top menu actions based on role
    switch(action) {
      case 'stats':
        this.router.navigate(['/admin/stats']);
        break;
      case 'trips':
        this.router.navigate(['/admin/trips']);
        break;
      case 'messages':
        this.router.navigate(['/messages']);
        break;
      case 'queue':
        this.router.navigate(['/marshal/queue']);
        break;
      case 'earnings':
        this.router.navigate(['/earnings']);
        break;
      case 'vehicles':
        this.router.navigate(['/owner/vehicles']);
        break;
      case 'current-trip':
        this.router.navigate(['/driver/current-trip']);
        break;
      case 'requests':
        this.router.navigate(['/service-provider/requests']);
        break;
      case 'progress':
        this.router.navigate(['/service-provider/progress']);
        break;
      case 'health':
        this.router.navigate(['/admin/system-health']);
        break;
      case 'users':
        this.router.navigate(['/admin/users']);
        break;
    }
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  logout(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
