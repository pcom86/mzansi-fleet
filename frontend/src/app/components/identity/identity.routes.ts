import { Routes } from '@angular/router';
import { IdentityComponent } from './identity.component';
import { TenantsComponent } from '../tenants/tenants.component';
import { TenantDetailComponent } from '../tenants/tenant-detail.component';
import { UsersComponent } from '../users/users.component';
import { UserDetailComponent } from '../users/user-detail.component';
import { OwnerProfilesComponent } from '../owner-profiles/owner-profiles.component';
import { OwnerProfileDetailComponent } from '../owner-profiles/owner-profile-detail.component';
import { CreateOwnerProfileComponent } from '../owner-profiles/create-owner-profile.component';

export const identityRoutes: Routes = [
  {
    path: '',
    component: IdentityComponent,
    children: [
      { path: '', redirectTo: 'tenants', pathMatch: 'full' },
      { path: 'tenants', component: TenantsComponent },
      { path: 'tenants/:id', component: TenantDetailComponent },
      { path: 'users', component: UsersComponent },
      { path: 'users/:id', component: UserDetailComponent },
      { path: 'owner-profiles', component: OwnerProfilesComponent },
      { path: 'owner-profiles/create', component: CreateOwnerProfileComponent },
      { path: 'owner-profiles/:id', component: OwnerProfileDetailComponent }
    ]
  }
];
