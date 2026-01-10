import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MzansiFleetLogoComponent } from '../shared/mzansi-fleet-logo.component';

interface DriverRegistration {
  name: string;
  idNumber: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  photoUrl: string;
  licenseCopy: string;
  experience: string;
  category: string;
  hasPdp: boolean;
  pdpCopy: string;
}

@Component({
  selector: 'app-driver-registration',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MzansiFleetLogoComponent
  ],
  template: `
    <div class="registration-container">
      <mat-card class="registration-card">
        <mat-card-header>
          <div class="header-content">
            <app-mzansi-fleet-logo></app-mzansi-fleet-logo>
            <h2 class="title">Driver Registration</h2>
            <p class="subtitle">Join our fleet and start driving today</p>
          </div>
        </mat-card-header>

        <mat-card-content>
          <form #regForm="ngForm" (ngSubmit)="onSubmit()">
            <div class="form-section">
              <h3 class="section-title">
                <mat-icon>person</mat-icon>
                Personal Information
              </h3>

              <div class="form-group">
                <label>Full Name *</label>
                <input 
                  type="text" 
                  name="name" 
                  [(ngModel)]="driver.name" 
                  required
                  placeholder="Enter your full name">
              </div>

              <div class="form-group">
                <label>ID/Passport Number *</label>
                <input 
                  type="text" 
                  name="idNumber" 
                  [(ngModel)]="driver.idNumber" 
                  required
                  placeholder="Enter your ID or passport number">
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label>Phone Number *</label>
                  <input 
                    type="tel" 
                    name="phone" 
                    [(ngModel)]="driver.phone" 
                    required
                    placeholder="+27 XX XXX XXXX">
                </div>

                <div class="form-group">
                  <label>Email Address *</label>
                  <input 
                    type="email" 
                    name="email" 
                    [(ngModel)]="driver.email" 
                    required
                    placeholder="your.email@example.com">
                </div>
              </div>

              <div class="form-group">
                <label>Profile Photo</label>
                <div class="file-input-wrapper">
                  <input 
                    type="file" 
                    id="photoFile" 
                    (change)="onPhotoSelected($event)"
                    accept="image/*"
                    hidden>
                  <label for="photoFile" class="file-label">
                    <mat-icon>photo_camera</mat-icon>
                    {{ photoFileName || 'Choose photo' }}
                  </label>
                  <button 
                    type="button" 
                    *ngIf="driver.photoUrl" 
                    (click)="removePhoto()"
                    class="btn-remove">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
                <div *ngIf="driver.photoUrl" class="photo-preview">
                  <img [src]="driver.photoUrl" alt="Profile photo">
                </div>
              </div>
            </div>

            <div class="form-section">
              <h3 class="section-title">
                <mat-icon>badge</mat-icon>
                License Information
              </h3>

              <div class="form-group">
                <label>License Category *</label>
                <select 
                  name="category" 
                  [(ngModel)]="driver.category" 
                  required>
                  <option value="">Select license category</option>
                  <option value="Light Vehicle Code B">Light Vehicle (Code B)</option>
                  <option value="Taxi Code C1">Taxi (Code C1)</option>
                  <option value="Truck Code C/EC">Truck (Code C/EC)</option>
                </select>
              </div>

              <div class="form-group">
                <label>License Copy *</label>
                <div class="file-input-wrapper">
                  <input 
                    type="file" 
                    id="licenseFile" 
                    (change)="onLicenseSelected($event)"
                    accept="image/*,application/pdf"
                    hidden>
                  <label for="licenseFile" class="file-label">
                    <mat-icon>description</mat-icon>
                    {{ licenseFileName || 'Upload license copy' }}
                  </label>
                  <button 
                    type="button" 
                    *ngIf="driver.licenseCopy" 
                    (click)="removeLicense()"
                    class="btn-remove">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
                <p class="help-text">Upload a clear photo or PDF of your driver's license</p>
              </div>

              <div class="form-group">
                <label>Driving Experience</label>
                <textarea 
                  name="experience" 
                  [(ngModel)]="driver.experience" 
                  rows="3"
                  placeholder="Brief summary of your driving experience (optional)"></textarea>
              </div>

              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input 
                    type="checkbox" 
                    name="hasPdp" 
                    [(ngModel)]="driver.hasPdp">
                  <span>I have a Professional Driving Permit (PDP)</span>
                </label>
              </div>

              <div class="form-group" *ngIf="driver.hasPdp">
                <label>PDP Copy *</label>
                <div class="file-input-wrapper">
                  <input 
                    type="file" 
                    id="pdpFile" 
                    (change)="onPdpSelected($event)"
                    accept="image/*,application/pdf"
                    hidden>
                  <label for="pdpFile" class="file-label">
                    <mat-icon>description</mat-icon>
                    {{ pdpFileName || 'Upload PDP copy' }}
                  </label>
                  <button 
                    type="button" 
                    *ngIf="driver.pdpCopy" 
                    (click)="removePdp()"
                    class="btn-remove">
                    <mat-icon>close</mat-icon>
                  </button>
                </div>
              </div>
            </div>

            <div class="form-section">
              <h3 class="section-title">
                <mat-icon>lock</mat-icon>
                Account Security
              </h3>

              <div class="form-group">
                <label>Password *</label>
                <input 
                  type="password" 
                  name="password" 
                  [(ngModel)]="driver.password" 
                  required
                  minlength="6"
                  placeholder="Create a secure password">
                <p class="help-text">Minimum 6 characters</p>
              </div>

              <div class="form-group">
                <label>Confirm Password *</label>
                <input 
                  type="password" 
                  name="confirmPassword" 
                  [(ngModel)]="driver.confirmPassword" 
                  required
                  placeholder="Re-enter your password">
                <p class="error-text" *ngIf="driver.confirmPassword && driver.password !== driver.confirmPassword">
                  Passwords do not match
                </p>
              </div>
            </div>

            <div class="form-actions">
              <button 
                type="button" 
                class="btn-secondary"
                routerLink="/login"
                [disabled]="loading">
                <mat-icon>arrow_back</mat-icon>
                Back to Login
              </button>
              <button 
                type="submit" 
                class="btn-primary"
                [disabled]="!regForm.form.valid || loading || (driver.password !== driver.confirmPassword) || !driver.licenseCopy || (driver.hasPdp && !driver.pdpCopy)">
                <mat-spinner *ngIf="loading" diameter="20"></mat-spinner>
                <span *ngIf="!loading">
                  <mat-icon>how_to_reg</mat-icon>
                  Register
                </span>
              </button>
            </div>

            <p class="error-message" *ngIf="error">{{ error }}</p>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .registration-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #FFFFFF 0%, #f5f5f5 50%, #e8e8e8 100%);
      padding: 2rem 1rem;
      display: flex;
      justify-content: center;
      align-items: center;
    }

    .registration-card {
      width: 100%;
      max-width: 800px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      border-radius: 16px;
      border: 3px solid #D4AF37;
      background: #FFFFFF;
    }

    .header-content {
      text-align: center;
      padding: 1rem 0;
    }

    .title {
      font-size: 2rem;
      font-weight: 700;
      color: #000000;
      margin: 1rem 0 0.5rem;
    }

    .subtitle {
      color: #6c757d;
      font-size: 1rem;
      margin: 0;
    }

    mat-card-header {
      display: block;
      margin-bottom: 2rem;
    }

    mat-card-content {
      padding: 0 2rem 2rem;
    }

    .form-section {
      margin-bottom: 2rem;
      padding-bottom: 2rem;
      border-bottom: 2px solid #f0f0f0;
    }

    .form-section:last-of-type {
      border-bottom: none;
    }

    .section-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.25rem;
      font-weight: 600;
      color: #000000;
      margin: 0 0 1.5rem;
    }

    .section-title mat-icon {
      color: #D4AF37;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    label {
      display: block;
      font-weight: 600;
      color: #374151;
      margin-bottom: 0.5rem;
      font-size: 0.95rem;
    }

    input[type="text"],
    input[type="email"],
    input[type="tel"],
    input[type="password"],
    select,
    textarea {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.3s ease;
      font-family: inherit;
    }

    input:focus,
    select:focus,
    textarea:focus {
      outline: none;
      border-color: #D4AF37;
      box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
    }

    select {
      cursor: pointer;
      background-color: white;
    }

    textarea {
      resize: vertical;
    }

    .file-input-wrapper {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .file-label {
      flex: 1;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: #f9fafb;
      border: 2px dashed #d1d5db;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-weight: 500;
      color: #6b7280;
    }

    .file-label:hover {
      background: #f3f4f6;
      border-color: #D4AF37;
    }

    .btn-remove {
      padding: 0.5rem;
      background: #ef4444;
      color: white;
      border: none;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      width: 40px;
      height: 40px;
    }

    .btn-remove:hover {
      background: #dc2626;
      transform: scale(1.1);
    }

    .photo-preview {
      margin-top: 1rem;
      text-align: center;
    }

    .photo-preview img {
      max-width: 200px;
      max-height: 200px;
      border-radius: 12px;
      border: 3px solid #D4AF37;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .checkbox-group {
      display: flex;
      align-items: center;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      font-weight: 500;
      margin: 0;
    }

    .checkbox-label input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
      accent-color: #D4AF37;
    }

    .help-text {
      font-size: 0.875rem;
      color: #6b7280;
      margin-top: 0.5rem;
    }

    .error-text {
      font-size: 0.875rem;
      color: #ef4444;
      margin-top: 0.5rem;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: space-between;
      margin-top: 2rem;
    }

    .btn-primary,
    .btn-secondary {
      flex: 1;
      padding: 1rem 2rem;
      border: none;
      border-radius: 12px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
    }

    .btn-primary {
      background: linear-gradient(135deg, #D4AF37 0%, #C5A028 100%);
      color: #000000;
    }

    .btn-primary:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 8px 20px rgba(212, 175, 55, 0.3);
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
    }

    .btn-secondary:hover:not(:disabled) {
      background: #e5e7eb;
    }

    .btn-primary:disabled,
    .btn-secondary:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .error-message {
      color: #ef4444;
      background: #fee2e2;
      padding: 1rem;
      border-radius: 8px;
      margin-top: 1rem;
      text-align: center;
      font-weight: 500;
    }

    mat-spinner {
      display: inline-block;
    }

    @media (max-width: 768px) {
      mat-card-content {
        padding: 0 1rem 1rem;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .title {
        font-size: 1.5rem;
      }

      .form-actions {
        flex-direction: column;
      }
    }
  `]
})
export class DriverRegistrationComponent {
  driver: DriverRegistration = {
    name: '',
    idNumber: '',
    phone: '',
    email: '',
    password: '',
    confirmPassword: '',
    photoUrl: '',
    licenseCopy: '',
    experience: '',
    category: '',
    hasPdp: false,
    pdpCopy: ''
  };

