import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MessagingService } from '../../services/messaging.service';
import { MzansiFleetLogoComponent } from '../shared/mzansi-fleet-logo.component';

@Component({
  selector: 'app-user-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule,
    MatSidenavModule,
    MatListModule,
    MzansiFleetLogoComponent
  ],
  templateUrl: './user-dashboard.component.html',
  styleUrls: ['./user-dashboard.component.scss']
})
export class UserDashboardComponent implements OnInit {
  get isMobileView(): boolean {
    return window.innerWidth <= 900;
  }

  get displayName(): string {
    if (this.userData?.fullName) return this.userData.fullName;
    if (this.userData?.name) return this.userData.name;
    if (this.userData?.email) {
      const emailName = this.userData.email.split('@')[0];
      return emailName.charAt(0).toUpperCase() + emailName.slice(1);
    }
    return 'User';
  }

  userData: any = null;
  sidebarCollapsed = false;
  unreadMessages = 0;
  menuItems = [
    { title: 'Overview', icon: 'dashboard', route: '/user-dashboard/overview' },
    { title: 'My Trips', icon: 'commute', route: '/user-dashboard/trips' },
    { title: 'Payments', icon: 'credit_card', route: '/user-dashboard/payments' },
    { title: 'Support', icon: 'support_agent', route: '/user-dashboard/support' },
  ];

  taxiRankItems = [
    { title: 'Book Taxi', icon: 'local_taxi', route: '/user-dashboard/passenger-booking' },
    { title: 'Taxi Schedules', icon: 'schedule', route: '/user-dashboard/schedule' },
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private messagingService: MessagingService
  ) {}

  ngOnInit(): void {
    const user = localStorage.getItem('user');
    try {
      this.userData = user ? JSON.parse(user) : null;
    } catch {
      this.userData = null;
    }
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onMenuItemClick(): void {
    if (window.innerWidth < 900) {
      this.sidebarCollapsed = true;
    }
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  navigateToMessages(): void {
    this.router.navigate(['messages'], { relativeTo: this.route });
  }

  logout(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
    localStorage.removeItem('userRole');
    this.router.navigate(['/login']);
  }
}
