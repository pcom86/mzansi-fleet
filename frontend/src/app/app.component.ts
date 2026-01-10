import { Component, OnInit } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { IdentityService } from './services/identity.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <nav>
      <div class="container nav-container">
        <div class="logo-container">
          <svg class="logo" viewBox="0 0 200 80" xmlns="http://www.w3.org/2000/svg">
            <!-- Truck Body -->
            <rect x="70" y="35" width="50" height="25" fill="#D4AF37" stroke="#000000" stroke-width="2"/>
            <!-- Truck Cab -->
            <rect x="45" y="30" width="25" height="30" fill="#000000" stroke="#000000" stroke-width="2"/>
            <!-- Windshield -->
            <rect x="48" y="33" width="18" height="12" fill="#FFFFFF" opacity="0.5"/>
            <!-- Wheels -->
            <circle cx="60" cy="62" r="8" fill="#000000" stroke="#D4AF37" stroke-width="2"/>
            <circle cx="100" cy="62" r="8" fill="#000000" stroke="#D4AF37" stroke-width="2"/>
          </svg>
          <div class="logo-text">
            <span class="brand-name">Mzansi Fleet</span>
            <span class="tagline">Fleet Management</span>
          </div>
        </div>
        <ul *ngIf="showNavigation">
          <li><a (click)="navigateToDashboard()" [class.active]="isDashboardActive()">Dashboard</a></li>
          <li><a routerLink="/drivers" routerLinkActive="active">Drivers</a></li>
          <li><a routerLink="/vehicles" routerLinkActive="active">Vehicles</a></li>
          <li><a (click)="navigateToTrips()" [class.active]="isTripsActive()">Trips</a></li>
          <li><a routerLink="/service-providers" routerLinkActive="active">Service Providers</a></li>
          <li><a routerLink="/marshal-registration" routerLinkActive="active">Register Marshal</a></li>
          <li><a routerLink="/identity-management" routerLinkActive="active">Identity</a></li>
        </ul>
        <div class="user-info" *ngIf="showNavigation && (userDisplayName || companyName)">
          <div class="user-details">
            <span class="user-name" *ngIf="userDisplayName">{{ userDisplayName }}</span>
            <span class="company-name" *ngIf="companyName">{{ companyName }}</span>
          </div>
        </div>
        <button class="btn-logout" *ngIf="showNavigation" (click)="logout()">
          <span>Logout</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
            <polyline points="16 17 21 12 16 7"></polyline>
            <line x1="21" y1="12" x2="9" y2="12"></line>
          </svg>
        </button>
      </div>
    </nav>
    <main>
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    .nav-container {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 2rem;
    }

    .logo-container {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      transition: transform 0.3s ease;
    }

    .logo-container:hover {
      transform: scale(1.05);
    }

    .logo {
      width: 60px;
      height: 40px;
    }

    .logo-text {
      display: flex;
      flex-direction: column;
      line-height: 1.2;
    }

    .brand-name {
      font-size: 1.5rem;
      font-weight: 700;
      color: #D4AF37;
      letter-spacing: -0.5px;
    }

    .tagline {
      font-size: 0.7rem;
      color: #000000;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      opacity: 0.8;
    }

    .user-info {
      display: flex;
      align-items: center;
      margin-left: auto;
      margin-right: 1rem;
    }

    .user-details {
      display: flex;
      flex-direction: column;
      align-items: flex-end;
      gap: 0.25rem;
    }

    .user-name {
      font-size: 0.95rem;
      font-weight: 600;
      color: #000000;
    }

    .company-name {
      font-size: 0.75rem;
      color: #D4AF37;
      font-weight: 500;
    }

    nav ul {
      display: flex;
      align-items: center;
      gap: 2rem;
      margin: 0;
      padding: 0;
      list-style: none;
    }

    nav ul li:first-child {
      margin-right: auto;
    }

    .btn-logout {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background-color: transparent;
      color: #000000;
      border: 2px solid #D4AF37;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 500;
      transition: all 0.3s ease;
    }

    .btn-logout:hover {
      background-color: #D4AF37;
      color: #FFFFFF;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
    }

    .btn-logout svg {
      transition: transform 0.3s ease;
    }

    .btn-logout:hover svg {
      transform: translateX(3px);
    }

    main {
      margin-top: 2rem;
    }

    @media (max-width: 768px) {
      .nav-container {
        flex-wrap: wrap;
      }

      .logo-container {
        width: 100%;
        justify-content: center;
        margin-bottom: 1rem;
      }

      nav ul {
        flex-wrap: wrap;
        gap: 1rem;
        justify-content: center;
      }
    }
  `]
})
export class AppComponent implements OnInit {
  title = 'Mzansi Fleet Management';
  showNavigation = true;
  userDisplayName: string = '';
  companyName: string = '';
  userRole: string = '';

  constructor(
    private router: Router,
    private identityService: IdentityService
  ) {}

  ngOnInit(): void {
    // Check initial route
    this.checkRoute(this.router.url);

    // Listen to route changes
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.checkRoute(event.url);
      });
  }

  checkRoute(url: string): void {
    // Hide navigation on login and other public pages
    const publicRoutes = ['/login', '/register', '/forgot-password', '/driver-registration', '/service-provider-registration', '/marshal-registration', '/taxi-rank-user-registration', '/profile-selection'];
    const isPublicRoute = publicRoutes.some(route => url.includes(route));
    
    // Check if user is logged in
    const isLoggedIn = !!localStorage.getItem('token');
    
    // Show navigation only if user is logged in AND not on a public route
    this.showNavigation = isLoggedIn && !isPublicRoute;
    
    // Load user info when navigation is shown
    if (this.showNavigation) {
      this.loadUserInfo();
    }
  }

  loadUserInfo(): void {
    const userStr = localStorage.getItem('user');
    if (!userStr) return;

    try {
      const userInfo = JSON.parse(userStr);
      this.userRole = userInfo.role || '';
      
      // Load user details and their profile based on role
      if (userInfo.userId) {
        this.identityService.getUserById(userInfo.userId).subscribe({
          next: (user) => {
            // Try to load the appropriate profile based on role
            if (userInfo.role === 'Owner') {
              this.identityService.getAllOwnerProfiles().subscribe({
                next: (profiles) => {
                  const ownerProfile = profiles.find(p => p.userId === userInfo.userId);
                  if (ownerProfile && ownerProfile.contactName) {
                    this.userDisplayName = ownerProfile.contactName;
                  } else if (user.email) {
                    this.userDisplayName = user.email.split('@')[0];
                  }
                },
                error: () => {
                  if (user.email) {
                    this.userDisplayName = user.email.split('@')[0];
                  }
                }
              });
            } else if (userInfo.role === 'Driver') {
              this.identityService.getAllDriverProfiles().subscribe({
                next: (profiles) => {
                  const driverProfile = profiles.find(p => p.userId === userInfo.userId);
                  if (driverProfile && driverProfile.name) {
                    this.userDisplayName = driverProfile.name;
                  } else if (user.email) {
                    this.userDisplayName = user.email.split('@')[0];
                  }
                },
                error: () => {
                  if (user.email) {
                    this.userDisplayName = user.email.split('@')[0];
                  }
                }
              });
            } else if (userInfo.role === 'Staff') {
              this.identityService.getAllStaffProfiles().subscribe({
                next: (profiles) => {
                  const staffProfile = profiles.find(p => p.userId === userInfo.userId);
                  // Staff profile doesn't have a name field, so use email
                  if (user.email) {
                    this.userDisplayName = user.email.split('@')[0];
                    // Optionally append role if available
                    if (staffProfile && staffProfile.role) {
                      this.userDisplayName += ` (${staffProfile.role})`;
                    }
                  }
                },
                error: () => {
                  if (user.email) {
                    this.userDisplayName = user.email.split('@')[0];
                  }
                }
              });
            } else {
              // For other roles, use email
              if (user.email) {
                this.userDisplayName = user.email.split('@')[0];
              }
            }
          },
          error: (err) => {
            console.error('Failed to load user details:', err);
          }
        });
      }

      // Load tenant/company name
      if (userInfo.tenantId) {
        this.identityService.getTenantById(userInfo.tenantId).subscribe({
          next: (tenant) => {
            this.companyName = tenant.name || '';
          },
          error: (err) => {
            console.error('Failed to load tenant details:', err);
          }
        });
      }
    } catch (error) {
      console.error('Error parsing user info:', error);
    }
  }

  navigateToDashboard(): void {
    if (this.userRole === 'Owner') {
      this.router.navigate(['/owner-dashboard/analytics']);
    } else if (this.userRole === 'Driver') {
      this.router.navigate(['/driver-dashboard']);
    } else if (this.userRole === 'ServiceProvider') {
      this.router.navigate(['/service-provider-dashboard']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  navigateToTrips(): void {
    if (this.userRole === 'Owner') {
      this.router.navigate(['/owner-dashboard/trips']);
    } else {
      this.router.navigate(['/trips']);
    }
  }

  isDashboardActive(): boolean {
    const url = this.router.url;
    if (this.userRole === 'Owner') {
      return url.includes('/owner-dashboard');
    } else if (this.userRole === 'Driver') {
      return url.includes('/driver-dashboard');
    } else if (this.userRole === 'ServiceProvider') {
      return url.includes('/service-provider-dashboard');
    }
    return url.includes('/dashboard');
  }

  isTripsActive(): boolean {
    const url = this.router.url;
    if (this.userRole === 'Owner') {
      return url.includes('/owner-dashboard/trips');
    }
    return url === '/trips' || url.startsWith('/trips/');
  }

  logout(): void {
    // Clear any stored authentication data
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();
    
    // Redirect to login page
    this.router.navigate(['/login']);
  }
}
