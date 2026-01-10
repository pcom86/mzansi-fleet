import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { MatStepperModule } from '@angular/material/stepper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatRadioModule } from '@angular/material/radio';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface TaxiRank {
  id: string;
  name: string;
  code: string;
  city: string;
  status: string;
}

interface Tenant {
  id: string;
  name: string;
  code: string;
  tenantType: string;
  contactEmail: string;
  contactPhone: string;
}

@Component({
  selector: 'app-taxi-rank-user-registration',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterModule,
    MatStepperModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatRadioModule,
    MatCheckboxModule,
    MatIconModule,
    MatCardModule,
    MatSnackBarModule,
    MatSelectModule,
    MatChipsModule,
    MatDividerModule
  ],
  templateUrl: './taxi-rank-user-registration.component.html',
  styleUrls: ['./taxi-rank-user-registration.component.scss']
})
export class TaxiRankUserRegistrationComponent implements OnInit {
  roleSelectionForm!: FormGroup;
  userDetailsForm!: FormGroup;
  taxiRankForm!: FormGroup;
  roleSpecificForm!: FormGroup;
  
  selectedRole: 'TaxiRankAdmin' | 'TaxiMarshal' | null = null;
  loading = false;
  taxiRanks: TaxiRank[] = [];
  filteredTaxiRanks: TaxiRank[] = [];
  tenants: Tenant[] = [];
  isCreatingNewRank = false;
  isCreatingNewTenant = false;
  newRankForm!: FormGroup;
  newTenantForm!: FormGroup;
  
  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    
    // Defer loading to avoid ExpressionChangedAfterItHasBeenCheckedError
    setTimeout(() => {
      this.loadTaxiRanks();
      this.loadTenants();
    });
  }

  initializeForms(): void {
    // Step 1: Role Selection
    this.roleSelectionForm = this.fb.group({
      role: ['', Validators.required]
    });

    // Step 2: User Details
    this.userDetailsForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      userCode: [''],  // Auto-generated from name
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });

    // Auto-generate user code from first and last name
    this.userDetailsForm.get('firstName')?.valueChanges.subscribe(() => this.updateUserCode());
    this.userDetailsForm.get('lastName')?.valueChanges.subscribe(() => this.updateUserCode());

    // Step 3: Taxi Rank Selection
    this.taxiRankForm = this.fb.group({
      mode: ['existing', Validators.required],
      taxiRankId: [''],
      tenantId: [''],
      tenantMode: ['existing', Validators.required]
    });

    // New Taxi Rank Form
    this.newRankForm = this.fb.group({
      name: ['', Validators.required],
      code: [''],  // Auto-generated from name
      address: ['', Validators.required],
      city: ['', Validators.required],
      province: ['', Validators.required],
      latitude: [''],
      longitude: [''],
      capacity: [0],
      operatingHours: [''],
      status: ['Active']
    });

    // Auto-generate rank code from name
    this.newRankForm.get('name')?.valueChanges.subscribe(name => {
      if (name) {
        const code = this.generateRankCode(name);
        this.newRankForm.patchValue({ code }, { emitEvent: false });
      }
    });

    // New Tenant Form (Taxi Association)
    this.newTenantForm = this.fb.group({
      name: ['', Validators.required],
      code: [''],  // Auto-generated from name
      tenantType: ['Taxi Association', Validators.required],
      contactEmail: ['', [Validators.required, Validators.email]],
      contactPhone: ['', Validators.required]
    });

    // Auto-generate code from name
    this.newTenantForm.get('name')?.valueChanges.subscribe(name => {
      if (name) {
        const code = this.generateTenantCode(name);
        this.newTenantForm.patchValue({ code }, { emitEvent: false });
      }
    });

    // Watch for mode changes
    this.taxiRankForm.get('mode')?.valueChanges.subscribe(mode => {
      this.isCreatingNewRank = mode === 'new';
      this.updateTaxiRankValidators();
      this.cdr.detectChanges();
    });

    // Watch for tenant mode changes
    this.taxiRankForm.get('tenantMode')?.valueChanges.subscribe(mode => {
      this.isCreatingNewTenant = mode === 'new';
      this.updateTenantValidators();
      this.cdr.detectChanges();
    });

    // Step 4: Role-Specific Details
    this.roleSpecificForm = this.fb.group({
      // Admin fields
      adminCode: [''],  // Auto-generated
      canManageMarshals: [false],
      canManageVehicles: [false],
      canManageSchedules: [false],
      canViewReports: [false],
      
      // Marshal fields
      marshalCode: [''],  // Auto-generated
      shiftStartTime: [''],
      shiftEndTime: [''],
      assignedRoutes: [[]]
    });

    // Auto-generate admin/marshal codes when user details change
    this.userDetailsForm.get('firstName')?.valueChanges.subscribe(() => this.updateRoleCodes());
    this.userDetailsForm.get('lastName')?.valueChanges.subscribe(() => this.updateRoleCodes());
    this.roleSelectionForm.get('role')?.valueChanges.subscribe(() => this.updateRoleCodes());

    // Watch for role changes
    this.roleSelectionForm.get('role')?.valueChanges.subscribe(role => {
      this.selectedRole = role;
      this.updateRoleSpecificValidators();
    });
  }

  passwordMatchValidator(group: FormGroup): { [key: string]: boolean } | null {
    const password = group.get('password')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return password === confirmPassword ? null : { passwordMismatch: true };
  }

  updateRoleSpecificValidators(): void {
    // Codes are auto-generated, no validation needed
    const adminCode = this.roleSpecificForm.get('adminCode');
    const marshalCode = this.roleSpecificForm.get('marshalCode');

    adminCode?.clearValidators();
    marshalCode?.clearValidators();

    adminCode?.updateValueAndValidity();
    marshalCode?.updateValueAndValidity();
  }

  updateTaxiRankValidators(): void {
    const taxiRankId = this.taxiRankForm.get('taxiRankId');
    
    if (this.isCreatingNewRank) {
      taxiRankId?.clearValidators();
    } else {
      taxiRankId?.setValidators([Validators.required]);
    }
    
    taxiRankId?.updateValueAndValidity();
  }

  updateTenantValidators(): void {
    const tenantId = this.taxiRankForm.get('tenantId');
    
    if (this.isCreatingNewTenant) {
      tenantId?.clearValidators();
    } else {
      tenantId?.setValidators([Validators.required]);
    }
    
    tenantId?.updateValueAndValidity();
  }

  loadTenants(): void {
    this.http.get<Tenant[]>(`${environment.apiUrl}/Tenants`)
      .subscribe({
        next: (tenants) => {
          // Only show Taxi Associations, not Fleet Owners or Transport Companies
          this.tenants = tenants.filter(t => t.tenantType === 'Taxi Association');
        },
        error: (error) => {
          console.error('Error loading tenants:', error);
          this.snackBar.open('Failed to load taxi associations', 'Close', { duration: 3000 });
        }
      });
  }

  loadTaxiRanks(): void {
    this.http.get<TaxiRank[]>(`${environment.apiUrl}/TaxiRanks`)
      .subscribe({
        next: (ranks) => {
          this.taxiRanks = ranks.filter(r => r.status === 'Active');
          // Don't filter yet - will be filtered when tenant is selected
        },
        error: (error) => {
          console.error('Error loading taxi ranks:', error);
          this.snackBar.open('Failed to load taxi ranks', 'Close', { duration: 3000 });
        }
      });
  }

  getRoleDescription(role: string): string {
    if (role === 'TaxiRankAdmin') {
      return 'Manage taxi rank operations, marshals, vehicles, and schedules. Full administrative control.';
    } else if (role === 'TaxiMarshal') {
      return 'Coordinate taxi departures, manage queues, assist drivers and passengers on the ground.';
    }
    return '';
  }

  async onSubmit(): Promise<void> {
    if (!this.isFormValid()) {
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;

    // Create new tenant (taxi association) if needed
    let tenantId = this.taxiRankForm.value.tenantId;

    if (this.isCreatingNewTenant) {
      try {
        const newTenant = await this.createNewTenant();
        tenantId = newTenant.id;
      } catch (error) {
        this.loading = false;
        console.error('Error creating tenant:', error);
        return;
      }
    }

    // Create new taxi rank if needed
    let taxiRankId = this.taxiRankForm.value.taxiRankId;

    if (this.isCreatingNewRank) {
      try {
        const newRank = await this.createNewTaxiRank(tenantId);
        taxiRankId = newRank.id;
      } catch (error) {
        this.loading = false;
        this.snackBar.open('Failed to create taxi rank. Please try again.', 'Close', { duration: 5000 });
        console.error('Error creating taxi rank:', error);
        return;
      }
    }

    const registrationData = {
      firstName: this.userDetailsForm.value.firstName,
      lastName: this.userDetailsForm.value.lastName,
      userCode: this.userDetailsForm.value.userCode || this.generateUserCode(this.userDetailsForm.value.firstName, this.userDetailsForm.value.lastName),
      email: this.userDetailsForm.value.email,
      phoneNumber: this.userDetailsForm.value.phoneNumber,
      password: this.userDetailsForm.value.password,
      tenantId: tenantId,
      taxiRankId: taxiRankId,
      role: this.selectedRole,
      
      // Admin-specific fields
      ...(this.selectedRole === 'TaxiRankAdmin' && {
        adminCode: this.roleSpecificForm.value.adminCode || this.generateAdminCode(this.userDetailsForm.value.firstName, this.userDetailsForm.value.lastName),
        canManageMarshals: this.roleSpecificForm.value.canManageMarshals,
        canManageVehicles: this.roleSpecificForm.value.canManageVehicles,
        canManageSchedules: this.roleSpecificForm.value.canManageSchedules,
        canViewReports: this.roleSpecificForm.value.canViewReports
      }),
      
      // Marshal-specific fields
      ...(this.selectedRole === 'TaxiMarshal' && {
        marshalCode: this.roleSpecificForm.value.marshalCode || this.generateMarshalCode(this.userDetailsForm.value.firstName, this.userDetailsForm.value.lastName),
        shiftStartTime: this.roleSpecificForm.value.shiftStartTime,
        shiftEndTime: this.roleSpecificForm.value.shiftEndTime
      })
    };

    this.http.post(`${environment.apiUrl}/TaxiRankUsers/register`, registrationData)
      .subscribe({
        next: (response) => {
          this.loading = false;
          this.snackBar.open('Registration successful!', 'Close', { duration: 3000 });
          this.router.navigate(['/login']);
        },
        error: (error) => {
          this.loading = false;
          const errorMessage = error.error?.message || 'Registration failed. Please try again.';
          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
          console.error('Registration error:', error);
        }
      });
  }

  isFormValid(): boolean {
    const tenantValid = this.isCreatingNewTenant 
      ? this.newTenantForm.valid
      : (this.taxiRankForm.get('tenantId')?.valid ?? false);
    
    const rankFormValid = this.isCreatingNewRank 
      ? (this.newRankForm.valid && tenantValid)
      : this.taxiRankForm.valid;
    
    return this.roleSelectionForm.valid &&
           this.userDetailsForm.valid &&
           rankFormValid &&
           this.roleSpecificForm.valid;
  }

  isTaxiRankStepValid(): boolean {
    const tenantValid = this.isCreatingNewTenant 
      ? this.newTenantForm.valid
      : (this.taxiRankForm.get('tenantId')?.valid ?? false);
    
    const rankFormValid = this.isCreatingNewRank 
      ? (this.newRankForm.valid && tenantValid)
      : this.taxiRankForm.valid;
    
    return rankFormValid;
  }

  createNewTenant(): Promise<any> {
    const newTenantData = this.newTenantForm.value;
    
    // Ensure code is generated if somehow missing
    if (!newTenantData.code) {
      newTenantData.code = this.generateTenantCode(newTenantData.name);
    }
    
    // Ensure tenantType is set
    if (!newTenantData.tenantType) {
      newTenantData.tenantType = 'Taxi Association';
    }

    return new Promise((resolve, reject) => {
      this.http.post(`${environment.apiUrl}/Tenants`, newTenantData)
        .subscribe({
          next: (response) => {
            this.snackBar.open('Taxi association created successfully!', 'Close', { duration: 3000 });
            resolve(response);
          },
          error: (error) => {
            console.error('Tenant creation error:', error);
            
            // Check if it's a duplicate code error
            if (error.status === 400 && error.error?.message?.includes('duplicate') || error.error?.message?.includes('IX_Tenants_Code')) {
              // Regenerate code with additional randomness and retry
              newTenantData.code = this.generateTenantCode(newTenantData.name);
              
              this.http.post(`${environment.apiUrl}/Tenants`, newTenantData)
                .subscribe({
                  next: (response) => {
                    this.snackBar.open('Taxi association created successfully!', 'Close', { duration: 3000 });
                    resolve(response);
                  },
                  error: (retryError) => {
                    const errorMessage = retryError.error?.message || retryError.message || 'Failed to create association after retry';
                    this.snackBar.open(`Failed to create taxi association: ${errorMessage}`, 'Close', { duration: 5000 });
                    reject(retryError);
                  }
                });
            } else {
              const errorMessage = error.error?.message || error.message || 'Unknown error occurred';
              this.snackBar.open(`Failed to create taxi association: ${errorMessage}`, 'Close', { duration: 5000 });
              reject(error);
            }
          }
        });
    });
  }

  createNewTaxiRank(tenantId: string): Promise<any> {
    const formValue = this.newRankForm.value;
    
    // When onboarding a new Taxi Rank, first create it as a Tenant (Association)
    const tenantData = {
      name: formValue.name,
      code: formValue.code || this.generateRankCode(formValue.name),
      tenantType: 'Taxi Association',
      contactEmail: this.userDetailsForm.value.email, // Use admin's email
      contactPhone: this.userDetailsForm.value.phoneNumber // Use admin's phone
    };

    console.log('Creating taxi rank as tenant with data:', tenantData);

    return new Promise((resolve, reject) => {
      // First create the Tenant
      this.http.post(`${environment.apiUrl}/Tenants`, tenantData)
        .subscribe({
          next: (tenant: any) => {
            console.log('Tenant created:', tenant);
            
            // Then create the TaxiRank linked to this tenant
            const newRankData = {
              tenantId: tenant.id, // Link to the newly created tenant
              name: formValue.name,
              code: formValue.code || this.generateRankCode(formValue.name),
              address: formValue.address,
              city: formValue.city,
              province: formValue.province,
              latitude: formValue.latitude || null,
              longitude: formValue.longitude || null,
              capacity: formValue.capacity || null,
              operatingHours: formValue.operatingHours || null,
              notes: null,
              status: 'Active'
            };

            this.http.post(`${environment.apiUrl}/TaxiRanks`, newRankData)
              .subscribe({
                next: (rank) => {
                  this.snackBar.open('Taxi rank and association created successfully!', 'Close', { duration: 3000 });
                  resolve(rank);
                },
                error: (rankError) => {
                  console.error('Error creating taxi rank:', rankError);
                  const errorMessage = rankError.error?.message || rankError.error?.title || rankError.message || 'Failed to create taxi rank';
                  this.snackBar.open(`Failed to create taxi rank: ${errorMessage}`, 'Close', { duration: 5000 });
                  reject(rankError);
                }
              });
          },
          error: (tenantError) => {
            console.error('Error creating tenant for taxi rank:', tenantError);
            
            // If it's a duplicate code error, retry with new code
            if (tenantError.status === 400 && (tenantError.error?.message?.includes('duplicate') || tenantError.error?.message?.includes('IX_Tenants_Code'))) {
              tenantData.code = this.generateRankCode(formValue.name);
              
              this.http.post(`${environment.apiUrl}/Tenants`, tenantData)
                .subscribe({
                  next: (tenant: any) => {
                    // Create the taxi rank with the new tenant
                    const newRankData = {
                      tenantId: tenant.id,
                      name: formValue.name,
                      code: tenantData.code,
                      address: formValue.address,
                      city: formValue.city,
                      province: formValue.province,
                      latitude: formValue.latitude || null,
                      longitude: formValue.longitude || null,
                      capacity: formValue.capacity || null,
                      operatingHours: formValue.operatingHours || null,
                      notes: null,
                      status: 'Active'
                    };

                    this.http.post(`${environment.apiUrl}/TaxiRanks`, newRankData)
                      .subscribe({
                        next: (rank) => {
                          this.snackBar.open('Taxi rank and association created successfully!', 'Close', { duration: 3000 });
                          resolve(rank);
                        },
                        error: (rankError) => {
                          const errorMessage = rankError.error?.message || 'Failed to create taxi rank after retry';
                          this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
                          reject(rankError);
                        }
                      });
                  },
                  error: (retryError) => {
                    const errorMessage = retryError.error?.message || 'Failed to create association after retry';
                    this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
                    reject(retryError);
                  }
                });
            } else {
              const errorMessage = tenantError.error?.message || tenantError.message || 'Failed to create taxi association';
              this.snackBar.open(`Failed to create taxi association: ${errorMessage}`, 'Close', { duration: 5000 });
              reject(tenantError);
            }
          }
        });
    });
  }

  generateTenantCode(name: string): string {
    // Create code from name (uppercase, no spaces, max 20 chars) + timestamp for uniqueness
    const baseCode = name.toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 15);
    const timestamp = Date.now().toString().slice(-5);
    return `${baseCode}-${timestamp}`;
  }

  generateRankCode(name: string): string {
    // Create rank code from name + timestamp
    const baseCode = name.toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 12);
    const timestamp = Date.now().toString().slice(-6);
    return `RNK-${baseCode}-${timestamp}`;
  }

  generateUserCode(firstName: string, lastName: string): string {
    // Create user code from initials + timestamp
    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    const namePart = lastName.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 6);
    const timestamp = Date.now().toString().slice(-6);
    return `${initials}${namePart}${timestamp}`;
  }

  updateUserCode(): void {
    const firstName = this.userDetailsForm.get('firstName')?.value || '';
    const lastName = this.userDetailsForm.get('lastName')?.value || '';
    if (firstName && lastName) {
      const userCode = this.generateUserCode(firstName, lastName);
      this.userDetailsForm.patchValue({ userCode }, { emitEvent: false });
    }
  }

  updateRoleCodes(): void {
    const firstName = this.userDetailsForm.get('firstName')?.value || '';
    const lastName = this.userDetailsForm.get('lastName')?.value || '';
    const role = this.roleSelectionForm.get('role')?.value;

    if (firstName && lastName && role) {
      if (role === 'TaxiRankAdmin') {
        const adminCode = this.generateAdminCode(firstName, lastName);
        this.roleSpecificForm.patchValue({ adminCode }, { emitEvent: false });
      } else if (role === 'TaxiMarshal') {
        const marshalCode = this.generateMarshalCode(firstName, lastName);
        this.roleSpecificForm.patchValue({ marshalCode }, { emitEvent: false });
      }
    }
  }

  generateAdminCode(firstName: string, lastName: string): string {
    // Create admin code with ADM prefix
    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    const namePart = lastName.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 6);
    const timestamp = Date.now().toString().slice(-6);
    return `ADM-${initials}${namePart}${timestamp}`;
  }

  generateMarshalCode(firstName: string, lastName: string): string {
    // Create marshal code with MAR prefix
    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    const namePart = lastName.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 6);
    const timestamp = Date.now().toString().slice(-6);
    return `MAR-${initials}${namePart}${timestamp}`;
  }

  onTaxiRankChange(): void {
    const selectedRankId = this.taxiRankForm.get('taxiRankId')?.value;
    if (selectedRankId) {
      // Get the selected taxi rank and set its tenant
      this.http.get<TaxiRank>(`${environment.apiUrl}/TaxiRanks/${selectedRankId}`)
        .subscribe({
          next: (rank: any) => {
            this.taxiRankForm.patchValue({
              tenantId: rank.tenantId
            });
          },
          error: (error) => {
            console.error('Error loading taxi rank details:', error);
          }
        });
    }
  }

  onTenantChange(): void {
    const selectedTenantId = this.taxiRankForm.get('tenantId')?.value;
    console.log('Tenant changed to:', selectedTenantId);
    if (selectedTenantId) {
      // Filter taxi ranks by selected tenant
      const url = `${environment.apiUrl}/TaxiRanks?tenantId=${selectedTenantId}`;
      console.log('Fetching taxi ranks from:', url);
      this.http.get<TaxiRank[]>(url)
        .subscribe({
          next: (ranks) => {
            console.log('Received ranks:', ranks);
            this.filteredTaxiRanks = ranks.filter(r => r.status === 'Active');
            console.log('Filtered active ranks:', this.filteredTaxiRanks);
            // Reset taxi rank selection when tenant changes
            this.taxiRankForm.patchValue({ taxiRankId: '' });
          },
          error: (error) => {
            console.error('Error loading filtered taxi ranks:', error);
            this.filteredTaxiRanks = [];
          }
        });
    } else {
      console.log('No tenant selected, clearing filtered ranks');
      this.filteredTaxiRanks = [];
    }
  }
}
