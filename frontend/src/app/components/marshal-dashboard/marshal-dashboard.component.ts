import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';
import { MessagingService } from '../../services/messaging.service';
import { MzansiFleetLogoComponent } from '../shared/mzansi-fleet-logo.component';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-marshal-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatMenuModule,
    MatBadgeModule,
    MatDividerModule,
    MzansiFleetLogoComponent
  ],
  templateUrl: './marshal-dashboard.component.html',
  styleUrls: ['./marshal-dashboard.component.scss']
})
export class MarshalDashboardComponent implements OnInit {
  userData: any;
  marshalProfile: any;
  sidebarCollapsed = false;
  taxiRankName = '';
  unreadNotifications = 0;
  unreadMessages = 0;

  topMenuItems = [
    { title: 'Active Trips', icon: 'local_taxi', badge: '0', action: 'trips' },
    { title: 'Queue Status', icon: 'people', badge: '0', action: 'queue' },
    { title: 'Incidents', icon: 'report_problem', badge: '0', action: 'incidents' }
  ];
  
  menuItems = [
    {
      group: 'Operations',
      icon: 'settings',
      items: [
        { title: 'Dashboard', icon: 'dashboard', route: 'overview' },
        { title: 'Capture Trip', icon: 'add_circle', route: 'trip-details' },
        { title: 'Scheduled Trips', icon: 'schedule', route: 'scheduled-trips' },
        { title: 'My Trips', icon: 'list_alt', route: 'trip-history' },
        { title: 'Rank Operations', icon: 'local_taxi', route: 'operations' }
      ]
    },
    {
      group: 'Communication',
      icon: 'message',
      items: [
        { title: 'Messages', icon: 'inbox', route: 'messages' }
      ]
    }
  ];

  constructor(
    private router: Router,
    private http: HttpClient,
    private messagingService: MessagingService
  ) {}

  ngOnInit(): void {
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
      if (this.userData?.taxiRankName) {
        this.taxiRankName = this.userData.taxiRankName;
      }
    }
    this.loadUnreadMessages();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onMenuItemClick(): void {
    if (window.innerWidth <= 768) {
      this.sidebarCollapsed = true;
    }
  }

  getRoleDisplayName(): string {
    return 'Taxi Marshal';
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  onTopMenuAction(action: string): void {
    switch (action) {
      case 'trips':
        this.router.navigate(['/marshal-dashboard/trip-history']);
        break;
      case 'queue':
        this.router.navigate(['/marshal-dashboard/queue']);
        break;
      case 'incidents':
        // Navigate to incidents page or show incidents dialog
        break;
      default:
        break;
    }
  }

  navigateToMessages(): void {
    this.router.navigate(['/marshal-dashboard/messages']);
  }

  navigateToProfile(): void {
    this.router.navigate(['/profile']);
  }

  navigateToSettings(): void {
    this.router.navigate(['/settings']);
  }

  logout(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
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
