import { Routes } from '@angular/router';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { DriversComponent } from './components/drivers/drivers.component';
import { VehiclesComponent } from './components/vehicles/vehicles.component';
import { VehicleDetailsComponent } from './components/vehicles/vehicle-details/vehicle-details.component';
import { TripsComponent } from './components/trips/trips.component';
import { LoginComponent } from './components/login/login.component';
import { OwnerDashboardComponent } from './components/owner-dashboard/owner-dashboard.component';
import { OwnerDashboardEnhancedComponent } from './components/owner-dashboard/owner-dashboard-enhanced.component';
import { MaintenanceDashboardComponent } from './components/maintenance/maintenance-dashboard.component';
import { DriverMaintenanceRequestComponent } from './components/driver-dashboard/driver-maintenance-request.component';
import { DriverDashboardComponent } from './components/driver-dashboard/driver-dashboard.component';
import { ProfileSelectionComponent } from './components/profile-selection/profile-selection.component';
import { CreateDriverProfileComponent } from './components/drivers/create-driver-profile.component';
import { CreateStaffProfileComponent } from './components/staff/create-staff-profile.component';
import { OnboardingWizardComponent } from './components/onboarding-wizard/onboarding-wizard.component';
import { IdentityManagementComponent } from './components/identity-management/identity-management.component';
import { DriverRegistrationComponent } from './components/driver-registration/driver-registration.component';
import { ServiceProviderListComponent } from './components/service-providers/service-provider-list.component';
import { ServiceProviderFormComponent } from './components/service-providers/service-provider-form.component';
import { ServiceProviderRegistrationComponent } from './components/service-providers/service-provider-registration.component';
import { CreateServiceProviderProfileComponent } from './components/service-providers/create-service-provider-profile.component';
import { ServiceProviderDashboardComponent } from './components/service-providers/service-provider-dashboard.component';
import { MarshalRegistrationComponent } from './components/marshal/marshal-registration.component';
import { TaxiRankUserRegistrationComponent } from './components/taxi-rank-user-registration/taxi-rank-user-registration.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { OwnerTripsComponent } from './components/owner-dashboard/owner-trips.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: ProfileSelectionComponent },
  { path: 'driver-registration', component: DriverRegistrationComponent },
  { path: 'onboarding', component: OnboardingWizardComponent },
  { path: 'identity-management', component: IdentityManagementComponent },
  { path: 'owner-dashboard', component: OwnerDashboardComponent },
  { path: 'owner-dashboard/analytics', component: OwnerDashboardEnhancedComponent },
  { path: 'owner-dashboard/trips', component: OwnerTripsComponent },
  { path: 'maintenance', component: MaintenanceDashboardComponent },
  { path: 'driver-maintenance', component: DriverMaintenanceRequestComponent },
  { path: 'driver-dashboard', component: DriverDashboardComponent },
  { path: 'service-provider-dashboard', component: ServiceProviderDashboardComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'drivers', component: DriversComponent },
  { path: 'drivers/create', component: CreateDriverProfileComponent },
  { path: 'vehicles', component: VehiclesComponent },
  { path: 'vehicles/:id', component: VehicleDetailsComponent },
  { path: 'trips', component: TripsComponent },
  { path: 'service-providers', component: ServiceProviderListComponent },
  { path: 'service-providers/new', component: ServiceProviderFormComponent },
  { path: 'service-providers/:id/edit', component: ServiceProviderFormComponent },
  { path: 'service-provider-registration', component: ServiceProviderRegistrationComponent },
  { path: 'service-provider-profile/create', component: CreateServiceProviderProfileComponent },
  { path: 'marshal-registration', component: MarshalRegistrationComponent },
  { path: 'taxi-rank-user-registration', component: TaxiRankUserRegistrationComponent },
  { 
    path: 'admin', 
    component: AdminDashboardComponent,
    children: [
      { path: '', redirectTo: 'routes', pathMatch: 'full' },
      { 
        path: 'routes', 
        loadComponent: () => import('./components/admin-dashboard/route-management/route-management.component').then(m => m.RouteManagementComponent)
      },
      { 
        path: 'owners', 
        loadComponent: () => import('./components/admin-dashboard/owner-assignment/owner-assignment.component').then(m => m.OwnerAssignmentComponent)
      },
      { 
        path: 'vehicles', 
        loadComponent: () => import('./components/admin-dashboard/vehicle-assignment/vehicle-assignment.component').then(m => m.VehicleAssignmentComponent)
      },
      { 
        path: 'marshals', 
        loadComponent: () => import('./components/admin-dashboard/marshal-management/marshal-management.component').then(m => m.MarshalManagementComponent)
      },
      { 
        path: 'schedule', 
        loadComponent: () => import('./components/admin-dashboard/trip-schedule/trip-schedule.component').then(m => m.TripScheduleComponent)
      },
      { 
        path: 'trip-details', 
        loadComponent: () => import('./components/admin-dashboard/trip-details/trip-details.component').then(m => m.TripDetailsComponent)
      }
    ]
  },
  { 
    path: 'identity', 
    loadChildren: () => import('./components/identity/identity.routes').then(m => m.identityRoutes)
  }
];
