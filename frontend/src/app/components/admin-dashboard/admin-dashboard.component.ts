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
  userData: any;
  taxiRankName = '';
  
  menuItems = [
    { title: 'Overview', icon: 'dashboard', route: '/admin/overview' },
    { title: 'Route Management', icon: 'route', route: '/admin/routes' },
    { title: 'Owner Assignment', icon: 'person_add', route: '/admin/owners' },
    { title: 'Vehicle Assignment', icon: 'local_taxi', route: '/admin/vehicles' },
    { title: 'Marshal Management', icon: 'security', route: '/admin/marshals' },
    { title: 'Trip Schedule', icon: 'schedule', route: '/admin/schedule' },
    { title: 'Trip Details', icon: 'receipt_long', route: '/admin/trip-details' },
    { title: 'Trip Revenue', icon: 'monetization_on', route: '/admin/trip-revenue' }
  ];

  constructor(private router: Router) {}

  ngOnInit(): void {
    // Get user info from local storage
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
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
}
