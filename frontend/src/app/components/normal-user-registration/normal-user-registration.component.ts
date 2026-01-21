import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { MzansiFleetLogoComponent } from '../shared/mzansi-fleet-logo.component';

@Component({
  selector: 'app-normal-user-registration',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
    MzansiFleetLogoComponent
  ],
  template: `
    <div class="registration-container">
      <mat-card class="registration-card">
        <mat-card-header>
          <div class="header-content">
            <app-mzansi-fleet-logo></app-mzansi-fleet-logo>
            <h1>Create User Account</h1>
            <p class="subtitle">Book vehicles, post tenders, rent cars, call cabs & more</p>
          </div>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="registrationForm" (ngSubmit)="onSubmit()">
            <!-- Personal Information -->
            <div class="section-header">
              <mat-icon>person</mat-icon>
              <h3>Personal Information</h3>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Full Name</mat-label>
                <input 
                  matInput 
                  formControlName="fullName" 
                  placeholder="John Doe"
                  required>
                <mat-icon matPrefix>badge</mat-icon>
                <mat-error *ngIf="registrationForm.get('fullName')?.hasError('required')">
                  Full name is required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Email Address</mat-label>
                <input 
                  matInput 
                  formControlName="email" 
                  type="email"
                  placeholder="john@example.com"
                  required>
                <mat-icon matPrefix>email</mat-icon>
                <mat-error *ngIf="registrationForm.get('email')?.hasError('required')">
                  Email is required
                </mat-error>
                <mat-error *ngIf="registrationForm.get('email')?.hasError('email')">
                  Please enter a valid email
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Phone Number</mat-label>
                <input 
                  matInput 
                  formControlName="phone" 
                  placeholder="+27 XX XXX XXXX"
                  required>
                <mat-icon matPrefix>phone</mat-icon>
                <mat-error *ngIf="registrationForm.get('phone')?.hasError('required')">
                  Phone number is required
                </mat-error>
              </mat-form-field>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>ID Number (Optional)</mat-label>
                <input 
                  matInput 
                  formControlName="idNumber" 
                  placeholder="Enter your ID number">
                <mat-icon matPrefix>fingerprint</mat-icon>
              </mat-form-field>
            </div>

            <!-- Account Security -->
            <div class="section-header">
              <mat-icon>lock</mat-icon>
              <h3>Account Security</h3>
            </div>

            <div class="form-row">
              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Password</mat-label>
                <input 
                  matInput 
                  formControlName="password" 
                  [type]="hidePassword ? 'password' : 'text'"
                  required>
                <mat-icon matPrefix>vpn_key</mat-icon>
                <button 
                  mat-icon-button 
                  matSuffix 
                  (click)="hidePassword = !hidePassword" 
                  type="button">
                  <mat-icon>{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                <mat-error *ngIf="registrationForm.get('password')?.hasError('required')">
                  Password is required
                </mat-error>
                <mat-error *ngIf="registrationForm.get('password')?.hasError('minlength')">
                  Password must be at least 6 characters
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="half-width">
                <mat-label>Confirm Password</mat-label>
                <input 
                  matInput 
                  formControlName="confirmPassword" 
                  [type]="hideConfirmPassword ? 'password' : 'text'"
                  required>
                <mat-icon matPrefix>vpn_key</mat-icon>
                <button 
                  mat-icon-button 
                  matSuffix 
                  (click)="hideConfirmPassword = !hideConfirmPassword" 
                  type="button">
                  <mat-icon>{{hideConfirmPassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                </button>
                <mat-error *ngIf="registrationForm.get('confirmPassword')?.hasError('required')">
                  Please confirm your password
                </mat-error>
                <mat-error *ngIf="registrationForm.hasError('passwordMismatch')">
                  Passwords do not match
                </mat-error>
              </mat-form-field>
            </div>

            <!-- Services -->
            <div class="section-header">
              <mat-icon>local_activity</mat-icon>
              <h3>Available Services</h3>
            </div>

            <div class="services-info">
              <div class="service-item">
                <mat-icon color="primary">directions_car</mat-icon>
                <span>Book vehicles for transport</span>
              </div>
              <div class="service-item">
                <mat-icon color="primary">description</mat-icon>
                <span>Post transport tenders</span>
              </div>
              <div class="service-item">
                <mat-icon color="primary">car_rental</mat-icon>
                <span>Rent cars for personal use</span>
              </div>
              <div class="service-item">
                <mat-icon color="primary">local_taxi</mat-icon>
                <span>Call a cab on demand</span>
              </div>
              <div class="service-item">
                <mat-icon color="primary">map</mat-icon>
                <span>Book and manage trips</span>
              </div>
            </div>

            <!-- Terms and Conditions -->
            <div class="terms-section">
              <mat-checkbox formControlName="acceptTerms" color="primary">
                I agree to the <a href="#" (click)="$event.preventDefault()">Terms and Conditions</a> 
                and <a href="#" (click)="$event.preventDefault()">Privacy Policy</a>
              </mat-checkbox>
              <mat-error *ngIf="registrationForm.get('acceptTerms')?.hasError('required') && registrationForm.get('acceptTerms')?.touched">
                You must accept the terms and conditions
              </mat-error>
            </div>

            <!-- Submit Button -->
            <button 
              mat-raised-button 
              color="primary" 
              type="submit" 
              class="submit-button"
              [disabled]="registrationForm.invalid || loading">
              <mat-spinner *ngIf="loading" diameter="20" class="button-spinner"></mat-spinner>
              <span *ngIf="!loading">
                <mat-icon>person_add</mat-icon>
                Create Account
              </span>
            </button>
          </form>

          <div class="login-section">
            <p>Already have an account? <a routerLink="/login">Login here</a></p>
          </div>
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
    }

    .header-content {
      width: 100%;
      text-align: center;
      padding: 1rem 0;
    }

    app-mzansi-fleet-logo {
      display: block;
      margin: 0 auto 1rem;
    }

    h1 {
      font-size: 2rem;
      color: #000000;
      margin: 0 0 0.5rem 0;
      font-weight: 600;
    }

    .subtitle {
      color: #6c757d;
      font-size: 0.95rem;
      margin: 0;
    }

    mat-card-header {
      display: block;
      margin-bottom: 1.5rem;
    }

    .section-header {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 2rem 0 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid #D4AF37;
    }

    .section-header mat-icon {
      color: #D4AF37;
    }

    .section-header h3 {
      margin: 0;
      font-size: 1.25rem;
      color: #000000;
      font-weight: 600;
    }

    .form-row {
      display: flex;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .full-width {
      width: 100%;
    }

    .half-width {
      width: 50%;
    }

    .services-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      padding: 1rem;
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.1) 0%, rgba(212, 175, 55, 0.05) 100%);
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .service-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      color: #495057;
    }

    .service-item mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .service-item span {
      font-size: 0.9rem;
    }

    .terms-section {
      margin: 1.5rem 0;
    }

    .terms-section a {
      color: #D4AF37;
      text-decoration: none;
    }

    .terms-section a:hover {
      text-decoration: underline;
    }

    .submit-button {
      width: 100%;
      height: 56px;
      font-size: 16px;
      font-weight: 600;
      margin-top: 1rem;
    }

    .submit-button mat-icon {
      margin-right: 0.5rem;
    }

    .button-spinner {
      margin: 0 auto;
    }

    .login-section {
      text-align: center;
      margin-top: 1.5rem;
      padding-top: 1.5rem;
      border-top: 1px solid #e0e0e0;
    }

    .login-section p {
      color: #6c757d;
      margin: 0;
    }

    .login-section a {
      color: #D4AF37;
      text-decoration: none;
      font-weight: 500;
    }

    .login-section a:hover {
      text-decoration: underline;
    }

    @media (max-width: 768px) {
      .registration-container {
        padding: 1rem 0.5rem;
      }

      .form-row {
        flex-direction: column;
      }

      .half-width {
        width: 100%;
      }

      .services-info {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class NormalUserRegistrationComponent {
  registrationForm: FormGroup;
  hidePassword = true;
  hideConfirmPassword = true;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.registrationForm = this.fb.group({
      fullName: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      idNumber: [''],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required],
      acceptTerms: [false, Validators.requiredTrue]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (!password || !confirmPassword) {
      return null;
    }

    return password.value === confirmPassword.value ? null : { passwordMismatch: true };
  }

  async onSubmit(): Promise<void> {
    if (this.registrationForm.invalid) {
      this.registrationForm.markAllAsTouched();
      return;
    }

    this.loading = true;

    try {
      const payload = {
        email: this.registrationForm.value.email,
        password: this.registrationForm.value.password,
        phone: this.registrationForm.value.phone,
        fullName: this.registrationForm.value.fullName,
        idNumber: this.registrationForm.value.idNumber || null,
        role: 'Customer', // Role for normal users
        isActive: true // Normal users are active by default
      };

      const response = await firstValueFrom(
        this.http.post('http://localhost:5000/api/Auth/register', payload)
      );

      this.snackBar.open('Account created successfully! Please login to continue.', 'Close', {
        duration: 5000,
        panelClass: ['success-snackbar']
      });

      // Navigate to login page
      setTimeout(() => {
        this.router.navigate(['/login']);
      }, 2000);

    } catch (error: any) {
      console.error('Registration error:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.status === 400) {
        errorMessage = error.error?.message || 'Invalid registration data. Please check your information.';
      } else if (error.status === 409) {
        errorMessage = 'An account with this email already exists.';
      } else if (error.status === 0) {
        errorMessage = 'Cannot connect to server. Please ensure the backend is running.';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      }

      this.snackBar.open(errorMessage, 'Close', {
        duration: 7000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.loading = false;
    }
  }
}
