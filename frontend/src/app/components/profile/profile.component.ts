import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDividerModule } from '@angular/material/divider';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface UserProfile {
  id: string;
  email: string;
  fullName?: string;
  phoneNumber?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  profile?: any; // Role-specific profile data
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatTabsModule,
    MatDividerModule
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss']
})
export class ProfileComponent implements OnInit {
  userProfile: UserProfile | null = null;
  isLoading = true;
  isSaving = false;
  activeTab = 0;

  // Password change form
  passwordForm = {
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadUserProfile();
  }

  loadUserProfile(): void {
    this.isLoading = true;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id || user.userId;

    if (!userId) {
      this.snackBar.open('User not found. Please login again.', 'Close', { duration: 3000 });
      this.router.navigate(['/login']);
      return;
    }

    // Get user basic info
    this.http.get<UserProfile>(`${environment.apiUrl}/Identity/users/${userId}`).subscribe({
      next: (userData) => {
        this.userProfile = userData;
        // Load role-specific profile data
        this.loadRoleSpecificProfile(userData.role, userId);
      },
      error: (error) => {
        console.error('Error loading user profile:', error);
        this.snackBar.open('Error loading profile. Please try again.', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  loadRoleSpecificProfile(role: string, userId: string): void {
    let profileUrl = '';

    switch (role.toLowerCase()) {
      case 'driver':
        profileUrl = `${environment.apiUrl}/DriverProfiles/user/${userId}`;
        break;
      case 'owner':
        profileUrl = `${environment.apiUrl}/OwnerProfiles/user/${userId}`;
        break;
      case 'serviceprovider':
        profileUrl = `${environment.apiUrl}/ServiceProviderProfiles/user/${userId}`;
        break;
      case 'taxirankadmin':
        profileUrl = `${environment.apiUrl}/TaxiRankAdmins/user/${userId}`;
        break;
      case 'taximarshal':
        profileUrl = `${environment.apiUrl}/TaxiMarshalProfiles/user/${userId}`;
        break;
      default:
        // For regular users, no additional profile data needed
        this.isLoading = false;
        return;
    }

    this.http.get<any>(profileUrl).subscribe({
      next: (profileData) => {
        if (this.userProfile) {
          this.userProfile.profile = profileData;
        }
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading role-specific profile:', error);
        // Still show basic profile even if role-specific data fails
        this.isLoading = false;
      }
    });
  }

  saveProfile(): void {
    if (!this.userProfile) return;

    this.isSaving = true;

    // Update basic user info
    this.http.put(`${environment.apiUrl}/Identity/users/${this.userProfile.id}`, {
      fullName: this.userProfile.fullName,
      phoneNumber: this.userProfile.phoneNumber
    }).subscribe({
      next: () => {
        // Update role-specific profile if it exists
        if (this.userProfile?.profile) {
          this.saveRoleSpecificProfile();
        } else {
          this.isSaving = false;
          this.snackBar.open('Profile updated successfully!', 'Close', { duration: 3000 });
        }
      },
      error: (error) => {
        console.error('Error updating profile:', error);
        this.snackBar.open('Error updating profile. Please try again.', 'Close', { duration: 3000 });
        this.isSaving = false;
      }
    });
  }

  saveRoleSpecificProfile(): void {
    if (!this.userProfile?.profile) {
      this.isSaving = false;
      return;
    }

    let profileUrl = '';
    const role = this.userProfile.role.toLowerCase();

    switch (role) {
      case 'driver':
        profileUrl = `${environment.apiUrl}/DriverProfiles/${this.userProfile.profile.id}`;
        break;
      case 'owner':
        profileUrl = `${environment.apiUrl}/OwnerProfiles/${this.userProfile.profile.id}`;
        break;
      case 'serviceprovider':
        profileUrl = `${environment.apiUrl}/ServiceProviderProfiles/${this.userProfile.profile.id}`;
        break;
      case 'taxirankadmin':
        profileUrl = `${environment.apiUrl}/TaxiRankAdmins/${this.userProfile.profile.id}`;
        break;
      case 'taximarshal':
        profileUrl = `${environment.apiUrl}/TaxiMarshalProfiles/${this.userProfile.profile.id}`;
        break;
      default:
        this.isSaving = false;
        this.snackBar.open('Profile updated successfully!', 'Close', { duration: 3000 });
        return;
    }

    this.http.put(profileUrl, this.userProfile.profile).subscribe({
      next: () => {
        this.isSaving = false;
        this.snackBar.open('Profile updated successfully!', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error updating role-specific profile:', error);
        this.snackBar.open('Profile updated, but some details may not have saved.', 'Close', { duration: 3000 });
        this.isSaving = false;
      }
    });
  }

  changePassword(): void {
    if (this.passwordForm.newPassword !== this.passwordForm.confirmPassword) {
      this.snackBar.open('New passwords do not match.', 'Close', { duration: 3000 });
      return;
    }

    if (this.passwordForm.newPassword.length < 6) {
      this.snackBar.open('Password must be at least 6 characters long.', 'Close', { duration: 3000 });
      return;
    }

    this.isSaving = true;

    this.http.post(`${environment.apiUrl}/Identity/users/${this.userProfile!.id}/password`, {
      currentPassword: this.passwordForm.currentPassword,
      newPassword: this.passwordForm.newPassword
    }).subscribe({
      next: () => {
        this.isSaving = false;
        this.passwordForm = { currentPassword: '', newPassword: '', confirmPassword: '' };
        this.snackBar.open('Password changed successfully!', 'Close', { duration: 3000 });
      },
      error: (error) => {
        console.error('Error changing password:', error);
        this.snackBar.open('Error changing password. Please check your current password.', 'Close', { duration: 3000 });
        this.isSaving = false;
      }
    });
  }

  getRoleDisplayName(role: string): string {
    switch (role.toLowerCase()) {
      case 'serviceprovider': return 'Service Provider';
      case 'taxirankadmin': return 'Taxi Rank Admin';
      case 'taximarshal': return 'Taxi Marshal';
      default: return role.charAt(0).toUpperCase() + role.slice(1);
    }
  }
}