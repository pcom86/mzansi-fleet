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
import { ServiceProviderOverviewComponent } from './components/service-providers/service-provider-overview.component';
import { ServiceProviderProfileEditComponent } from './components/service-providers/service-provider-profile-edit.component';
import { RoadsideAssistanceMarketplaceComponent } from './components/service-providers/roadside-assistance-marketplace.component';
import { ServiceRequestsComponent } from './components/service-providers/service-requests.component';
import { MechanicalRequestDetailsComponent } from './components/service-providers/mechanical-request-details.component';
import { StuffRequestDetailsComponent } from './components/service-providers/stuff-request-details.component';
import { MarshalRegistrationComponent } from './components/marshal/marshal-registration.component';
import { TaxiRankUserRegistrationComponent } from './components/taxi-rank-user-registration/taxi-rank-user-registration.component';
import { AdminDashboardComponent } from './components/admin-dashboard/admin-dashboard.component';
import { OwnerTripsComponent } from './components/owner-dashboard/owner-trips.component';
import { MarshalDashboardComponent } from './components/marshal-dashboard/marshal-dashboard.component';
import { TenderListComponent } from './components/tenders/tender-list.component';
import { PostTenderComponent } from './components/tenders/post-tender.component';
import { TenderApplicationComponent } from './components/tenders/tender-application.component';
import { TenderApplicationsViewComponent } from './components/tenders/tender-applications-view.component';
import { TenderDetailsComponent } from './components/tenders/tender-details.component';
import { NormalUserRegistrationComponent } from './components/normal-user-registration/normal-user-registration.component';
import { UserDashboardComponent } from './components/user-dashboard/user-dashboard.component';
import { RegistrationComponent } from './components/registration/registration.component';
import { RequestVehicleRentalComponent } from './components/rental/request-vehicle-rental.component';
import { MyRentalRequestsComponent } from './components/rental/my-rental-requests.component';
import { ViewRentalOffersComponent } from './components/rental/view-rental-offers.component';
import { RentalMarketplaceComponent } from './components/rental/rental-marketplace.component';
import { RequestTrackingDeviceComponent } from './components/tracking-device/request-tracking-device.component';
import { TrackingDeviceOffersComponent } from './components/tracking-device/tracking-device-offers.component';
import { TrackingMarketplaceComponent } from './components/tracking-device/tracking-marketplace.component';
import { RequestRoadsideAssistanceComponent } from './components/roadside-assistance/request-roadside-assistance.component';
import { RoadsideAssistanceDashboardComponent } from './components/roadside-assistance/roadside-assistance-dashboard.component';
import { MessagesInboxComponent } from './components/messages-inbox/messages-inbox.component';
import { ProfileComponent } from './components/profile/profile.component';
import { PassengerBookingComponent } from './components/passenger-booking/passenger-booking.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'registration', component: RegistrationComponent },
  { path: 'register', component: ProfileSelectionComponent },
  { path: 'user-registration', component: NormalUserRegistrationComponent },
  { 
    path: 'user-dashboard', 
    component: UserDashboardComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { 
        path: 'overview', 
        loadComponent: () => import('./components/user-dashboard/user-overview/user-overview.component').then(m => m.UserOverviewComponent)
      },
      { 
        path: 'schedule', 
        loadComponent: () => import('./components/user-dashboard/user-schedule/user-schedule.component').then(m => m.UserScheduleComponent)
      },
      { path: 'trips', component: TripsComponent },
      { path: 'tenders', component: TenderListComponent },
      { path: 'tenders/post', component: PostTenderComponent },
      { path: 'tenders/:id', component: TenderDetailsComponent },
      { path: 'tenders/:id/apply', component: TenderApplicationComponent },
      { path: 'rental', component: MyRentalRequestsComponent },
      { path: 'rental/request', component: RequestVehicleRentalComponent },
      { path: 'rental/requests/:id/offers', component: ViewRentalOffersComponent },
      { path: 'messages', component: MessagesInboxComponent },
      { path: 'passenger-booking', component: PassengerBookingComponent }
    ]
  },
  { path: 'driver-registration', component: DriverRegistrationComponent },
  { path: 'onboarding', component: OnboardingWizardComponent },
  { path: 'identity-management', component: IdentityManagementComponent },
  { 
    path: 'owner-dashboard', 
    component: OwnerDashboardComponent,
    children: [
      { path: '', redirectTo: 'analytics', pathMatch: 'full' },
      { path: 'analytics', component: OwnerDashboardEnhancedComponent },
      { path: 'vehicles', component: VehiclesComponent },
      { path: 'vehicles/:id', component: VehicleDetailsComponent },
      { path: 'drivers', component: DriversComponent },
      { path: 'drivers/create', component: CreateDriverProfileComponent },
      { path: 'trips', component: OwnerTripsComponent },
      { path: 'maintenance', component: MaintenanceDashboardComponent },
      { path: 'tenders', component: TenderListComponent },
      { path: 'tenders/post', component: PostTenderComponent },
      { path: 'tenders/:id', component: TenderDetailsComponent },
      { path: 'tenders/:id/apply', component: TenderApplicationComponent },
      { path: 'rental/marketplace', component: RentalMarketplaceComponent },
      { path: 'tracking-device', component: RequestTrackingDeviceComponent },
      { path: 'tracking-offers/:requestId', component: TrackingDeviceOffersComponent },
      { path: 'roadside-assistance', component: RequestRoadsideAssistanceComponent },
      { path: 'messages', component: MessagesInboxComponent }
    ]
  },
  { path: 'maintenance', component: MaintenanceDashboardComponent },
  { path: 'driver-maintenance', component: DriverMaintenanceRequestComponent },
  { 
    path: 'driver-dashboard', 
    component: DriverDashboardComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { 
        path: 'overview', 
        loadComponent: () => import('./components/driver-dashboard/driver-overview/driver-overview.component').then(m => m.DriverOverviewComponent)
      },
      { 
        path: 'trips', 
        loadComponent: () => import('./components/driver-dashboard/driver-overview/driver-overview.component').then(m => m.DriverOverviewComponent)
      },
      { 
        path: 'earnings', 
        loadComponent: () => import('./components/driver-dashboard/driver-overview/driver-overview.component').then(m => m.DriverOverviewComponent)
      },
      { 
        path: 'expenses', 
        loadComponent: () => import('./components/driver-dashboard/driver-overview/driver-overview.component').then(m => m.DriverOverviewComponent)
      },
      { path: 'vehicle', component: VehicleDetailsComponent },
      { path: 'roadside-assistance', component: RequestRoadsideAssistanceComponent },
      { path: 'maintenance', component: DriverMaintenanceRequestComponent },
      { path: 'messages', component: MessagesInboxComponent }
    ]
  },
  { 
    path: 'service-provider-dashboard', 
    component: ServiceProviderDashboardComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { 
        path: 'overview', 
        component: ServiceProviderOverviewComponent
      },
      { 
        path: 'marketplace', 
        component: TrackingMarketplaceComponent
      },
      { 
        path: 'profile-edit', 
        component: ServiceProviderProfileEditComponent
      },
      { 
        path: 'roadside-assistance', 
        component: RoadsideAssistanceMarketplaceComponent
      },
      { 
        path: 'service-requests', 
        component: ServiceRequestsComponent
      },
      { 
        path: 'mechanical-request/:id', 
        component: MechanicalRequestDetailsComponent
      },
      { 
        path: 'stuff-request/:id', 
        component: StuffRequestDetailsComponent
      },
      { 
        path: 'messages', 
        component: MessagesInboxComponent
      }
    ]
  },
  { 
    path: 'marshal-dashboard', 
    component: MarshalDashboardComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { 
        path: 'overview', 
        loadComponent: () => import('./components/marshal-dashboard/marshal-overview/marshal-overview.component').then(m => m.MarshalOverviewComponent)
      },
      { 
        path: 'trip-details', 
        loadComponent: () => import('./components/admin-dashboard/trip-details/trip-details.component').then(m => m.TripDetailsComponent)
      },
      { 
        path: 'trip-details/:id', 
        loadComponent: () => import('./components/admin-dashboard/trip-details/trip-details.component').then(m => m.TripDetailsComponent)
      },
      { 
        path: 'trip-history', 
        loadComponent: () => import('./components/marshal-dashboard/marshal-trip-history/marshal-trip-history.component').then(m => m.MarshalTripHistoryComponent)
      },
      { 
        path: 'operations', 
        loadComponent: () => import('./components/marshal-dashboard/marshal-operations/marshal-operations.component').then(m => m.MarshalOperationsComponent)
      },
      { 
        path: 'queue', 
        loadComponent: () => import('./components/admin-dashboard/passenger-capture/passenger-capture.component').then(m => m.PassengerCaptureComponent)
      },
      { 
        path: 'scheduled-trips', 
        loadComponent: () => import('./components/admin-dashboard/trip-schedule/trip-schedule.component').then(m => m.TripScheduleComponent)
      },
      { 
        path: 'messages', 
        component: MessagesInboxComponent
      }
    ]
  },
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
  
  // Tender Management Routes
  { path: 'tenders', component: TenderListComponent },
  { path: 'tenders/post', component: PostTenderComponent },
  { path: 'tenders/post/:id', component: PostTenderComponent },
  { path: 'tenders/:id', component: TenderDetailsComponent },
  { path: 'tenders/:id/apply', component: TenderApplicationComponent },
  { path: 'tenders/:id/applications', component: TenderApplicationsViewComponent },
  
  // Vehicle Rental Marketplace Routes
  { path: 'rental/request', component: RequestVehicleRentalComponent },
  { path: 'rental/my-requests', component: MyRentalRequestsComponent },
  { path: 'rental/requests/:id/offers', component: ViewRentalOffersComponent },
  { path: 'rental/marketplace', component: RentalMarketplaceComponent },
  { path: 'rental/bookings', loadComponent: () => import('./components/rental/my-rental-requests.component').then(m => m.MyRentalRequestsComponent) },
  
  // Tracking Device Installation Routes
  { path: 'tracking-device/request', component: RequestTrackingDeviceComponent },
  
  // Roadside Assistance Routes
  { path: 'roadside-assistance/request', component: RequestRoadsideAssistanceComponent },
  { path: 'roadside-assistance/dashboard', component: RoadsideAssistanceDashboardComponent },
  { path: 'tracking-device/marketplace', component: TrackingMarketplaceComponent },
  
  { 
    path: 'admin', 
    component: AdminDashboardComponent,
    children: [
      { path: '', redirectTo: 'overview', pathMatch: 'full' },
      { 
        path: 'overview', 
        loadComponent: () => import('./components/admin-dashboard/admin-system-overview/admin-system-overview.component').then(m => m.AdminSystemOverviewComponent)
      },
      { 
        path: 'rank-overview', 
        loadComponent: () => import('./components/admin-dashboard/rank-overview/rank-overview.component').then(m => m.RankOverviewComponent)
      },
      { 
        path: 'users', 
        loadComponent: () => import('./components/users/users.component').then(m => m.UsersComponent)
      },
      { 
        path: 'tenants', 
        loadComponent: () => import('./components/tenants/tenants.component').then(m => m.TenantsComponent)
      },
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
        path: 'today-schedule', 
        loadComponent: () => import('./components/admin-dashboard/today-schedule/today-schedule.component').then(m => m.TodayScheduleComponent)
      },
      { 
        path: 'schedule', 
        loadComponent: () => import('./components/admin-dashboard/trip-schedule/trip-schedule.component').then(m => m.TripScheduleComponent)
      },
      { 
        path: 'capture', 
        loadComponent: () => import('./components/admin-dashboard/passenger-capture/passenger-capture.component').then(m => m.PassengerCaptureComponent)
      },
      { 
        path: 'trip-details', 
        loadComponent: () => import('./components/admin-dashboard/trip-details/trip-details.component').then(m => m.TripDetailsComponent)
      },
      {
        path: 'settings',
        loadComponent: () => import('./components/admin-dashboard/admin-system-overview/admin-system-overview.component').then(m => m.AdminSystemOverviewComponent)
      },
      {
        path: 'reports',
        loadComponent: () => import('./components/admin-dashboard/admin-system-overview/admin-system-overview.component').then(m => m.AdminSystemOverviewComponent)
      },
      {
        path: 'messages',
        component: MessagesInboxComponent
      }
    ]
  },
  { 
    path: 'identity', 
    loadChildren: () => import('./components/identity/identity.routes').then(m => m.identityRoutes)
  },
  { path: 'profile', component: ProfileComponent }
];
