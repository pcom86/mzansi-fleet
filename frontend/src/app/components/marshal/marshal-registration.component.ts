import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatStepperModule } from '@angular/material/stepper';

@Component({
  selector: 'app-marshal-registration',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatIconModule,
    MatStepperModule
  ],
  template: `
    <div class="registration-container">
      <mat-card class="registration-card">
        <mat-card-header>
          <mat-icon class="header-icon">badge</mat-icon>
          <mat-card-title>Taxi Marshal Registration</mat-card-title>
          <mat-card-subtitle>Register as a taxi rank marshal</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <mat-stepper #stepper linear>
            <!-- Step 1: Personal Information -->
            <mat-step label="Personal Information">
              <div class="step-content">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Full Name</mat-label>
                  <input matInput [(ngModel)]="registration.fullName" required>
                  <mat-icon matPrefix>person</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>ID Number</mat-label>
                  <input matInput [(ngModel)]="registration.idNumber" required>
                  <mat-icon matPrefix>credit_card</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Phone Number</mat-label>
                  <input matInput [(ngModel)]="registration.phoneNumber" required>
                  <mat-icon matPrefix>phone</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Email Address</mat-label>
                  <input matInput type="email" [(ngModel)]="registration.email" required>
                  <mat-icon matPrefix>email</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Address</mat-label>
                  <textarea matInput [(ngModel)]="registration.address" rows="3"></textarea>
                  <mat-icon matPrefix>home</mat-icon>
                </mat-form-field>

                <div class="step-actions">
                  <button mat-raised-button color="primary" matStepperNext>Next</button>
                </div>
              </div>
            </mat-step>

            <!-- Step 2: Work Information -->
            <mat-step label="Work Information">
              <div class="step-content">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Marshal Code</mat-label>
                  <input matInput [(ngModel)]="registration.marshalCode" required>
                  <mat-icon matPrefix>qr_code</mat-icon>
                  <mat-hint>Unique identifier for the marshal</mat-hint>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Taxi Rank Location</mat-label>
                  <input matInput [(ngModel)]="registration.taxiRankLocation" required>
                  <mat-icon matPrefix>location_on</mat-icon>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Fleet/Tenant Code</mat-label>
                  <input matInput [(ngModel)]="tenantCode" required>
                  <mat-icon matPrefix>business</mat-icon>
                  <mat-hint>Provided by your fleet manager</mat-hint>
                </mat-form-field>

                <div class="step-actions">
                  <button mat-button matStepperPrevious>Back</button>
                  <button mat-raised-button color="primary" matStepperNext>Next</button>
                </div>
              </div>
            </mat-step>

            <!-- Step 3: Account Setup -->
            <mat-step label="Account Setup">
              <div class="step-content">
                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Password</mat-label>
                  <input matInput [type]="hidePassword ? 'password' : 'text'" 
                         [(ngModel)]="registration.password" required>
                  <mat-icon matPrefix>lock</mat-icon>
                  <button mat-icon-button matSuffix (click)="hidePassword = !hidePassword" type="button">
                    <mat-icon>{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                  </button>
                </mat-form-field>

                <mat-form-field appearance="outline" class="full-width">
                  <mat-label>Confirm Password</mat-label>
                  <input matInput [type]="hideConfirmPassword ? 'password' : 'text'" 
                         [(ngModel)]="confirmPassword" required>
                  <mat-icon matPrefix>lock</mat-icon>
                  <button mat-icon-button matSuffix (click)="hideConfirmPassword = !hideConfirmPassword" type="button">
                    <mat-icon>{{hideConfirmPassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                  </button>
                </mat-form-field>

                <div class="password-hint" *ngIf="registration.password && confirmPassword && registration.password !== confirmPassword">
                  <mat-icon color="warn">warning</mat-icon>
                  <span>Passwords do not match</span>
                </div>

                <div class="step-actions">
                  <button mat-button matStepperPrevious>Back</button>
                  <button mat-raised-button color="primary" 
                          [disabled]="submitting || !isFormValid()" 
                          (click)="submitRegistration()">
                    <mat-icon *ngIf="!submitting">how_to_reg</mat-icon>
                    <span *ngIf="!submitting">Register</span>
                    <span *ngIf="submitting">Registering...</span>
                  </button>
                </div>
              </div>
            </mat-step>
          </mat-stepper>
        </mat-card-content>
      </mat-card>

      <div class="login-link">
        <p>Already have an account? <a (click)="goToLogin()">Login here</a></p>
      </div>
    </div>
  `,
  styles: [`
    .registration-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }

    .registration-card {
      width: 100%;
      max-width: 600px;
      margin: 20px;
    }

    mat-card-header {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 20px 0;
    }

    .header-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #667eea;
      margin-bottom: 10px;
    }

    mat-card-title {
      text-align: center;
      font-size: 24px;
      margin-bottom: 8px;
    }

    mat-card-subtitle {
      text-align: center;
    }

    .step-content {
      padding: 20px 0;
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    .step-actions {
      display: flex;
      justify-content: space-between;
      margin-top: 20px;
    }

    .password-hint {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f44336;
      margin-bottom: 16px;
    }

    .password-hint mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .login-link {
      margin-top: 20px;
      text-align: center;
      color: white;
    }

    .login-link a {
      color: white;
      text-decoration: underline;
      cursor: pointer;
      font-weight: bold;
    }

    .login-link a:hover {
      color: #ffd700;
    }
  `]
})
export class MarshalRegistrationComponent {
  registration = {
    fullName: '',
    idNumber: '',
    phoneNumber: '',
    email: '',
    address: '',
    marshalCode: '',
    taxiRankLocation: '',
    password: ''
  };

  tenantCode = '';
  confirmPassword = '';
  hidePassword = true;
  hideConfirmPassword = true;
  submitting = false;

  private apiUrl = 'http://localhost:5000/api';

  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar
  ) {}

  isFormValid(): boolean {
    return this.registration.fullName.trim() !== '' &&
           this.registration.idNumber.trim() !== '' &&
           this.registration.phoneNumber.trim() !== '' &&
           this.registration.email.trim() !== '' &&
           this.registration.marshalCode.trim() !== '' &&
           this.registration.taxiRankLocation.trim() !== '' &&
           this.tenantCode.trim() !== '' &&
           this.registration.password.length >= 6 &&
           this.registration.password === this.confirmPassword;
  }

  async submitRegistration() {
    if (!this.isFormValid()) {
      this.snackBar.open('Please fill in all required fields correctly', 'Close', { duration: 3000 });
      return;
    }

    this.submitting = true;

    try {
      // First, get tenant ID from tenant code
      const tenants: any = await this.http.get(`${this.apiUrl}/Tenants`).toPromise();
      const tenant = tenants.find((t: any) => t.code === this.tenantCode);

      if (!tenant) {
        this.snackBar.open('Invalid fleet/tenant code', 'Close', { duration: 3000 });
        this.submitting = false;
        return;
      }

      const payload = {
        tenantId: tenant.id,
        ...this.registration
      };

      const response: any = await this.http.post(`${this.apiUrl}/TaxiMarshals/register`, payload).toPromise();

      if (response.success) {
        this.snackBar.open('Registration successful! You can now login.', 'Close', { duration: 5000 });
        setTimeout(() => this.router.navigate(['/login']), 2000);
      }
    } catch (error: any) {
      console.error('Registration error:', error);
      this.snackBar.open(
        error.error?.message || 'Registration failed. Please try again.',
        'Close',
        { duration: 5000 }
      );
    } finally {
      this.submitting = false;
    }
  }

  goToLogin() {
    this.router.navigate(['/login']);
  }
}
