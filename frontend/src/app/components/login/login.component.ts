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
import { MatDividerModule } from '@angular/material/divider';
import { firstValueFrom } from 'rxjs';
import { AuthService } from '../../services';
import { MzansiFleetLogoComponent } from '../shared/mzansi-fleet-logo.component';

@Component({
  selector: 'app-login',
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
    MatDividerModule,
    MzansiFleetLogoComponent
  ],
  template: `
    <div class="login-container">
      <mat-card class="login-card">
        <mat-card-header>
          <div class="header-content">
            <app-mzansi-fleet-logo></app-mzansi-fleet-logo>
            <mat-card-subtitle>Welcome back! Please login to your account</mat-card-subtitle>
          </div>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="loginForm" (ngSubmit)="onSubmit($event)">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email</mat-label>
              <input 
                matInput 
                formControlName="email" 
                type="email" 
                placeholder="owner@abctransport.com"
                autocomplete="email"
                required>
              <mat-icon matPrefix>email</mat-icon>
              <mat-error *ngIf="loginForm.get('email')?.hasError('required')">
                Email is required
              </mat-error>
              <mat-error *ngIf="loginForm.get('email')?.hasError('email')">
                Please enter a valid email
              </mat-error>
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Password</mat-label>
              <input 
                matInput 
                formControlName="password" 
                [type]="hidePassword ? 'password' : 'text'"
                autocomplete="current-password"
                required>
              <mat-icon matPrefix>lock</mat-icon>
              <button 
                mat-icon-button 
                matSuffix 
                (click)="hidePassword = !hidePassword" 
                type="button"
                [attr.aria-label]="'Hide password'" 
                [attr.aria-pressed]="hidePassword">
                <mat-icon>{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
              </button>
              <mat-error *ngIf="loginForm.get('password')?.hasError('required')">
                Password is required
              </mat-error>
            </mat-form-field>

            <button 
              mat-raised-button 
              color="primary" 
              type="submit" 
              class="full-width login-button"
              [disabled]="loginForm.invalid || loading">
              <mat-spinner *ngIf="loading" diameter="20" class="button-spinner"></mat-spinner>
              <span *ngIf="!loading">
                <mat-icon>login</mat-icon>
                Login
              </span>
            </button>
          </form>

          <mat-divider class="divider"></mat-divider>

          <div class="signup-section">
            <p class="signup-text">Don't have an account?</p>
            <div class="button-group">
              <button 
                mat-raised-button 
                color="accent" 
                class="signup-button"
                routerLink="/register"
                [disabled]="loading">
                <mat-icon>person_add</mat-icon>
                Register as Owner/Staff
              </button>
              <button 
                mat-raised-button 
                class="driver-button"
                routerLink="/driver-registration"
                [disabled]="loading">
                <mat-icon>local_shipping</mat-icon>
                Join as Driver
              </button>
              <button 
                mat-raised-button 
                class="service-provider-button"
                routerLink="/service-provider-registration"
                [disabled]="loading">
                <mat-icon>build_circle</mat-icon>
                Register as Service Provider
              </button>
              <button 
                mat-raised-button 
                class="taxi-rank-button"
                routerLink="/taxi-rank-user-registration"
                [disabled]="loading">
                <mat-icon>event_seat</mat-icon>
                Register Taxi Rank User
              </button>
            </div>
          </div>

          <div class="info-section">
            <mat-icon class="info-icon">info</mat-icon>
            <p class="info-text">
              New users can register as Fleet Owner, Staff, Driver, Service Provider, Taxi Rank Admin, or Taxi Marshal.
              Driver registration requires license documentation for approval.
            </p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .login-container {
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #FFFFFF 0%, #f5f5f5 50%, #e8e8e8 100%);
      padding: 1rem;
      position: relative;
      overflow: hidden;
    }

    .login-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle at 70% 50%, rgba(212, 175, 55, 0.15) 0%, transparent 50%),
                  radial-gradient(circle at 30% 80%, rgba(0, 0, 0, 0.05) 0%, transparent 40%);
    }

    .login-card {
      width: 100%;
      max-width: 450px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
      border-radius: 16px;
      border: 3px solid #D4AF37;
      position: relative;
      z-index: 1;
      background: #FFFFFF;
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

    mat-card-header {
      display: block;
      margin-bottom: 1.5rem;
    }

    mat-card-subtitle {
      color: #495057;
      font-size: 0.95rem;
      margin-top: 0.5rem;
    }

    .full-width {
      width: 100%;
      margin-bottom: 1rem;
    }

    .login-button {
      margin-top: 1rem;
      height: 48px;
      font-size: 16px;
      font-weight: 500;
    }

    .login-button mat-icon {
      margin-right: 0.5rem;
    }

    .button-spinner {
      margin: 0 auto;
    }

    .divider {
      margin: 2rem 0;
    }

    .signup-section {
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .signup-text {
      color: #6c757d;
      margin-bottom: 1rem;
      font-size: 0.95rem;
    }

    .button-group {
      display: flex;
      gap: 0.75rem;
      flex-direction: column;
    }

    .signup-button,
    .driver-button,
    .service-provider-button,
    .taxi-rank-button {
      width: 100%;
      height: 48px;
      font-size: 15px;
      font-weight: 500;
    }

    .signup-button mat-icon,
    .driver-button mat-icon,
    .service-provider-button mat-icon,
    .taxi-rank-button mat-icon {
      margin-right: 0.5rem;
    }

    .driver-button {
      background: linear-gradient(135deg, #D4AF37 0%, #C5A028 100%) !important;
      color: #000000 !important;
    }

    .driver-button:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
    }

    .service-provider-button {
      background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%) !important;
      color: #FFFFFF !important;
    }

    .service-provider-button:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(33, 150, 243, 0.3);
    }

    .taxi-rank-button {
      background: linear-gradient(135deg, #FF6F00 0%, #E65100 100%) !important;
      color: #FFFFFF !important;
    }

    .taxi-rank-button:hover:not(:disabled) {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(255, 111, 0, 0.3);
    }

    .info-section {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 1rem;
      background-color: rgba(212, 175, 55, 0.1);
      border-radius: 8px;
      border-left: 4px solid #D4AF37;
      margin-top: 1.5rem;
    }

    .info-icon {
      color: #D4AF37;
      margin-top: 2px;
    }

    .info-text {
      color: #495057;
      font-size: 0.875rem;
      margin: 0;
      line-height: 1.5;
    }

    @media (max-width: 600px) {
      .login-container {
        padding: 0.5rem;
      }

      .login-card {
        box-shadow: none;
      }
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  hidePassword = true;
  loading = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  async onSubmit(event?: Event): Promise<void> {
    if (event) {
      event.preventDefault();
    }
    
    if (this.loginForm.invalid) {
      return;
    }

    this.loading = true;

    try {
      const response = await firstValueFrom(
        this.authService.login({
          email: this.loginForm.value.email,
          password: this.loginForm.value.password
        })
      );

      console.log('Login response:', response);
      console.log('User role:', response.role);
      console.log('Role type:', typeof response.role);
      console.log('Role comparison check:');
      console.log('  - Is Owner?', response.role === 'Owner');
      console.log('  - Is Driver?', response.role === 'Driver');
      console.log('  - Is ServiceProvider?', response.role === 'ServiceProvider');

      // Show success message
      this.snackBar.open('Login successful!', 'Close', {
        duration: 2000,
        panelClass: ['success-snackbar']
      });

      // Navigate based on role
      let navigationPromise;
      if (response.role === 'Owner') {
        console.log('Redirecting to owner dashboard');
        navigationPromise = this.router.navigate(['/owner-dashboard/analytics']);
      } else if (response.role === 'Driver') {
        console.log('Redirecting to driver dashboard');
        navigationPromise = this.router.navigate(['/driver-dashboard']);
      } else if (response.role === 'ServiceProvider') {
        console.log('Redirecting to service provider dashboard');
        navigationPromise = this.router.navigate(['/service-provider-dashboard']);
      } else if (response.role === 'TaxiRankAdmin') {
        console.log('Redirecting to admin dashboard');
        navigationPromise = this.router.navigate(['/admin/routes']);
      } else if (response.role === 'TaxiMarshal') {
        console.log('Redirecting to marshal dashboard');
        navigationPromise = this.router.navigate(['/marshal-dashboard']);
      } else {
        console.log('Redirecting to default dashboard, role was:', response.role);
        navigationPromise = this.router.navigate(['/dashboard']);
      }

      // Wait for navigation to complete
      const navResult = await navigationPromise;
      console.log('Navigation result:', navResult);

    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed. Please check your credentials.';
      
      // Check for specific error messages from the backend
      const backendMessage = error.error?.message || '';
      
      if (backendMessage.toLowerCase().includes('inactive')) {
        errorMessage = '⏳ Your account is pending approval. An administrator will activate your account soon. Please check back later.';
      } else if (error.status === 401) {
        if (backendMessage.toLowerCase().includes('invalid')) {
          errorMessage = 'Invalid email or password. Please check your credentials and try again.';
        } else {
          errorMessage = 'Invalid email or password. If you don\'t have an account, please create a profile.';
        }
      } else if (error.status === 404) {
        errorMessage = 'Login service not found. Please ensure the backend server is running.';
      } else if (error.status === 500) {
        errorMessage = error.error?.message || 'Server error. Please try again later.';
      } else if (error.status === 0) {
        errorMessage = 'Cannot connect to server. Please ensure the backend is running on http://localhost:5000';
      } else if (error.error?.message) {
        errorMessage = error.error.message;
      }

      this.snackBar.open(errorMessage, 'Close', {
        duration: 10000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.loading = false;
    }
  }
}
