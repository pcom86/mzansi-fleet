import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IdentityService } from '../../services';
import { Tenant, User, OwnerProfile } from '../../models';

@Component({
  selector: 'app-onboarding-wizard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="wizard-container">
      <!-- Progress Steps -->
      <div class="progress-bar">
        <div class="step" [class.active]="currentStep === 1" [class.completed]="currentStep > 1">
          <div class="step-circle">
            <span *ngIf="currentStep > 1">✓</span>
            <span *ngIf="currentStep <= 1">1</span>
          </div>
          <div class="step-label">Organization</div>
          <div class="step-description">Create your organization</div>
        </div>
        <div class="step-line" [class.completed]="currentStep > 1"></div>
        
        <div class="step" [class.active]="currentStep === 2" [class.completed]="currentStep > 2">
          <div class="step-circle">
            <span *ngIf="currentStep > 2">✓</span>
            <span *ngIf="currentStep <= 2">2</span>
          </div>
          <div class="step-label">User Account</div>
          <div class="step-description">Create admin user</div>
        </div>
        <div class="step-line" [class.completed]="currentStep > 2"></div>
        
        <div class="step" [class.active]="currentStep === 3" [class.completed]="currentStep > 3">
          <div class="step-circle">
            <span *ngIf="currentStep > 3">✓</span>
            <span *ngIf="currentStep <= 3">3</span>
          </div>
          <div class="step-label">Owner Profile</div>
          <div class="step-description">Setup owner details</div>
        </div>
      </div>

      <!-- Error Banner -->
      <div class="error-banner" *ngIf="error">
        <span class="error-icon">⚠️</span>
        {{ error }}
      </div>

      <!-- Success Banner -->
      <div class="success-banner" *ngIf="success">
        <span class="success-icon">✓</span>
        {{ success }}
      </div>

      <!-- Step 1: Create Tenant/Organization -->
      <div class="wizard-step" *ngIf="currentStep === 1">
        <div class="step-card">
          <div class="step-header">
            <h2>🏢 Create Your Organization</h2>
            <p>Start by setting up your organization (tenant). This is the top-level entity that contains all users and profiles.</p>
          </div>
          
          <form (ngSubmit)="createTenant()">
            <div class="form-grid">
              <div class="form-group full-width">
                <label>Organization Name *</label>
                <input type="text" [(ngModel)]="tenantData.name" name="name" required 
                       placeholder="e.g., ABC Transport Ltd">
              </div>
              
              <div class="form-group">
                <label>Contact Email *</label>
                <input type="email" [(ngModel)]="tenantData.contactEmail" name="contactEmail" required 
                       placeholder="e.g., info@abctransport.com">
              </div>
              
              <div class="form-group">
                <label>Contact Phone *</label>
                <input type="tel" [(ngModel)]="tenantData.contactPhone" name="contactPhone" required 
                       placeholder="e.g., +27 11 123 4567">
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn-secondary" (click)="cancel()">Cancel</button>
              <button type="submit" class="btn-primary" [disabled]="loading">
                <span *ngIf="!loading">Continue to User Setup →</span>
                <span *ngIf="loading">Creating...</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Step 2: Create User -->
      <div class="wizard-step" *ngIf="currentStep === 2">
        <div class="step-card">
          <div class="step-header">
            <h2>👤 Create Admin User</h2>
            <p>Now create the administrator user account for <strong>{{ createdTenant?.name }}</strong></p>
            <div class="info-box">
              <span class="info-icon">ℹ️</span>
              This user will be associated with your organization and will have admin privileges.
            </div>
          </div>
          
          <form (ngSubmit)="createUser()">
            <div class="form-grid">
              <div class="form-group">
                <label>First Name *</label>
                <input type="text" [(ngModel)]="userData.firstName" name="firstName" required 
                       placeholder="e.g., John">
              </div>
              
              <div class="form-group">
                <label>Last Name *</label>
                <input type="text" [(ngModel)]="userData.lastName" name="lastName" required 
                       placeholder="e.g., Doe">
              </div>
              
              <div class="form-group">
                <label>Email *</label>
                <input type="email" [(ngModel)]="userData.email" name="email" required 
                       placeholder="e.g., john.doe@abctransport.com">
              </div>
              
              <div class="form-group">
                <label>Phone Number *</label>
                <input type="tel" [(ngModel)]="userData.phone" name="phone" required 
                       placeholder="e.g., +27 82 123 4567">
              </div>
              
              <div class="form-group">
                <label>Password *</label>
                <input type="password" [(ngModel)]="userData.password" name="password" required 
                       placeholder="Enter secure password">
              </div>
              
              <div class="form-group">
                <label>Role *</label>
                <select [(ngModel)]="userData.role" name="role" required>
                  <option value="">Select role</option>
                  <option value="Admin">Admin</option>
                  <option value="Owner">Owner</option>
                  <option value="Manager">Manager</option>
                </select>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn-secondary" (click)="goBack()">← Back</button>
              <button type="submit" class="btn-primary" [disabled]="loading">
                <span *ngIf="!loading">Continue to Owner Profile →</span>
                <span *ngIf="loading">Creating...</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Step 3: Create Owner Profile -->
      <div class="wizard-step" *ngIf="currentStep === 3">
        <div class="step-card">
          <div class="step-header">
            <h2>📋 Setup Owner Profile</h2>
            <p>Finally, create the owner profile for <strong>{{ userData.firstName }} {{ userData.lastName }}</strong></p>
            <div class="info-box">
              <span class="info-icon">ℹ️</span>
              The owner profile contains additional business information for fleet ownership and management.
            </div>
          </div>
          
          <form (ngSubmit)="createOwnerProfile()">
            <div class="form-grid">
              <div class="form-group">
                <label>Contact Name *</label>
                <input type="text" [(ngModel)]="ownerProfileData.contactName" name="contactName" required 
                       placeholder="e.g., John Doe">
              </div>
              
              <div class="form-group">
                <label>Company Name *</label>
                <input type="text" [(ngModel)]="ownerProfileData.companyName" name="companyName" required 
                       placeholder="e.g., ABC Fleet Services">
              </div>
              
              <div class="form-group">
                <label>Contact Email *</label>
                <input type="email" [(ngModel)]="ownerProfileData.contactEmail" name="contactEmail" required 
                       placeholder="e.g., john@abcfleet.com">
              </div>
              
              <div class="form-group">
                <label>Contact Phone *</label>
                <input type="tel" [(ngModel)]="ownerProfileData.contactPhone" name="contactPhone" required 
                       placeholder="e.g., +27 82 123 4567">
              </div>
              
              <div class="form-group full-width">
                <label>Address</label>
                <textarea [(ngModel)]="ownerProfileData.address" name="address" rows="3" 
                          placeholder="e.g., 123 Main Street, Johannesburg, 2000"></textarea>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn-secondary" (click)="goBack()">← Back</button>
              <button type="submit" class="btn-primary" [disabled]="loading">
                <span *ngIf="!loading">Complete Setup ✓</span>
                <span *ngIf="loading">Creating...</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Summary View -->
      <div class="wizard-step" *ngIf="currentStep === 4">
        <div class="step-card success-card">
          <div class="success-illustration">
            <div class="success-circle">✓</div>
          </div>
          <h2>🎉 Setup Complete!</h2>
          <p class="success-message">Your organization has been successfully created with all necessary accounts.</p>
          
          <div class="summary-grid">
            <div class="summary-card">
              <div class="summary-icon">🏢</div>
              <h3>Organization</h3>
              <p class="summary-title">{{ createdTenant?.name }}</p>
              <p class="summary-detail">{{ createdTenant?.contactEmail }}</p>
            </div>
            
            <div class="summary-card">
              <div class="summary-icon">👤</div>
              <h3>Admin User</h3>
              <p class="summary-title">{{ userData.firstName }} {{ userData.lastName }}</p>
              <p class="summary-detail">{{ createdUser?.email }}</p>
            </div>
            
            <div class="summary-card">
              <div class="summary-icon">📋</div>
              <h3>Owner Profile</h3>
              <p class="summary-title">{{ createdOwnerProfile?.companyName }}</p>
              <p class="summary-detail">{{ createdOwnerProfile?.contactEmail }}</p>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn-primary" (click)="goToDashboard()">
              Go to Dashboard →
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .wizard-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 2rem;
      min-height: 100vh;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    }

    .progress-bar {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 3rem;
      background: white;
      padding: 2rem;
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .step {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      position: relative;
    }

    .step-circle {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #e5e7eb;
      color: #9ca3af;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 700;
      margin-bottom: 1rem;
      transition: all 0.3s ease;
      border: 4px solid #e5e7eb;
    }

    .step.active .step-circle {
      background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%);
      color: #000000;
      border-color: #FFD700;
      box-shadow: 0 4px 20px rgba(212, 175, 55, 0.4);
      transform: scale(1.1);
    }

    .step.completed .step-circle {
      background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
      color: white;
      border-color: #10b981;
    }

    .step-label {
      font-weight: 700;
      font-size: 1rem;
      color: #374151;
      margin-bottom: 0.25rem;
    }

    .step-description {
      font-size: 0.875rem;
      color: #6b7280;
    }

    .step.active .step-label {
      color: #D4AF37;
    }

    .step.completed .step-label {
      color: #10b981;
    }

    .step-line {
      flex: 1;
      height: 4px;
      background: #e5e7eb;
      margin: 30px 1rem 0;
      border-radius: 2px;
      transition: all 0.3s ease;
    }

    .step-line.completed {
      background: linear-gradient(90deg, #10b981 0%, #34d399 100%);
    }

    .wizard-step {
      animation: fadeInUp 0.5s ease;
    }

    @keyframes fadeInUp {
      from {
        opacity: 0;
        transform: translateY(30px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .step-card {
      background: white;
      border-radius: 20px;
      padding: 3rem;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
    }

    .step-header {
      margin-bottom: 2.5rem;
    }

    .step-header h2 {
      font-size: 2rem;
      font-weight: 700;
      color: #000000;
      margin-bottom: 0.75rem;
    }

    .step-header p {
      font-size: 1.125rem;
      color: #6b7280;
      line-height: 1.6;
    }

    .step-header strong {
      color: #D4AF37;
      font-weight: 700;
    }

    .info-box {
      background: linear-gradient(135deg, #FFF9E5 0%, #FFECB3 100%);
      border-left: 4px solid #D4AF37;
      padding: 1rem 1.5rem;
      border-radius: 10px;
      margin-top: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .info-icon {
      font-size: 1.5rem;
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
      justify-content: space-between;
      gap: 1rem;
      margin-top: 2rem;
    }

    .btn-primary,
    .btn-secondary {
      padding: 1rem 2.5rem;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
      font-size: 1rem;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-primary {
      background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
      color: #FFD700;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
      flex: 1;
      justify-content: center;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
    }

    .btn-secondary:hover {
      background: #e5e7eb;
    }

    .error-banner,
    .success-banner {
      padding: 1rem 1.5rem;
      border-radius: 10px;
      margin-bottom: 2rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      animation: slideIn 0.3s ease;
    }

    .error-banner {
      background: #fee2e2;
      border-left: 4px solid #ef4444;
      color: #991b1b;
    }

    .success-banner {
      background: #d1fae5;
      border-left: 4px solid #10b981;
      color: #065f46;
    }

    .error-icon,
    .success-icon {
      font-size: 1.5rem;
    }

    @keyframes slideIn {
      from {
        transform: translateX(-20px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }

    .success-card {
      text-align: center;
    }

    .success-illustration {
      margin-bottom: 2rem;
    }

    .success-circle {
      width: 120px;
      height: 120px;
      border-radius: 50%;
      background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
      color: white;
      font-size: 4rem;
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 0 auto 2rem;
      box-shadow: 0 10px 40px rgba(16, 185, 129, 0.3);
      animation: scaleIn 0.5s ease;
    }

    @keyframes scaleIn {
      from {
        transform: scale(0);
        opacity: 0;
      }
      to {
        transform: scale(1);
        opacity: 1;
      }
    }

    .success-message {
      font-size: 1.25rem;
      color: #6b7280;
      margin-bottom: 3rem;
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 2rem;
      margin-bottom: 3rem;
    }

    .summary-card {
      background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
      padding: 2rem;
      border-radius: 15px;
      border: 2px solid #e5e7eb;
    }

    .summary-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }

    .summary-card h3 {
      font-size: 0.875rem;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }

    .summary-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #000000;
      margin-bottom: 0.5rem;
    }

    .summary-detail {
      color: #6b7280;
      font-size: 0.875rem;
    }

    @media (max-width: 768px) {
      .wizard-container {
        padding: 1rem;
      }

      .progress-bar {
        flex-direction: column;
        padding: 1.5rem;
      }

      .step-line {
        display: none;
      }

      .step {
        flex-direction: row;
        justify-content: flex-start;
        margin-bottom: 1rem;
        width: 100%;
      }

      .step-circle {
        margin-right: 1rem;
        margin-bottom: 0;
      }

      .step-label,
      .step-description {
        text-align: left;
      }

      .step-card {
        padding: 1.5rem;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .summary-grid {
        grid-template-columns: 1fr;
      }

      .form-actions {
        flex-direction: column;
      }

      .btn-primary,
      .btn-secondary {
        width: 100%;
      }
    }
  `]
})
export class OnboardingWizardComponent implements OnInit {
  currentStep = 1;
  loading = false;
  error: string | null = null;
  success: string | null = null;

  // Step 1: Tenant data
  tenantData: Partial<Tenant> = {};
  createdTenant: Tenant | null = null;

  // Step 2: User data
  userData: Partial<User> & { password?: string; firstName?: string; lastName?: string } = {};
  createdUser: User | null = null;

  // Step 3: Owner Profile data
  ownerProfileData: Partial<OwnerProfile> = {};
  createdOwnerProfile: OwnerProfile | null = null;

  constructor(
    private identityService: IdentityService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Check if user is already logged in, redirect to dashboard
    const user = localStorage.getItem('user');
    if (user) {
      // this.router.navigate(['/dashboard']);
    }
  }

  async createTenant(): Promise<void> {
    if (!this.tenantData.name || !this.tenantData.contactEmail || !this.tenantData.contactPhone) {
      this.error = 'Please fill in all required fields';
      return;
    }

    this.loading = true;
    this.error = null;

    this.identityService.createTenant(this.tenantData as Tenant).subscribe({
      next: (tenant) => {
        this.createdTenant = tenant;
        this.success = 'Organization created successfully!';
        setTimeout(() => {
          this.success = null;
          this.currentStep = 2;
          // Pre-populate user data
          this.userData.tenantId = tenant.id;
        }, 1500);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to create organization: ' + err.message;
        this.loading = false;
      }
    });
  }

  async createUser(): Promise<void> {
    if (!this.userData.firstName || !this.userData.lastName || !this.userData.email || 
        !this.userData.phone || !this.userData.password || !this.userData.role) {
      this.error = 'Please fill in all required fields';
      return;
    }

    this.loading = true;
    this.error = null;

    this.identityService.createUser(this.userData as User).subscribe({
      next: (user) => {
        this.createdUser = user;
        this.success = 'User created successfully!';
        setTimeout(() => {
          this.success = null;
          this.currentStep = 3;
          // Pre-populate owner profile data
          this.ownerProfileData.userId = user.id;
          this.ownerProfileData.contactName = `${this.userData.firstName} ${this.userData.lastName}`;
          this.ownerProfileData.contactEmail = user.email;
          this.ownerProfileData.contactPhone = user.phone;
        }, 1500);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to create user: ' + err.message;
        this.loading = false;
      }
    });
  }

  async createOwnerProfile(): Promise<void> {
    if (!this.ownerProfileData.contactName || !this.ownerProfileData.companyName || 
        !this.ownerProfileData.contactEmail || !this.ownerProfileData.contactPhone) {
      this.error = 'Please fill in all required fields';
      return;
    }

    this.loading = true;
    this.error = null;

    this.identityService.createOwnerProfile(this.ownerProfileData as OwnerProfile).subscribe({
      next: (profile) => {
        this.createdOwnerProfile = profile;
        this.success = 'Owner profile created successfully!';
        setTimeout(() => {
          this.success = null;
          this.currentStep = 4;
        }, 1500);
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to create owner profile: ' + err.message;
        this.loading = false;
      }
    });
  }

  goBack(): void {
    if (this.currentStep > 1) {
      this.currentStep--;
      this.error = null;
    }
  }

  cancel(): void {
    this.router.navigate(['/']);
  }

  goToDashboard(): void {
    // Store created user as logged in
    if (this.createdUser) {
      localStorage.setItem('user', JSON.stringify(this.createdUser));
    }
    this.router.navigate(['/dashboard']);
  }
}
