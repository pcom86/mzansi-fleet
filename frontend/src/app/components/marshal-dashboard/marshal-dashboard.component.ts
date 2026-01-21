import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
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
  
  menuItems = [
    { title: 'Dashboard', icon: 'dashboard', route: 'overview' },
    { title: 'Capture Trip', icon: 'add_circle', route: 'trip-details' },
    { title: 'My Trips', icon: 'list_alt', route: 'trip-history' },
    { title: 'Passenger Queue', icon: 'people', route: 'queue' },
    { title: 'Rank Operations', icon: 'local_taxi', route: 'operations' }
  ];
  
  topMenuItems = [
    { title: 'Active Queue', icon: 'people', badge: '0', action: 'queue' },
    { title: 'Today\'s Trips', icon: 'local_taxi', badge: '0', action: 'trips' }
  ];

  constructor(
    private router: Router,
    private http: HttpClient,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
      if (this.userData?.taxiRankName) {
        this.taxiRankName = this.userData.taxiRankName;
      }
    }
  }
  
  getRoleDisplayName(): string {
    return 'Taxi Marshal';
  }
  
  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }
  
  onMenuItemClick(): void {
    if (window.innerWidth < 768) {
      this.sidebarCollapsed = true;
    }
  }
  
  onTopMenuAction(action: string): void {
    switch(action) {
      case 'queue':
        this.router.navigate(['queue'], { relativeTo: this.route });
        break;
      case 'trips':
        this.router.navigate(['trip-history'], { relativeTo: this.route });
        break;
    }
  }
  
  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  logout(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
