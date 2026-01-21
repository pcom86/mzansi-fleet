import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDividerModule } from '@angular/material/divider';
import { MatStepperModule } from '@angular/material/stepper';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';

interface Tender {
  id: string;
  title: string;
  description: string;
  requirementDetails: string;
  budgetMin?: number;
  budgetMax?: number;
  transportType: string;
  requiredVehicles?: number;
  routeDetails: string;
  startDate: string;
  endDate: string;
  pickupLocation: string;
  dropoffLocation: string;
  serviceArea: string;
}

@Component({
  selector: 'app-tender-application',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatDividerModule,
    MatStepperModule,
    MatDialogModule
  ],
  template: `
    <div class="application-container">
      <!-- Breadcrumbs -->
      <div class="breadcrumb">
        <button mat-button (click)="goToDashboard()">
          <mat-icon>home</mat-icon>
          Dashboard
        </button>
        <mat-icon class="breadcrumb-separator">chevron_right</mat-icon>
        <button mat-button (click)="goToTenderDetails()">
          Tender Details
        </button>
        <mat-icon class="breadcrumb-separator">chevron_right</mat-icon>
        <span class="current">Apply</span>
      </div>

      <div class="tender-summary" *ngIf="tender">
        <mat-card>
          <mat-card-header>
            <mat-icon mat-card-avatar>description</mat-icon>
            <mat-card-title>{{ tender.title }}</mat-card-title>
            <mat-card-subtitle>Tender Details</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="tender-info">
              <div class="info-item">
                <mat-icon>info</mat-icon>
                <p>{{ tender.description }}</p>
              </div>
              <div class="info-item">
                <mat-icon>route</mat-icon>
                <p><strong>Route:</strong> {{ tender.pickupLocation }} → {{ tender.dropoffLocation }}</p>
              </div>
              <div class="info-item" *ngIf="tender.budgetMin || tender.budgetMax">
                <mat-icon>attach_money</mat-icon>
                <p><strong>Budget:</strong> R{{ tender.budgetMin | number }} - R{{ tender.budgetMax | number }}</p>
              </div>
              <div class="info-item">
                <mat-icon>calendar_today</mat-icon>
                <p><strong>Period:</strong> {{ tender.startDate | date:'mediumDate' }} - {{ tender.endDate | date:'mediumDate' }}</p>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card class="application-form-card">
        <mat-card-header>
          <div mat-card-avatar class="header-icon">
            <mat-icon>send</mat-icon>
          </div>
          <mat-card-title>Submit Your Application</mat-card-title>
          <mat-card-subtitle>Provide details about your fleet and proposal</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="applicationForm" (ngSubmit)="submitApplication()">
            <!-- Application Message -->
            <div class="form-section">
              <h3><mat-icon>message</mat-icon> Cover Letter</h3>
              <mat-form-field appearance="outline">
                <mat-label>Why are you interested in this tender?</mat-label>
                <textarea matInput formControlName="applicationMessage" rows="5"
                          placeholder="Explain why you're a good fit for this opportunity"></textarea>
                <mat-error *ngIf="applicationForm.get('applicationMessage')?.hasError('required')">
                  Application message is required
                </mat-error>
              </mat-form-field>
            </div>

            <!-- Proposal Details -->
            <div class="form-section">
              <h3><mat-icon>description</mat-icon> Proposal Details</h3>
              
              <mat-form-field appearance="outline">
                <mat-label>Proposed Budget (R)</mat-label>
                <input matInput type="number" formControlName="proposedBudget" min="0" step="100">
                <span matPrefix>R&nbsp;</span>
                <mat-error *ngIf="applicationForm.get('proposedBudget')?.hasError('required')">
                  Proposed budget is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Detailed Proposal</mat-label>
                <textarea matInput formControlName="proposalDetails" rows="6"
                          placeholder="Describe how you will fulfill the tender requirements"></textarea>
                <mat-error *ngIf="applicationForm.get('proposalDetails')?.hasError('required')">
                  Proposal details are required
                </mat-error>
              </mat-form-field>
            </div>

            <!-- Fleet Information -->
            <div class="form-section">
              <h3><mat-icon>directions_car</mat-icon> Fleet Information</h3>
              
              <mat-form-field appearance="outline">
                <mat-label>Number of Available Vehicles</mat-label>
                <input matInput type="number" formControlName="availableVehicles" min="1">
                <mat-error *ngIf="applicationForm.get('availableVehicles')?.hasError('required')">
                  Number of vehicles is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Vehicle Types</mat-label>
                <input matInput formControlName="vehicleTypes" 
                       placeholder="e.g., Mini-bus (16 seater), Sedan, etc.">
                <mat-error *ngIf="applicationForm.get('vehicleTypes')?.hasError('required')">
                  Vehicle types are required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Experience Highlights</mat-label>
                <textarea matInput formControlName="experienceHighlights" rows="4"
                          placeholder="Highlight your relevant experience and achievements"></textarea>
              </mat-form-field>
            </div>

            <!-- Contact Information -->
            <div class="form-section">
              <h3><mat-icon>contact_phone</mat-icon> Contact Information</h3>
              
              <mat-form-field appearance="outline">
                <mat-label>Contact Person</mat-label>
                <input matInput formControlName="contactPerson">
                <mat-error *ngIf="applicationForm.get('contactPerson')?.hasError('required')">
                  Contact person is required
                </mat-error>
              </mat-form-field>

              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Contact Phone</mat-label>
                  <input matInput formControlName="contactPhone" type="tel">
                  <mat-icon matPrefix>phone</mat-icon>
                  <mat-error *ngIf="applicationForm.get('contactPhone')?.hasError('required')">
                    Phone is required
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Contact Email</mat-label>
                  <input matInput formControlName="contactEmail" type="email">
                  <mat-icon matPrefix>email</mat-icon>
                  <mat-error *ngIf="applicationForm.get('contactEmail')?.hasError('required')">
                    Email is required
                  </mat-error>
                </mat-form-field>
              </div>
            </div>

            <!-- Actions -->
            <div class="form-actions">
              <button mat-button type="button" (click)="cancel()">
                <mat-icon>cancel</mat-icon>
                Cancel
              </button>
              <button mat-raised-button color="primary" type="submit" 
                      [disabled]="applicationForm.invalid || submitting"
                      (click)="confirmSubmit($event)">
                <mat-spinner *ngIf="submitting" diameter="20"></mat-spinner>
                <mat-icon *ngIf="!submitting">send</mat-icon>
                {{ submitting ? 'Submitting...' : 'Submit Application' }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .application-container {
      padding: 24px;
      max-width: 900px;
      margin: 0 auto;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      padding: 8px 0;
      margin-bottom: 16px;
      color: #64748b;
      font-size: 14px;

      button {
        color: #3b82f6;
        font-size: 14px;
        padding: 4px 8px;
        min-width: auto;
        line-height: 20px;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          margin-right: 4px;
        }
      }

      .breadcrumb-separator {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #cbd5e1;
        margin: 0 4px;
      }

      .current {
        color: #64748b;
        font-weight: 500;
      }
    }

    .tender-summary {
      margin-bottom: 24px;
    }

    .tender-info {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .info-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 12px;
      background: #f9fafb;
      border-radius: 8px;
    }

    .info-item mat-icon {
      color: #667eea;
      margin-top: 2px;
    }

    .info-item p {
      margin: 0;
      color: #444;
      line-height: 1.6;
    }

    .application-form-card {
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .header-icon {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .header-icon mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    mat-card-content {
      padding: 24px;
    }

    .form-section {
      margin-bottom: 32px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 8px;
    }

    .form-section h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 20px 0;
      color: #2c3e50;
      font-size: 18px;
    }

    .form-section h3 mat-icon {
      color: #667eea;
    }

    mat-form-field {
      width: 100%;
      margin-bottom: 16px;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      padding-top: 20px;
      border-top: 2px solid #e5e7eb;
    }

    .form-actions button {
      min-width: 140px;
    }

    .form-actions button mat-icon {
      margin-right: 4px;
    }

    .form-actions mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    @media (max-width: 768px) {
      .form-row {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class TenderApplicationComponent implements OnInit {
  private apiUrl = 'http://localhost:5000/api';
  applicationForm: FormGroup;
  submitting = false;
  tenderId: string = '';
  tender: Tender | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {
    this.applicationForm = this.fb.group({
      applicationMessage: ['', [Validators.required, Validators.minLength(50)]],
      proposedBudget: ['', [Validators.required, Validators.min(1)]],
      proposalDetails: ['', Validators.required],
      availableVehicles: ['', Validators.required],
      vehicleTypes: ['', Validators.required],
      experienceHighlights: [''],
      contactPerson: ['', Validators.required],
      contactPhone: ['', Validators.required],
      contactEmail: ['', [Validators.required, Validators.email]]
    });
  }

  ngOnInit(): void {
    this.tenderId = this.route.snapshot.paramMap.get('id') || '';
    if (this.tenderId) {
      this.loadTenderDetails();
    }
  }

  loadTenderDetails(): void {
    this.http.get<Tender>(`${this.apiUrl}/Tender/${this.tenderId}`).subscribe({
      next: (data) => {
        this.tender = data;
      },
      error: (error) => {
        console.error('Error loading tender:', error);
        this.snackBar.open('Failed to load tender details', 'Close', { duration: 3000 });
      }
    });
  }

  submitApplication(): void {
    if (this.applicationForm.invalid) {
      this.snackBar.open('Please fill in all required fields correctly', 'Close', { duration: 3000 });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      this.snackBar.open('Please login to apply', 'Close', { duration: 3000 });
      this.router.navigate(['/login']);
      return;
    }

    this.submitting = true;
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    const payload = {
      ...this.applicationForm.value,
      tenderId: this.tenderId
    };

    this.http.post(`${this.apiUrl}/Tender/${this.tenderId}/apply`, payload, { headers }).subscribe({
      next: (response) => {
        this.snackBar.open('✓ Application submitted successfully!', 'Close', { 
          duration: 5000,
          panelClass: ['success-snackbar']
        });
        this.router.navigate(['/owner-dashboard']);
      },
      error: (error) => {
        console.error('Error submitting application:', error);
        const errorMsg = error.error?.message || error.error || 'Failed to submit application';
        this.snackBar.open(`✗ ${errorMsg}`, 'Close', { 
          duration: 5000,
          panelClass: ['error-snackbar']
        });
        this.submitting = false;
      }
    });
  }

  confirmSubmit(event: Event): void {
    event.preventDefault();

    if (this.applicationForm.invalid) {
      this.snackBar.open('Please fill in all required fields correctly', 'Close', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        title: 'Submit Application',
        message: `Are you sure you want to submit your application for "${this.tender?.title}"? Make sure all information is accurate before proceeding.`,
        confirmText: 'Submit Application',
        cancelText: 'Review Again',
        icon: 'send',
        color: 'primary'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.submitApplication();
      }
    });
  }

  cancel(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Cancel Application',
        message: 'Are you sure you want to cancel? All entered information will be lost.',
        confirmText: 'Yes, Cancel',
        cancelText: 'Continue Editing',
        icon: 'warning',
        color: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.router.navigate(['/owner-dashboard']);
      }
    });
  }

  goToDashboard(): void {
    this.router.navigate(['/owner-dashboard']);
  }

  goToTenderDetails(): void {
    if (this.tenderId) {
      this.router.navigate(['/tenders', this.tenderId]);
    }
  }
}
