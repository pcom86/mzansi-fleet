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
  userData: any;
  userEmail: string = '';
  sidebarCollapsed = false;
  unreadNotifications = 0;
  unreadMessages = 0;

  menuItems = [
    { title: 'Overview', icon: 'dashboard', route: 'overview' },
    { title: 'Today\'s Schedule', icon: 'schedule', route: 'schedule' },
    { title: 'My Tenders', icon: 'description', route: 'tenders' },
    { title: 'Rent a Car', icon: 'car_rental', route: 'rental' },
    { title: 'My Trips', icon: 'map', route: 'trips' },
    { title: 'Messages', icon: 'inbox', route: 'messages' }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private messagingService: MessagingService
  ) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    const email = localStorage.getItem('userEmail');
    const user = localStorage.getItem('user');
    
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    if (user) {
      this.userData = JSON.parse(user);
    }
    this.userEmail = email || 'User';
    this.loadUnreadMessages();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onMenuItemClick(): void {
    if (window.innerWidth < 768) {
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
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('userId');
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
  }}
