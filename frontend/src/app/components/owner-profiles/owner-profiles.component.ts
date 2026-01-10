import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { IdentityService } from '../../services';
import { OwnerProfile, User } from '../../models';

@Component({
  selector: 'app-owner-profiles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="profiles-container">
      <!-- Header Section -->
      <div class="header-section">
        <div class="header-content">
          <div class="title-section">
            <h1>Owner Profiles</h1>
            <p class="subtitle">Manage fleet owner accounts and profiles</p>
          </div>
          <button class="btn-add" (click)="createProfile()">
            <span class="btn-icon">+</span>
            <span>Add Owner Profile</span>
          </button>
        </div>
        
        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon active">👤</div>
            <div class="stat-details">
              <div class="stat-value">{{ profiles.length }}</div>
              <div class="stat-label">Total Owners</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon verified">✓</div>
            <div class="stat-details">
              <div class="stat-value">{{ profiles.length }}</div>
              <div class="stat-label">Active Profiles</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon companies">🏢</div>
            <div class="stat-details">
              <div class="stat-value">{{ getUniqueCompanies() }}</div>
              <div class="stat-label">Companies</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon premium">⭐</div>
            <div class="stat-details">
              <div class="stat-value">{{ profiles.length }}</div>
              <div class="stat-label">Premium</div>
            </div>
          </div>
        </div>
      </div>

      <div class="error-banner" *ngIf="error">
        <span class="error-icon">⚠️</span>
        {{ error }}
      </div>

      <!-- Add/Edit Form -->
      <div class="form-modal" *ngIf="showForm">
        <div class="form-card">
          <h2>{{ editingProfile ? 'Edit Owner Profile' : 'Add New Owner Profile' }}</h2>
          <form (ngSubmit)="saveProfile()">
            <div class="form-grid">
              <div class="form-group">
                <label>Contact Name *</label>
                <input type="text" [(ngModel)]="currentProfile.contactName" name="contactName" required placeholder="e.g., John Doe">
              </div>
              
              <div class="form-group">
                <label>Company Name *</label>
                <input type="text" [(ngModel)]="currentProfile.companyName" name="companyName" required placeholder="e.g., ABC Transport">
              </div>
              
              <div class="form-group">
                <label>Contact Email *</label>
                <input type="email" [(ngModel)]="currentProfile.contactEmail" name="contactEmail" required placeholder="e.g., john@abc.com">
              </div>
              
              <div class="form-group">
                <label>Contact Phone *</label>
                <input type="tel" [(ngModel)]="currentProfile.contactPhone" name="contactPhone" required placeholder="e.g., +27 12 345 6789">
              </div>
              
              <div class="form-group full-width">
                <label>Address</label>
                <textarea [(ngModel)]="currentProfile.address" name="address" rows="3" placeholder="e.g., 123 Main Street, Johannesburg, 2000"></textarea>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn-cancel" (click)="cancelEdit()">Cancel</button>
              <button type="submit" class="btn-save">
                <span>{{ editingProfile ? 'Update' : 'Save' }} Profile</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Profiles Grid -->
      <div class="profiles-content">
        <div class="loading-state" *ngIf="loading">
          <div class="spinner"></div>
          <p>Loading owner profiles...</p>
        </div>
        
        <div class="profiles-grid" *ngIf="!loading && profiles.length > 0">
          <div class="profile-card" *ngFor="let profile of profiles">
            <div class="profile-header">
              <div class="profile-avatar">
                {{ getInitials(profile.contactName || '') }}
              </div>
              <div class="profile-badge">Active</div>
            </div>
            <div class="profile-details">
              <h3>{{ profile.contactName || 'N/A' }}</h3>
              <p class="company-name">{{ profile.companyName || 'N/A' }}</p>
              <div class="profile-info">
                <div class="info-row">
                  <span class="info-icon">📧</span>
                  <span class="info-text">{{ profile.contactEmail }}</span>
                </div>
                <div class="info-row">
                  <span class="info-icon">📱</span>
                  <span class="info-text">{{ profile.contactPhone }}</span>
                </div>
                <div class="info-row" *ngIf="profile.address">
                  <span class="info-icon">📍</span>
                  <span class="info-text">{{ profile.address }}</span>
                </div>
              </div>
              <div class="profile-actions">
                <button class="btn-view" (click)="viewDetails(profile.id)">
                  <span>👁️</span> View Details
                </button>
                <button class="btn-dashboard" (click)="viewDashboard(profile.id)">
                  <span>📊</span> Dashboard
                </button>
                <button class="btn-edit" (click)="editProfile(profile)">
                  <span>✏️</span> Edit
                </button>
                <button class="btn-delete" (click)="deleteProfile(profile.id)">
                  <span>🗑️</span> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div *ngIf="!loading && profiles.length === 0" class="empty-state">
          <div class="empty-icon">👥</div>
          <h3>No owner profiles yet</h3>
          <p>Owner profiles will appear here once created</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .profiles-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
      padding: 2rem;
    }

    /* Header Section */
    .header-section {
      margin-bottom: 2rem;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .title-section h1 {
      font-size: 2.5rem;
      font-weight: 700;
      color: #000000;
      margin: 0;
      background: linear-gradient(135deg, #000000 0%, #D4AF37 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      color: #666;
      font-size: 1rem;
      margin-top: 0.5rem;
    }

    .btn-add {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 2rem;
      background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%);
      color: #000000;
      border: none;
      border-radius: 50px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
      transition: all 0.3s ease;
    }

    .btn-add:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(212, 175, 55, 0.4);
    }

    .btn-icon {
      font-size: 1.5rem;
      font-weight: bold;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      border-radius: 16px;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    }

    .stat-icon {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
    }

    .stat-icon.active {
      background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
    }

    .stat-icon.verified {
      background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
    }

    .stat-icon.companies {
      background: linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%);
    }

    .stat-icon.premium {
      background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%);
    }

    .stat-details {
      flex: 1;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: #000000;
    }

    .stat-label {
      font-size: 0.875rem;
      color: #666;
      margin-top: 0.25rem;
    }

    /* Error Banner */
    .error-banner {
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
      color: #991b1b;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      margin-bottom: 2rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      box-shadow: 0 2px 8px rgba(220, 38, 38, 0.1);
    }

    .error-icon {
      font-size: 1.5rem;
    }

    /* Profiles Grid */
    .profiles-content {
      background: transparent;
    }

    .loading-state {
      text-align: center;
      padding: 4rem 2rem;
      background: white;
      border-radius: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #f3f4f6;
      border-top: 4px solid #D4AF37;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .profiles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 2rem;
    }

    .profile-card {
      background: white;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
    }

    .profile-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
    }

    .profile-header {
      position: relative;
      background: linear-gradient(135deg, #000000 0%, #D4AF37 100%);
      padding: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .profile-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      background: white;
      color: #D4AF37;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: 700;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .profile-badge {
      position: absolute;
      top: 1rem;
      right: 1rem;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      background: rgba(16, 185, 129, 0.9);
      color: white;
      backdrop-filter: blur(10px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .profile-details {
      padding: 1.5rem;
    }

    .profile-details h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #000000;
      margin: 0 0 0.5rem 0;
      text-align: center;
    }

    .company-name {
      text-align: center;
      color: #D4AF37;
      font-weight: 600;
      font-size: 0.875rem;
      margin-bottom: 1.5rem;
    }

    .profile-info {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: #4b5563;
      font-size: 0.875rem;
    }

    .info-icon {
      font-size: 1.25rem;
    }

    .info-text {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .profile-actions {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .btn-dashboard, .btn-edit, .btn-delete {
      flex: 1;
      padding: 0.75rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
    }

    .btn-view {
      background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
      color: white;
      font-weight: 600;
    }

    .btn-view:hover {
      background: linear-gradient(135deg, #059669 0%, #10b981 100%);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(16, 185, 129, 0.4);
    }

    .btn-dashboard {
      background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%);
      color: #000000;
      font-weight: 700;
    }

    .btn-dashboard:hover {
      background: linear-gradient(135deg, #FFD700 0%, #FFF4CC 100%);
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(212, 175, 55, 0.4);
    }

    .btn-edit {
      background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
      color: white;
    }

    .btn-edit:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    .btn-delete {
      background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
      color: white;
    }

    .btn-delete:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: white;
      border-radius: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .empty-icon {
      font-size: 5rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .empty-state h3 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #000000;
      margin: 0 0 0.5rem 0;
    }

    .empty-state p {
      color: #6b7280;
      margin-bottom: 2rem;
    }

    /* Form Modal */
    .form-modal {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.3s ease;
    }

    .form-card {
      background: white;
      border-radius: 20px;
      padding: 2.5rem;
      width: 90%;
      max-width: 700px;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
      animation: slideUp 0.3s ease;
    }

    .form-card h2 {
      color: #000000;
      margin-bottom: 2rem;
      font-size: 1.75rem;
      font-weight: 700;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-group label {
      color: #374151;
      font-weight: 600;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      padding: 0.875rem;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      font-size: 1rem;
      transition: all 0.3s ease;
      background: white;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #D4AF37;
      box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
    }

    .form-group textarea {
      resize: vertical;
      font-family: inherit;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      margin-top: 2rem;
    }

    .btn-cancel,
    .btn-save {
      padding: 0.875rem 2rem;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
      font-size: 1rem;
    }

    .btn-cancel {
      background: #f3f4f6;
      color: #374151;
    }

    .btn-cancel:hover {
      background: #e5e7eb;
    }

    .btn-save {
      background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
      color: #FFD700;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }

    .btn-save:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
      }
      to {
        opacity: 1;
      }
    }

    @keyframes slideUp {
      from {
        transform: translateY(50px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    /* Responsive */
    @media (max-width: 768px) {
      .profiles-container {
        padding: 1rem;
      }

      .header-content {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
      }

      .title-section h1 {
        font-size: 2rem;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .profiles-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class OwnerProfilesComponent implements OnInit {
  profiles: OwnerProfile[] = [];
  currentProfile: Partial<OwnerProfile> = {};
  editingProfile: boolean = false;
  showForm: boolean = false;
  loading: boolean = false;
  error: string = '';

  constructor(
    private identityService: IdentityService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadProfiles();
  }

  loadProfiles(): void {
    this.loading = true;
    this.error = '';
    
    this.identityService.getAllOwnerProfiles().subscribe({
      next: (profiles) => {
        this.profiles = profiles;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load owner profiles: ' + err.message;
        this.loading = false;
      }
    });
  }

  createProfile(): void {
    this.editingProfile = false;
    this.currentProfile = {};
    this.showForm = true;
  }

  saveProfile(): void {
    this.loading = true;
    this.error = '';

    // Validate required fields
    if (!this.currentProfile.contactName || !this.currentProfile.companyName || 
        !this.currentProfile.contactEmail || !this.currentProfile.contactPhone) {
      this.error = 'Please fill in all required fields';
      this.loading = false;
      return;
    }

    if (this.editingProfile && this.currentProfile.id) {
      // Update existing profile - ensure id is set correctly
      const profileToUpdate: OwnerProfile = {
        id: this.currentProfile.id,
        userId: this.currentProfile.userId!,
        companyName: this.currentProfile.companyName!,
        contactName: this.currentProfile.contactName!,
        contactEmail: this.currentProfile.contactEmail!,
        contactPhone: this.currentProfile.contactPhone!,
        address: this.currentProfile.address || ''
      };
      
      this.identityService.updateOwnerProfile(profileToUpdate.id, profileToUpdate).subscribe({
        next: () => {
          this.loadProfiles();
          this.cancelEdit();
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to update profile: ' + err.message;
          this.loading = false;
        }
      });
    } else {
      // Create new profile - need to set userId
      const userData = localStorage.getItem('user');
      if (!userData) {
        this.error = 'No user found. Please log in again.';
        this.loading = false;
        return;
      }

      try {
        const user = JSON.parse(userData);
        if (!user.id) {
          this.error = 'Invalid user data. Please log in again.';
          this.loading = false;
          return;
        }
        this.currentProfile.userId = user.id;
      } catch (e) {
        this.error = 'Failed to parse user data. Please log in again.';
        this.loading = false;
        return;
      }

      this.identityService.createOwnerProfile(this.currentProfile as OwnerProfile).subscribe({
        next: () => {
          this.loadProfiles();
          this.cancelEdit();
          this.loading = false;
        },
        error: (err) => {
          this.error = 'Failed to create profile: ' + err.message;
          this.loading = false;
        }
      });
    }
  }

  cancelEdit(): void {
    this.showForm = false;
    this.editingProfile = false;
    this.currentProfile = {};
  }

  viewDetails(profileId: string): void {
    this.router.navigate(['/identity/owner-profiles', profileId]);
  }

  viewDashboard(profileId: string): void {
    // Navigate to owner dashboard with profile ID
    this.router.navigate(['/owner-dashboard'], { queryParams: { profileId } });
  }

  editProfile(profile: OwnerProfile): void {
    this.editingProfile = true;
    this.currentProfile = { ...profile };
    this.showForm = true;
  }

  deleteProfile(id: string): void {
    if (confirm('Are you sure you want to delete this owner profile?')) {
      this.identityService.deleteOwnerProfile(id).subscribe({
        next: () => {
          this.loadProfiles();
        },
        error: (err) => {
          this.error = 'Failed to delete profile: ' + err.message;
        }
      });
    }
  }

  getInitials(name: string): string {
    if (!name) return '??';
    const parts = name.split(' ');
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  getUniqueCompanies(): number {
    const companies = new Set(this.profiles.map(p => p.companyName));
    return companies.size;
  }
}
