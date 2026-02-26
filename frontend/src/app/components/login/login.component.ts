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
            <button 
              mat-raised-button 
              color="accent" 
              class="register-button"
              routerLink="/registration"
              [disabled]="loading">
              <mat-icon>how_to_reg</mat-icon>
              Register
            </button>
          </div>

          <div class="info-section">
            <mat-icon class="info-icon">info</mat-icon>
            <p class="info-text">
              Sign in to access your dashboard. New to Mzansi Fleet? Click Register to create an account.
            </p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    /* Container & Background */
    .login-container {
      min-height: 100vh;
      display: flex;
      justify-content: center;
      align-items: center;
      padding: 2rem 1rem;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      position: relative;
      overflow: hidden;
    }

    .login-container::before {
      content: '';
      position: absolute;
      width: 400px;
      height: 400px;
      background: linear-gradient(135deg, rgba(212, 175, 55, 0.08), rgba(244, 208, 63, 0.08));
      border-radius: 50%;
      top: -100px;
      right: -100px;
      animation: float 20s ease-in-out infinite;
    }

    .login-container::after {
      content: '';
      position: absolute;
      width: 300px;
      height: 300px;
      background: linear-gradient(135deg, rgba(33, 150, 243, 0.08), rgba(100, 181, 246, 0.08));
      border-radius: 50%;
      bottom: -80px;
      left: -80px;
      animation: float 15s ease-in-out infinite reverse;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-30px) rotate(10deg); }
    }

    /* Card Styles */
    .login-card {
      width: 100%;
      max-width: 480px;
      position: relative;
      z-index: 1;
      border-radius: 24px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
      overflow: hidden;
      background: white;
      border: none;
    }

    /* Header */
    .header-content {
      width: 100%;
      text-align: center;
      padding: 3rem 2rem 2rem;
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }

    app-mzansi-fleet-logo {
      display: block;
      margin: 0 auto 1.5rem;
    }

    mat-card-header {
      display: block;
      padding: 0;
    }

    mat-card-subtitle {
      color: #6c757d;
      font-size: 1rem;
      margin: 0;
      font-weight: 400;
      line-height: 1.5;
    }

    /* Form Content */
    mat-card-content {
      padding: 2.5rem 2rem !important;
    }

    .full-width {
      width: 100%;
      margin-bottom: 1.25rem;
    }

    /* Login Button */
    .login-button {
      width: 100%;
      margin-top: 1.5rem;
      height: 52px;
      font-size: 1rem;
      font-weight: 600;
      background: linear-gradient(135deg, #D4AF37 0%, #C5A028 100%);
      color: #000000;
      border-radius: 12px;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover:not(:disabled) {
        background: linear-gradient(135deg, #C5A028 0%, #B8941F 100%);
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(212, 175, 55, 0.35);
      }

      &:active {
        transform: translateY(0);
      }

      mat-icon {
        margin-right: 0.5rem;
      }
    }

    .button-spinner {
      margin: 0 auto;
    }

    /* Divider */
    .divider {
      margin: 2rem 0;
      border-top-color: #e9ecef;
    }

    /* Signup Section */
    .signup-section {
      text-align: center;
      margin-bottom: 1.5rem;
    }

    .signup-text {
      color: #6c757d;
      margin-bottom: 1rem;
      font-size: 0.95rem;
      font-weight: 400;
    }

    .register-button {
      width: 100%;
      height: 52px;
      font-size: 1rem;
      font-weight: 600;
      border-radius: 12px;
      border: 2px solid #9C27B0;
      color: #9C27B0;
      background: white;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

      &:hover:not(:disabled) {
        background: linear-gradient(135deg, #9C27B0 0%, #BA68C8 100%);
        color: white;
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(156, 39, 176, 0.3);
      }

      &:active {
        transform: translateY(0);
      }

      mat-icon {
        margin-right: 0.5rem;
      }
    }

    /* Info Section */
    .info-section {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      background: linear-gradient(135deg, #fff8e1 0%, #fffbf0 100%);
      border-radius: 12px;
      border-left: 4px solid #D4AF37;
    }

    .info-icon {
      color: #D4AF37;
      font-size: 24px;
      width: 24px;
      height: 24px;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .info-text {
      color: #6c757d;
      font-size: 0.875rem;
      margin: 0;
      line-height: 1.6;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .login-container {
        padding: 1rem 0.5rem;
      }

      .login-card {
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      }

      .header-content {
        padding: 2rem 1.5rem 1.5rem;
      }

      mat-card-subtitle {
        font-size: 0.9rem;
      }

      mat-card-content {
        padding: 1.5rem 1rem !important;
      }

      .login-button,
      .register-button {
        height: 48px;
      }
    }

    @media (max-width: 480px) {
      .login-container {
        padding: 0.5rem;
      }

      .full-width {
        margin-bottom: 1rem;
      }
    }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  hidePassword = true;
  loading = false;

  private normalizeRole(role: unknown): string {
    return String(role ?? '').trim().toLowerCase();
  }

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

      // Show success message with user's full name
      const displayName = response.fullName || response.email;
      this.snackBar.open(`Welcome back, ${displayName}!`, 'Close', {
        duration: 3000,
        panelClass: ['success-snackbar']
      });

      // Navigate based on role
      const storedRole = this.authService.getCurrentUserInfo()?.role;
      const normalizedRole = this.normalizeRole(response.role || storedRole);
      let targetUrl = '/dashboard';

      if (normalizedRole === 'owner') {
        console.log('Redirecting to owner dashboard');
        targetUrl = '/owner-dashboard';
      } else if (normalizedRole === 'driver') {
        console.log('Redirecting to driver dashboard');
        targetUrl = '/driver-dashboard';
      } else if (normalizedRole === 'serviceprovider' || normalizedRole === 'service-provider') {
        console.log('Redirecting to service provider dashboard');
        targetUrl = '/service-provider-dashboard';
      } else if (normalizedRole === 'admin') {
        console.log('Redirecting to system admin dashboard');
        targetUrl = '/admin/overview';
      } else if (normalizedRole === 'taxirankadmin') {
        console.log('Redirecting to taxi rank admin dashboard');
        targetUrl = '/admin/rank-overview';
      } else if (normalizedRole === 'taximarshal') {
        console.log('Redirecting to marshal dashboard');
        targetUrl = '/marshal-dashboard';
      } else if (normalizedRole === 'customer' || normalizedRole === 'passenger') {
        console.log('Redirecting to user dashboard');
        targetUrl = '/user-dashboard';
      } else {
        console.log('Redirecting to default dashboard, normalized role was:', normalizedRole);
      }

      // Wait for navigation to complete
      const navResult = await this.router.navigateByUrl(targetUrl);
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
