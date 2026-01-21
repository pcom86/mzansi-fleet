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
    // Hide navigation on login and all registration pages
    const publicRoutes = [
      '/login', 
      '/registration', 
      '/register', 
      '/forgot-password', 
      '/user-registration',
      '/driver-registration', 
      '/service-provider-registration', 
      '/marshal-registration', 
      '/taxi-rank-user-registration', 
      '/profile-selection',
      '/admin'
    ];
    const isPublicRoute = publicRoutes.some(route => url.includes(route));
    
    // Check if user is logged in
    const isLoggedIn = !!localStorage.getItem('token');
    
    // Check user role
    const userStr = localStorage.getItem('user');
    let userRole = '';
    if (userStr) {
      try {
        const userInfo = JSON.parse(userStr);
        userRole = userInfo.role || '';
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    // Hide navigation for Owner role, Marshal/TaxiMarshal role, ServiceProvider role, and admin dashboard
    const ownerDashboardRoute = url.includes('/owner-dashboard');
    const isOwner = userRole === 'Owner';
    const isMarshal = userRole === 'Marshal' || userRole === 'TaxiMarshal';
    const isServiceProvider = userRole === 'ServiceProvider';
    
    // Show navigation only if user is logged in AND not on a public route AND not an owner, marshal, or service provider
    this.showNavigation = isLoggedIn && !isPublicRoute && !isOwner && !isMarshal && !isServiceProvider;
    
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
    } else if (this.userRole === 'Marshal' || this.userRole === 'TaxiMarshal') {
      this.router.navigate(['/marshal-dashboard/overview']);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }

  navigateToDrivers(): void {
    if (this.userRole === 'Owner') {
      this.router.navigate(['/owner-dashboard/drivers']);
    } else if (this.userRole === 'Marshal' || this.userRole === 'TaxiMarshal') {
      this.router.navigate(['/marshal-dashboard/overview']);
    } else {
      this.router.navigate(['/drivers']);
    }
  }

  navigateToVehicles(): void {
    if (this.userRole === 'Owner') {
      this.router.navigate(['/owner-dashboard/vehicles']);
    } else if (this.userRole === 'Marshal' || this.userRole === 'TaxiMarshal') {
      this.router.navigate(['/marshal-dashboard/overview']);
    } else {
      this.router.navigate(['/vehicles']);
    }
  }

  navigateToTrips(): void {
    if (this.userRole === 'Owner') {
      this.router.navigate(['/owner-dashboard/trips']);
    } else if (this.userRole === 'Marshal' || this.userRole === 'TaxiMarshal') {
      this.router.navigate(['/marshal-dashboard/trip-history']);
    } else {
      this.router.navigate(['/trips']);
    }
  }

  navigateToServiceProviders(): void {
    if (this.userRole === 'Owner') {
      this.router.navigate(['/owner-dashboard/analytics']);
    } else if (this.userRole === 'Marshal' || this.userRole === 'TaxiMarshal') {
      this.router.navigate(['/marshal-dashboard/overview']);
    } else {
      this.router.navigate(['/service-providers']);
    }
  }

  navigateToIdentity(): void {
    if (this.userRole === 'Owner') {
      this.router.navigate(['/owner-dashboard/analytics']);
    } else if (this.userRole === 'Marshal' || this.userRole === 'TaxiMarshal') {
      this.router.navigate(['/marshal-dashboard/overview']);
    } else {
      this.router.navigate(['/identity-management']);
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
    } else if (this.userRole === 'Marshal' || this.userRole === 'TaxiMarshal') {
      return url.includes('/marshal-dashboard');
    }
    return url.includes('/dashboard');
  }

  isDriversActive(): boolean {
    const url = this.router.url;
    if (this.userRole === 'Owner') {
      return url.includes('/owner-dashboard/drivers');
    } else if (this.userRole === 'Marshal' || this.userRole === 'TaxiMarshal') {
      return false; // Marshal doesn't have drivers page
    }
    return url === '/drivers' || url.startsWith('/drivers/');
  }

  isVehiclesActive(): boolean {
    const url = this.router.url;
    if (this.userRole === 'Owner') {
      return url.includes('/owner-dashboard/vehicles');
    } else if (this.userRole === 'Marshal' || this.userRole === 'TaxiMarshal') {
      return false; // Marshal doesn't have vehicles page
    }
    return url === '/vehicles' || url.startsWith('/vehicles/');
  }

  isTripsActive(): boolean {
    const url = this.router.url;
    if (this.userRole === 'Owner') {
      return url.includes('/owner-dashboard/trips');
    } else if (this.userRole === 'Marshal' || this.userRole === 'TaxiMarshal') {
      return url.includes('/marshal-dashboard/trip');
    }
    return url === '/trips' || url.startsWith('/trips/');
  }

  isServiceProvidersActive(): boolean {
    const url = this.router.url;
    if (this.userRole === 'Owner') {
      return false; // Owner doesn't have service providers page in dashboard
    } else if (this.userRole === 'Marshal' || this.userRole === 'TaxiMarshal') {
      return false; // Marshal doesn't have service providers page
    }
    return url === '/service-providers' || url.startsWith('/service-providers/');
  }

  isIdentityActive(): boolean {
    const url = this.router.url;
    if (this.userRole === 'Owner') {
      return false; // Owner doesn't have identity page in dashboard
    } else if (this.userRole === 'Marshal' || this.userRole === 'TaxiMarshal') {
      return false; // Marshal doesn't have identity page
    }
    return url === '/identity-management' || url.startsWith('/identity-management/');
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
