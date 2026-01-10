import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { IdentityService } from '../../services';
import { OwnerProfile } from '../../models';

@Component({
  selector: 'app-owner-profile-detail',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="owner-profile-detail">
      <div class="flex-between mb-2">
        <h1>Owner Profile Details</h1>
        <button class="btn btn-secondary" (click)="goBack()">Back to List</button>
      </div>

      <div class="error" *ngIf="error">{{ error }}</div>
      
      <div class="card" *ngIf="loading">
        <div class="loading">Loading owner profile details...</div>
      </div>

      <div class="card" *ngIf="!loading && !profile && !error">
        <div class="loading">No profile data available. Please check the console for errors.</div>
      </div>

      <div class="card" *ngIf="!loading && profile">
        <div class="detail-section">
          <div class="flex-between">
            <h2>{{ profile.companyName || 'N/A' }}</h2>
            <button class="btn btn-primary" (click)="showPasswordDialog = true" style="background-color: #007bff; color: white;">
              🔒 Change Password
            </button>
          </div>
          
          <div class="detail-row">
            <label>ID:</label>
            <span>{{ profile.id || 'N/A' }}</span>
          </div>
          
          <div class="detail-row">
            <label>User ID:</label>
            <span>{{ profile.userId || 'N/A' }}</span>
          </div>
          
          <div class="detail-row">
            <label>Company Name:</label>
            <span>{{ profile.companyName || 'N/A' }}</span>
          </div>
          
          <div class="detail-row">
            <label>Contact Name:</label>
            <span>{{ profile.contactName || 'N/A' }}</span>
          </div>
          
          <div class="detail-row">
            <label>Contact Email:</label>
            <span>{{ profile.contactEmail || 'N/A' }}</span>
          </div>
          
          <div class="detail-row">
            <label>Contact Phone:</label>
            <span>{{ profile.contactPhone || 'N/A' }}</span>
          </div>
          
          <div class="detail-row">
            <label>Address:</label>
            <span>{{ profile.address || 'N/A' }}</span>
          </div>
        </div>

        <div class="detail-section" *ngIf="profile?.user">
          <h3>Associated User Information</h3>
          
          <div class="detail-row">
            <label>Email:</label>
            <span>{{ profile.user?.email || 'N/A' }}</span>
          </div>
          
          <div class="detail-row">
            <label>Phone:</label>
            <span>{{ profile.user?.phone || 'N/A' }}</span>
          </div>
          
          <div class="detail-row">
            <label>Role:</label>
            <span>{{ profile.user?.role || 'N/A' }}</span>
          </div>
          
          <div class="detail-row">
            <label>Status:</label>
            <span [class]="profile && profile.user?.isActive ? 'badge badge-success' : 'badge badge-danger'">
              {{ profile && profile.user?.isActive ? 'Active' : 'Inactive' }}
            </span>
          </div>
        </div>
      </div>

      <!-- Change Password Dialog -->
      <div class="modal" *ngIf="showPasswordDialog" (click)="closePasswordDialog($event)">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Change Password</h2>
            <button class="close-btn" (click)="showPasswordDialog = false">&times;</button>
          </div>
          
          <div class="modal-body">
            <div class="error" *ngIf="passwordError">{{ passwordError }}</div>
            <div class="success" *ngIf="passwordSuccess">{{ passwordSuccess }}</div>
            
            <form (ngSubmit)="changePassword()">
              <div class="form-group">
                <label for="currentPassword">Current Password</label>
                <input 
                  type="password" 
                  id="currentPassword" 
                  [(ngModel)]="currentPassword"
                  name="currentPassword"
                  class="form-control"
                  required
                  [disabled]="changingPassword">
              </div>
              
              <div class="form-group">
                <label for="newPassword">New Password</label>
                <input 
                  type="password" 
                  id="newPassword" 
                  [(ngModel)]="newPassword"
                  name="newPassword"
                  class="form-control"
                  required
                  minlength="6"
                  [disabled]="changingPassword">
              </div>
              
              <div class="form-group">
                <label for="confirmPassword">Confirm New Password</label>
                <input 
                  type="password" 
                  id="confirmPassword" 
                  [(ngModel)]="confirmPassword"
                  name="confirmPassword"
                  class="form-control"
                  required
                  [disabled]="changingPassword">
              </div>
              
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" (click)="showPasswordDialog = false" [disabled]="changingPassword">
                  Cancel
                </button>
                <button type="submit" class="btn btn-primary" [disabled]="changingPassword || !isPasswordFormValid()">
                  {{ changingPassword ? 'Changing...' : 'Change Password' }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .owner-profile-detail {
      padding: 20px;
    }
    
    .flex-between {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .mb-2 {
      margin-bottom: 20px;
    }
    
    .card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    
    .detail-section {
      margin-bottom: 30px;
    }
    
    .detail-section:last-child {
      margin-bottom: 0;
    }
    
    .detail-section h2 {
      margin-top: 0;
      margin-bottom: 20px;
      color: #333;
    }
    
    .detail-section h3 {
      margin-top: 0;
      margin-bottom: 15px;
      color: #555;
    }
    
    .detail-row {
      display: flex;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    
    .detail-row:last-child {
      border-bottom: none;
    }
    
    .detail-row label {
      font-weight: 600;
      width: 180px;
      color: #666;
    }
    
    .detail-row span {
      flex: 1;
      color: #333;
    }
    
    .badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      display: inline-block;
    }
    
    .badge-success {
      background-color: #d4edda;
      color: #155724;
    }
    
    .badge-danger {
      background-color: #f8d7da;
      color: #721c24;
    }
    
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.3s;
    }
    
    .btn-primary {
      background-color: #007bff;
      color: white;
    }
    
    .btn-primary:hover:not(:disabled) {
      background-color: #0056b3;
    }
    
    .btn-primary:disabled {
      background-color: #6c757d;
      cursor: not-allowed;
    }
    
    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }
    
    .btn-secondary:hover {
      background-color: #5a6268;
    }
    
    .error {
      background-color: #f8d7da;
      color: #721c24;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 20px;
    }

    .success {
      background-color: #d4edda;
      color: #155724;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    
    .loading {
      text-align: center;
      padding: 40px;
      color: #6c757d;
    }

    /* Modal Styles */
    .modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 8px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 20px;
      border-bottom: 1px solid #eee;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 20px;
      color: #333;
    }

    .close-btn {
      background: none;
      border: none;
      font-size: 28px;
      cursor: pointer;
      color: #666;
      line-height: 1;
      padding: 0;
      width: 30px;
      height: 30px;
    }

    .close-btn:hover {
      color: #333;
    }

    .modal-body {
      padding: 20px;
    }

    .form-group {
      margin-bottom: 20px;
    }

    .form-group label {
      display: block;
      margin-bottom: 8px;
      font-weight: 600;
      color: #333;
    }

    .form-control {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
      box-sizing: border-box;
    }

    .form-control:focus {
      outline: none;
      border-color: #007bff;
    }

    .form-control:disabled {
      background-color: #f5f5f5;
      cursor: not-allowed;
    }

    .modal-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 20px;
    }
  `]
})
export class OwnerProfileDetailComponent implements OnInit {
  profile: OwnerProfile | null = null;
  loading: boolean = false;
  error: string = '';
  
  // Password change state
  showPasswordDialog: boolean = false;
  currentPassword: string = '';
  newPassword: string = '';
  confirmPassword: string = '';
  changingPassword: boolean = false;
  passwordError: string = '';
  passwordSuccess: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private identityService: IdentityService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadProfile(id);
    }
  }

  loadProfile(id: string): void {
    this.loading = true;
    this.error = '';
    
    console.log('Loading profile with ID:', id);
    
    this.identityService.getOwnerProfileById(id).subscribe({
      next: (profile) => {
        console.log('Profile loaded:', profile);
        console.log('Profile keys:', Object.keys(profile));
        console.log('CompanyName:', (profile as any).CompanyName);
        console.log('companyName:', (profile as any).companyName);
        
        // Handle PascalCase to camelCase conversion if needed
        this.profile = {
          id: (profile as any).Id || (profile as any).id || profile.id,
          userId: (profile as any).UserId || (profile as any).userId || profile.userId,
          companyName: (profile as any).CompanyName || (profile as any).companyName || profile.companyName,
          contactName: (profile as any).ContactName || (profile as any).contactName || profile.contactName,
          contactEmail: (profile as any).ContactEmail || (profile as any).contactEmail || profile.contactEmail,
          contactPhone: (profile as any).ContactPhone || (profile as any).contactPhone || profile.contactPhone,
          address: (profile as any).Address || (profile as any).address || profile.address,
          user: (profile as any).User || (profile as any).user || profile.user
        };
        
        console.log('Mapped profile:', this.profile);
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error loading profile:', err);
        this.error = 'Failed to load owner profile: ' + (err.error?.message || err.message || 'Unknown error');
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/identity/owner-profiles']);
  }

  isPasswordFormValid(): boolean {
    return this.currentPassword.length > 0 && 
           this.newPassword.length >= 6 && 
           this.newPassword === this.confirmPassword;
  }

  changePassword(): void {
    if (!this.isPasswordFormValid()) {
      this.passwordError = 'Please fill in all fields correctly. New password must be at least 6 characters and match confirmation.';
      return;
    }

    if (!this.profile?.userId) {
      this.passwordError = 'User ID not found';
      return;
    }

    this.changingPassword = true;
    this.passwordError = '';
    this.passwordSuccess = '';

    this.identityService.changePassword(this.profile.userId, this.currentPassword, this.newPassword).subscribe({
      next: (response) => {
        this.passwordSuccess = response.message || 'Password changed successfully!';
        this.changingPassword = false;
        
        // Reset form
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
        
        // Close dialog after 2 seconds
        setTimeout(() => {
          this.showPasswordDialog = false;
          this.passwordSuccess = '';
        }, 2000);
      },
      error: (err) => {
        this.passwordError = err.error?.message || 'Failed to change password. Please check your current password and try again.';
        this.changingPassword = false;
      }
    });
  }

  closePasswordDialog(event: MouseEvent): void {
    this.showPasswordDialog = false;
    this.passwordError = '';
    this.passwordSuccess = '';
    this.currentPassword = '';
    this.newPassword = '';
    this.confirmPassword = '';
  }
}
