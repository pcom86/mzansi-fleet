import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatStepperModule } from '@angular/material/stepper';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { Router } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { IdentityService } from '../../services';
import { User } from '../../models';

@Component({
  selector: 'app-create-owner-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCardModule,
    MatStepperModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatRadioModule
  ],
  template: `
    <div class="create-owner-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>business</mat-icon>
            Create Owner Profile
          </mat-card-title>
          <mat-card-subtitle>Complete all steps to create your owner account</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <mat-stepper [linear]="true" #stepper>
            <!-- Step 1: Tenant Information -->
            <mat-step [stepControl]="tenantForm">
              <form [formGroup]="tenantForm">
                <ng-template matStepLabel>Company Information</ng-template>
                
                <div class="step-content">
                  <h3>Tell us about your company</h3>
                  
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Company Name</mat-label>
                    <input matInput formControlName="companyName" placeholder="ABC Transport Ltd" required>
                    <mat-icon matPrefix>business</mat-icon>
                    <mat-error *ngIf="tenantForm.get('companyName')?.hasError('required')">
                      Company name is required
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Contact Email</mat-label>
                    <input matInput formControlName="contactEmail" type="email" placeholder="info@abctransport.com" required>
                    <mat-icon matPrefix>email</mat-icon>
                    <mat-error *ngIf="tenantForm.get('contactEmail')?.hasError('required')">
                      Email is required
                    </mat-error>
                    <mat-error *ngIf="tenantForm.get('contactEmail')?.hasError('email')">
                      Please enter a valid email
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Contact Phone</mat-label>
                    <input matInput formControlName="contactPhone" type="tel" placeholder="+27111234567" required>
                    <mat-icon matPrefix>phone</mat-icon>
                    <mat-error *ngIf="tenantForm.get('contactPhone')?.hasError('required')">
                      Phone number is required
                    </mat-error>
                  </mat-form-field>

                  <div class="button-row">
                    <button mat-raised-button color="primary" matStepperNext [disabled]="!tenantForm.valid">
                      Next
                      <mat-icon>arrow_forward</mat-icon>
                    </button>
                  </div>
                </div>
              </form>
            </mat-step>

            <!-- Step 2: User Account -->
            <mat-step [stepControl]="userForm">
              <form [formGroup]="userForm">
                <ng-template matStepLabel>User Account</ng-template>
                
                <div class="step-content">
                  <h3>Select or create user account</h3>
                  
                  <mat-radio-group formControlName="userOption" class="radio-group">
                    <mat-radio-button value="existing">Select Existing User</mat-radio-button>
                    <mat-radio-button value="new">Create New User</mat-radio-button>
                  </mat-radio-group>

                  <div *ngIf="userForm.get('userOption')?.value === 'existing'" class="user-selection">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Select User</mat-label>
                      <mat-select formControlName="existingUserId" required>
                        <mat-option *ngFor="let user of existingUsers" [value]="user.id">
                          {{ user.email }} {{ user.role ? '(' + user.role + ')' : '' }}
                        </mat-option>
                      </mat-select>
                      <mat-icon matPrefix>person</mat-icon>
                      <mat-hint *ngIf="existingUsers.length === 0">Loading users...</mat-hint>
                      <mat-hint *ngIf="existingUsers.length > 0">{{ existingUsers.length }} user(s) available</mat-hint>
                      <mat-error *ngIf="userForm.get('existingUserId')?.hasError('required')">
                        Please select a user
                      </mat-error>
                    </mat-form-field>
                  </div>

                  <div *ngIf="userForm.get('userOption')?.value === 'new'" class="user-creation">
                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Email</mat-label>
                      <input matInput formControlName="email" type="email" placeholder="owner@abctransport.com" required>
                      <mat-icon matPrefix>account_circle</mat-icon>
                      <mat-error *ngIf="userForm.get('email')?.hasError('required')">
                        Email is required
                      </mat-error>
                      <mat-error *ngIf="userForm.get('email')?.hasError('email')">
                        Please enter a valid email
                      </mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Phone</mat-label>
                      <input matInput formControlName="phone" type="tel" placeholder="+27821234567" required>
                      <mat-icon matPrefix>phone</mat-icon>
                      <mat-error *ngIf="userForm.get('phone')?.hasError('required')">
                        Phone number is required
                      </mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Password</mat-label>
                      <input matInput formControlName="password" [type]="hidePassword ? 'password' : 'text'" required>
                      <mat-icon matPrefix>lock</mat-icon>
                      <button mat-icon-button matSuffix (click)="hidePassword = !hidePassword" type="button">
                        <mat-icon>{{hidePassword ? 'visibility_off' : 'visibility'}}</mat-icon>
                      </button>
                      <mat-error *ngIf="userForm.get('password')?.hasError('required')">
                        Password is required
                      </mat-error>
                      <mat-error *ngIf="userForm.get('password')?.hasError('minlength')">
                        Password must be at least 6 characters
                      </mat-error>
                    </mat-form-field>

                    <mat-form-field appearance="outline" class="full-width">
                      <mat-label>Confirm Password</mat-label>
                      <input matInput formControlName="confirmPassword" [type]="hidePassword ? 'password' : 'text'" required>
                      <mat-icon matPrefix>lock</mat-icon>
                      <mat-error *ngIf="userForm.get('confirmPassword')?.hasError('required')">
                        Please confirm your password
                      </mat-error>
                      <mat-error *ngIf="userForm.hasError('passwordMismatch')">
                        Passwords do not match
                      </mat-error>
                    </mat-form-field>
                  </div>

                  <div class="button-row">
                    <button mat-button matStepperPrevious>
                      <mat-icon>arrow_back</mat-icon>
                      Back
                    </button>
                    <button mat-raised-button color="primary" matStepperNext [disabled]="!userForm.valid">
                      Next
                      <mat-icon>arrow_forward</mat-icon>
                    </button>
                  </div>
                </div>
              </form>
            </mat-step>

            <!-- Step 3: Owner Profile Details -->
            <mat-step [stepControl]="ownerProfileForm">
              <form [formGroup]="ownerProfileForm">
                <ng-template matStepLabel>Owner Profile</ng-template>
                
                <div class="step-content">
                  <h3>Complete your owner profile</h3>
                  
                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Contact Name</mat-label>
                    <input matInput formControlName="contactName" placeholder="John Doe" required>
                    <mat-icon matPrefix>person</mat-icon>
                    <mat-error *ngIf="ownerProfileForm.get('contactName')?.hasError('required')">
                      Contact name is required
                    </mat-error>
                  </mat-form-field>

                  <mat-form-field appearance="outline" class="full-width">
                    <mat-label>Company Address</mat-label>
                    <textarea matInput formControlName="address" rows="3" placeholder="123 Main St, Johannesburg, 2000" required></textarea>
                    <mat-icon matPrefix>location_on</mat-icon>
                    <mat-error *ngIf="ownerProfileForm.get('address')?.hasError('required')">
                      Address is required
                    </mat-error>
                  </mat-form-field>

                  <div class="button-row">
                    <button mat-button matStepperPrevious>
                      <mat-icon>arrow_back</mat-icon>
                      Back
                    </button>
                    <button mat-raised-button color="primary" matStepperNext [disabled]="!ownerProfileForm.valid">
                      Review
                      <mat-icon>arrow_forward</mat-icon>
                    </button>
                  </div>
                </div>
              </form>
            </mat-step>

            <!-- Step 4: Review & Submit -->
            <mat-step>
              <ng-template matStepLabel>Review & Submit</ng-template>
              
              <div class="step-content">
                <h3>Review your information</h3>
                
                <div class="review-section">
                  <h4><mat-icon>business</mat-icon> Company Information</h4>
                  <div class="review-item">
                    <strong>Company Name:</strong> {{ tenantForm.get('companyName')?.value }}
                  </div>
                  <div class="review-item">
                    <strong>Contact Email:</strong> {{ tenantForm.get('contactEmail')?.value }}
                  </div>
                  <div class="review-item">
                    <strong>Contact Phone:</strong> {{ tenantForm.get('contactPhone')?.value }}
                  </div>
                </div>

                <div class="review-section">
                  <h4><mat-icon>account_circle</mat-icon> User Account</h4>
                  <div *ngIf="userForm.get('userOption')?.value === 'existing'">
                    <div class="review-item">
                      <strong>User Type:</strong> Existing User Selected
                    </div>
                    <div class="review-item" *ngIf="getSelectedUserEmail()">
                      <strong>Email:</strong> {{ getSelectedUserEmail() }}
                    </div>
                  </div>
                  <div *ngIf="userForm.get('userOption')?.value === 'new'">
                    <div class="review-item">
                      <strong>User Type:</strong> New User
                    </div>
                    <div class="review-item">
                      <strong>Email:</strong> {{ userForm.get('email')?.value }}
                    </div>
                    <div class="review-item">
                      <strong>Phone:</strong> {{ userForm.get('phone')?.value }}
                    </div>
                  </div>
                </div>

                <div class="review-section">
                  <h4><mat-icon>person</mat-icon> Owner Profile</h4>
                  <div class="review-item">
                    <strong>Contact Name:</strong> {{ ownerProfileForm.get('contactName')?.value }}
                  </div>
                  <div class="review-item">
                    <strong>Address:</strong> {{ ownerProfileForm.get('address')?.value }}
                  </div>
                </div>

                <div class="button-row" *ngIf="!loading">
                  <button mat-button matStepperPrevious>
                    <mat-icon>arrow_back</mat-icon>
                    Back
                  </button>
                  <button mat-raised-button color="primary" (click)="submitForm()">
                    <mat-icon>check_circle</mat-icon>
                    Create Owner Profile
                  </button>
                </div>

                <div class="loading-container" *ngIf="loading">
                  <mat-spinner diameter="50"></mat-spinner>
                  <p>Creating your owner profile...</p>
                </div>
              </div>
            </mat-step>
          </mat-stepper>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .create-owner-container {
      max-width: 900px;
      margin: 2rem auto;
      padding: 1rem;
      min-height: 100vh;
    }

    mat-card {
      margin-bottom: 2rem;
      border-radius: 16px;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.1);
      background: #FFFFFF;
      border: 2px solid rgba(212, 175, 55, 0.3);
    }

    mat-card-header {
      margin-bottom: 2rem;
      padding: 1.5rem;
      background: linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #2d2d2d 100%);
      color: #D4AF37;
      border-radius: 16px 16px 0 0;
      border-bottom: 3px solid #D4AF37;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.75rem;
      font-weight: 600;
      color: #D4AF37;
    }

    mat-card-title mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    mat-card-subtitle {
      color: rgba(212, 175, 55, 0.9);
      font-size: 1rem;
      margin-top: 0.5rem;
    }

    .step-content {
      padding: 2rem 1rem;
    }

    .step-content h3 {
      margin: 0 0 1.5rem 0;
      color: #000000;
      font-size: 1.5rem;
      font-weight: 600;
    }

    .full-width {
      width: 100%;
      margin-bottom: 1rem;
    }

    .radio-group {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin: 1.5rem 0;
      padding: 1rem;
      background: rgba(212, 175, 55, 0.05);
      border-radius: 8px;
      border: 1px solid rgba(212, 175, 55, 0.2);
    }

    .user-selection, .user-creation {
      margin-top: 1rem;
      animation: fadeIn 0.3s ease-in;
    }

    @keyframes fadeIn {
      from {
        opacity: 0;
        transform: translateY(10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .button-row {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      align-items: center;
      margin-top: 2rem;
      padding-top: 1rem;
      border-top: 1px solid rgba(212, 175, 55, 0.2);
    }

    .button-row button {
      min-width: 140px;
      height: 48px;
      border-radius: 8px;
      font-weight: 500;
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .button-row button mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .review-section {
      background: #FFFFFF;
      padding: 1.5rem;
      border-radius: 12px;
      margin-bottom: 1.5rem;
      border: 2px solid #D4AF37;
      box-shadow: 0 2px 8px rgba(212, 175, 55, 0.1);
    }

    .review-section h4 {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      margin: 0 0 1rem 0;
      color: #000000;
      font-weight: 600;
      font-size: 1.1rem;
    }

    .review-item {
      margin-bottom: 0.75rem;
      padding: 0.5rem 0;
    }

    .review-item strong {
      display: inline-block;
      width: 150px;
      color: #000000;
      font-weight: 600;
    }

    .review-item span {
      color: #495057;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      padding: 3rem 2rem;
      text-align: center;
    }

    .loading-container mat-spinner {
      margin-bottom: 1rem;
    }

    mat-icon {
      vertical-align: middle;
    }

    ::ng-deep .mat-stepper-horizontal {
      margin-top: 1rem;
      background: transparent;
    }

    ::ng-deep .mat-step-header .mat-step-icon {
      margin-right: 0.5rem;
    }

    ::ng-deep .mat-step-label {
      font-weight: 500;
    }

    @media (max-width: 768px) {
      .create-owner-container {
        margin: 1rem auto;
        padding: 0.5rem;
      }

      mat-card-header {
        padding: 1rem;
      }

      mat-card-title {
        font-size: 1.4rem;
      }

      .step-content {
        padding: 1rem 0.5rem;
      }

      .button-row {
        flex-direction: column;
      }

      .button-row button {
        width: 100%;
      }
    }
  `]
})
export class CreateOwnerProfileComponent implements OnInit {
  tenantForm: FormGroup;
  userForm: FormGroup;
  ownerProfileForm: FormGroup;
  hidePassword = true;
  loading = false;
  existingUsers: User[] = [];