  photoFileName = '';
  licenseFileName = '';
  pdpFileName = '';
  loading = false;
  error = '';

  private apiUrl = 'http://localhost:5000/api/Identity';

  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  onPhotoSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.photoFileName = file.name;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.driver.photoUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto() {
    this.driver.photoUrl = '';
    this.photoFileName = '';
  }

  onLicenseSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.licenseFileName = file.name;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.driver.licenseCopy = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeLicense() {
    this.driver.licenseCopy = '';
    this.licenseFileName = '';
  }

  onPdpSelected(event: any) {
    const file = event.target.files[0];
    if (file) {
      this.pdpFileName = file.name;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.driver.pdpCopy = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removePdp() {
    this.driver.pdpCopy = '';
    this.pdpFileName = '';
  }

  async onSubmit() {
    if (this.driver.password !== this.driver.confirmPassword) {
      this.error = 'Passwords do not match';
      return;
    }

    this.loading = true;
    this.error = '';

    try {
      // First, get available tenants to find a valid one
      let tenantId = '00000000-0000-0000-0000-000000000000';
      
      try {
        const tenants: any = await this.http.get(`${this.apiUrl}/tenants`).toPromise();
        if (tenants && tenants.length > 0) {
          // Use the first available tenant (you may want to create a specific "Pending Drivers" tenant)
          tenantId = tenants[0].id;
        }
      } catch (tenantErr) {
        console.warn('Could not fetch tenants, using default:', tenantErr);
      }

      // Create user account
      const newUser = {
        email: this.driver.email,
        phone: this.driver.phone,
        password: this.driver.password,
        role: 'Driver',
        tenantId: tenantId,
        isActive: true // Active immediately - driver can login right away
      };

      const user: any = await this.http.post(`${this.apiUrl}/users`, newUser).toPromise();

      // Create driver profile
      const driverProfile = {
        userId: user.id,
        name: this.driver.name,
        idNumber: this.driver.idNumber,
        phone: this.driver.phone,
        email: this.driver.email,
        photoUrl: this.driver.photoUrl || '',
        licenseCopy: this.driver.licenseCopy,
        experience: this.driver.experience || '',
        category: this.driver.category,
        hasPdp: this.driver.hasPdp,
        pdpCopy: this.driver.pdpCopy || '',
        isActive: true, // Active immediately
        isAvailable: true, // Available for assignment
        assignedVehicleId: null
      };

      await this.http.post(`${this.apiUrl}/driverprofiles`, driverProfile).toPromise();

      this.snackBar.open('✅ Registration successful! You can now login with your credentials.', 'Close', {
        duration: 5000,
        horizontalPosition: 'center',
        verticalPosition: 'top',
        panelClass: ['success-snackbar']
      });

      // Redirect to login
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);

    } catch (err: any) {
      console.error('Registration error:', err);
      
      // Provide more specific error messages
      let errorMessage = 'Registration failed. Please try again.';
      
      if (err?.error?.message) {
        errorMessage = err.error.message;
      } else if (err?.message) {
        errorMessage = err.message;
      }
      
      // Check for specific error patterns
      if (errorMessage.includes('violates foreign key constraint') || errorMessage.includes('tenant')) {
        errorMessage = 'Unable to complete registration. Please contact support for assistance.';
      } else if (errorMessage.includes('duplicate') || errorMessage.includes('already exists')) {
        errorMessage = 'An account with this email already exists. Please use a different email or try logging in.';
      }
      
      this.error = errorMessage;
      this.loading = false;
    }
  }
}
