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
    MatMenuModule
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  userFullName = '';
  taxiRankName = '';
  
  menuItems = [
    { title: 'Route Management', icon: 'route', route: '/admin/routes' },
    { title: 'Owner Assignment', icon: 'person_add', route: '/admin/owners' },
    { title: 'Vehicle Assignment', icon: 'local_taxi', route: '/admin/vehicles' },
    { title: 'Marshal Management', icon: 'security', route: '/admin/marshals' },
    { title: 'Trip Schedule', icon: 'schedule', route: '/admin/schedule' },
    { title: 'Trip Details', icon: 'receipt_long', route: '/admin/trip-details' },
    { title: 'Reports', icon: 'assessment', route: '/admin/reports' }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Get user info from local storage or auth service
    const user = localStorage.getItem('currentUser');
    if (user) {
      const userData = JSON.parse(user);
      this.userFullName = `${userData.firstName} ${userData.lastName}`;
      this.taxiRankName = userData.taxiRankName || 'Taxi Rank';
    }
  }

  logout(): void {
    localStorage.removeItem('currentUser');
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }
}