  constructor(
    private fb: FormBuilder,
    private identityService: IdentityService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {
    this.tenantForm = this.fb.group({
      companyName: ['', Validators.required],
      contactEmail: ['', [Validators.required, Validators.email]],
      contactPhone: ['', Validators.required]
    });

    this.userForm = this.fb.group({
      userOption: ['new', Validators.required],
      existingUserId: [null],
      email: ['', [Validators.required, Validators.email]],
      phone: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    this.ownerProfileForm = this.fb.group({
      contactName: ['', Validators.required],
      address: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    // Load existing users
    this.loadExistingUsers();

    // Handle user option changes
    this.userForm.get('userOption')?.valueChanges.subscribe(option => {
      this.updateUserFormValidators(option);
    });

    // Track existingUserId selection changes
    this.userForm.get('existingUserId')?.valueChanges.subscribe(value => {
      console.log('Selected user ID changed to:', value, 'Type:', typeof value);
    });

    // Auto-fill contact email from tenant form to user form
    this.tenantForm.get('contactEmail')?.valueChanges.subscribe(value => {
      if (!this.userForm.get('email')?.value) {
        this.userForm.patchValue({ email: value });
      }
    });

    // Auto-fill contact phone from tenant form to user form
    this.tenantForm.get('contactPhone')?.valueChanges.subscribe(value => {
      if (!this.userForm.get('phone')?.value) {
        this.userForm.patchValue({ phone: value });
      }
    });
  }

  loadExistingUsers(): void {
    this.identityService.getAllUsers().subscribe({
      next: (users) => {
        this.existingUsers = users;
        console.log('Loaded existing users:', users.length, users.map(u => ({ id: u.id, email: u.email })));
      },
      error: (err) => {
        console.error('Failed to load users:', err);
        this.snackBar.open('Failed to load existing users', 'Close', { duration: 3000 });
      }
    });
  }

  updateUserFormValidators(option: string): void {
    const existingUserIdControl = this.userForm.get('existingUserId');
    const emailControl = this.userForm.get('email');
    const phoneControl = this.userForm.get('phone');
    const passwordControl = this.userForm.get('password');
    const confirmPasswordControl = this.userForm.get('confirmPassword');

    if (option === 'existing') {
      existingUserIdControl?.setValidators([Validators.required]);
      emailControl?.clearValidators();
      phoneControl?.clearValidators();
      passwordControl?.clearValidators();
      confirmPasswordControl?.clearValidators();
      
      // Clear values for new user fields
      emailControl?.setValue('');
      phoneControl?.setValue('');
      passwordControl?.setValue('');
      confirmPasswordControl?.setValue('');
    } else {
      existingUserIdControl?.clearValidators();
      emailControl?.setValidators([Validators.required, Validators.email]);
      phoneControl?.setValidators([Validators.required]);
      passwordControl?.setValidators([Validators.required, Validators.minLength(6)]);
      confirmPasswordControl?.setValidators([Validators.required]);
      
      // Clear existing user selection
      existingUserIdControl?.setValue(null);
    }

    existingUserIdControl?.updateValueAndValidity();
    emailControl?.updateValueAndValidity();
    phoneControl?.updateValueAndValidity();
    passwordControl?.updateValueAndValidity();
    confirmPasswordControl?.updateValueAndValidity();
  }

  passwordMatchValidator(form: FormGroup) {
    const password = form.get('password');
    const confirmPassword = form.get('confirmPassword');
    
    if (password && confirmPassword && password.value !== confirmPassword.value) {
      return { passwordMismatch: true };
    }
    return null;
  }

  async submitForm(): Promise<void> {
    // Additional validation for existing user selection
    if (this.userForm.value.userOption === 'existing') {
      const selectedUserId = this.userForm.value.existingUserId;
      if (!selectedUserId || selectedUserId === null || selectedUserId === '') {
        this.snackBar.open('Please select a user from the dropdown', 'Close', { duration: 5000 });
        return;
      }
    }

    if (this.tenantForm.invalid || this.userForm.invalid || this.ownerProfileForm.invalid) {
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;

    try {
      // Step 1: Create Tenant
      const tenant = await firstValueFrom(
        this.identityService.createTenant({
          name: this.tenantForm.value.companyName,
          contactEmail: this.tenantForm.value.contactEmail,
          contactPhone: this.tenantForm.value.contactPhone
        })
      );
      
      if (!tenant || !tenant.id) {
        throw new Error('Failed to create tenant');
      }

      // Validate tenant ID is a valid GUID
      console.log('Created tenant with ID:', tenant.id, 'Type:', typeof tenant.id);
      if (!this.isValidGuid(tenant.id)) {
        throw new Error('Created tenant has invalid ID format: ' + tenant.id);
      }

      // Step 2: Get or Create User
      let userId: string;
      const userOption = this.userForm.value.userOption;

      if (userOption === 'existing') {
        // Use existing user
        const selectedUserId = this.userForm.value.existingUserId;
        console.log('Existing user selected - raw value:', selectedUserId, 'Type:', typeof selectedUserId);
        
        if (!selectedUserId || selectedUserId === '' || selectedUserId === 'null' || selectedUserId === null || selectedUserId === undefined) {
          throw new Error('Please select a user from the dropdown. Current value: ' + selectedUserId);
        }
        // Validate GUID format
        if (!this.isValidGuid(selectedUserId)) {
          throw new Error('Invalid user ID format. Please select a valid user. Value: ' + selectedUserId);
        }
        userId = selectedUserId;
        console.log('Using existing userId:', userId);
      } else {
        // Create new user with password hash
        const passwordHash = await this.hashPassword(this.userForm.value.password);
        
        // Ensure tenantId is a string
        const tenantIdString = String(tenant.id);
        console.log('Creating user with tenantId:', tenantIdString, 'Type:', typeof tenantIdString);
        
        const userPayload = {
          tenantId: tenantIdString,
          email: this.userForm.value.email,
          phone: this.userForm.value.phone,
          passwordHash: passwordHash,
          role: 'Owner',
          isActive: true
        };
        
        console.log('User payload:', JSON.stringify(userPayload, null, 2));
        
        const user = await firstValueFrom(
          this.identityService.createUser(userPayload)
        );
        
        if (!user || !user.id) {
          throw new Error('Failed to create user');
        }
        // Validate the newly created user ID
        if (!this.isValidGuid(user.id)) {
          throw new Error('Created user has invalid ID format');
        }
        userId = user.id;
      }

      // Final validation: ensure userId is a valid GUID
      if (!userId || !this.isValidGuid(userId)) {
        throw new Error('Invalid user ID. Please ensure a user is properly selected or created.');
      }

      console.log('Creating owner profile with userId:', userId); // Debug log

      // Prepare the owner profile payload
      const ownerProfilePayload = {
        userId: userId,
        companyName: this.tenantForm.value.companyName,
        contactName: this.ownerProfileForm.value.contactName,
        contactEmail: this.tenantForm.value.contactEmail,
        contactPhone: this.tenantForm.value.contactPhone,
        address: this.ownerProfileForm.value.address
      };

      console.log('Owner profile payload:', JSON.stringify(ownerProfilePayload, null, 2));

      // Step 3: Create Owner Profile
      const ownerProfile = await firstValueFrom(
        this.identityService.createOwnerProfile(ownerProfilePayload)
      );

      if (!ownerProfile || !ownerProfile.id) {
        throw new Error('Failed to create owner profile');
      }

      // Success
      this.snackBar.open('Owner profile created successfully!', 'Close', { 
        duration: 3000,
        panelClass: ['success-snackbar']
      });

      // Redirect to owner dashboard
      setTimeout(() => {
        this.router.navigate(['/owner/dashboard']);
      }, 1500);

    } catch (error: any) {
      console.error('Error creating owner profile:', error);
      console.error('Error type:', typeof error);
      console.error('Error constructor:', error?.constructor?.name);
      
      // Try to log different properties of the error
      if (error) {
        console.error('Error message:', error.message);
        console.error('Error status:', error.status);
        console.error('Error statusText:', error.statusText);
        console.error('Error error:', error.error);
        console.error('Error name:', error.name);
      }
      
      let errorMessage = 'Failed to create owner profile. Please try again.';
      
      if (error.error) {
        console.error('Backend error response:', error.error);
        if (error.error.errors) {
          const errorDetails = Object.entries(error.error.errors)
            .map(([key, value]: [string, any]) => `${key}: ${value}`)
            .join(', ');
          errorMessage = `Validation errors: ${errorDetails}`;
        } else if (error.error.title) {
          errorMessage = error.error.title;
        } else if (typeof error.error === 'string') {
          errorMessage = error.error;
        }
      } else if (error.message) {
        errorMessage = error.message;
      } else if (error.statusText) {
        errorMessage = `${error.status}: ${error.statusText}`;
      }
      
      this.snackBar.open(errorMessage, 'Close', { 
        duration: 10000, 
        panelClass: ['error-snackbar'] 
      });
    } finally {
      this.loading = false;
    }
  }

  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return btoa(String.fromCharCode(...hashArray));
  }

  private isValidGuid(guid: string): boolean {
    const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return guidPattern.test(guid);
  }

  getSelectedUserEmail(): string {
    const selectedUserId = this.userForm.get('existingUserId')?.value;
    if (selectedUserId) {
      const user = this.existingUsers.find(u => u.id === selectedUserId);
      return user?.email || 'N/A';
    }
    return 'N/A';
  }
}
