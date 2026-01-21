import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatDividerModule } from '@angular/material/divider';

interface Tender {
  id: string;
  title: string;
  description: string;
  requirementDetails: string;
  status: string;
  pickupLocation: string;
  dropoffLocation: string;
  serviceArea: string;
  transportType: string;
  requiredVehicles?: number;
  routeDetails: string;
  budgetMin?: number;
  budgetMax?: number;
  startDate: string;
  endDate: string;
  applicationDeadline?: string;
  createdAt: string;
  applicationCount: number;
}

@Component({
  selector: 'app-post-tender',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatBadgeModule,
    MatDividerModule
  ],
  template: `
    <div class="post-tender-container">
      <!-- My Posted Tenders Section -->
      <mat-card class="my-tenders-card" *ngIf="myTenders.length > 0">
        <mat-card-header>
          <div mat-card-avatar class="header-icon tenders-icon">
            <mat-icon>list_alt</mat-icon>
          </div>
          <mat-card-title>My Posted Tenders</mat-card-title>
          <mat-card-subtitle>{{ myTenders.length }} tender(s) posted</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <div class="tenders-list">
            <div *ngFor="let tender of myTenders" class="tender-item">
              <div class="tender-item-header">
                <h3>{{ tender.title }}</h3>
                <div class="tender-status">
                  <mat-chip [ngClass]="{
                    'status-open': tender.status === 'Open',
                    'status-awarded': tender.status === 'Awarded',
                    'status-closed': tender.status === 'Closed'
                  }">{{ tender.status }}</mat-chip>
                </div>
              </div>
              
              <p class="tender-description">{{ tender.description }}</p>
              
              <div class="tender-details">
                <span class="detail-item">
                  <mat-icon>place</mat-icon>
                  {{ tender.pickupLocation }} → {{ tender.dropoffLocation }}
                </span>
                <span class="detail-item">
                  <mat-icon>local_shipping</mat-icon>
                  {{ tender.transportType }}
                </span>
                <span class="detail-item" *ngIf="tender.budgetMin && tender.budgetMax">
                  <mat-icon>attach_money</mat-icon>
                  R{{ tender.budgetMin | number }} - R{{ tender.budgetMax | number }}
                </span>
                <span class="detail-item">
                  <mat-icon>calendar_today</mat-icon>
                  Posted {{ tender.createdAt | date:'short' }}
                </span>
              </div>
              
              <div class="tender-actions">
                <button mat-button color="primary" (click)="viewApplications(tender.id)" 
                        [matBadge]="tender.applicationCount" 
                        [matBadgeHidden]="tender.applicationCount === 0"
                        matBadgeColor="warn"
                        matBadgeSize="small">
                  <mat-icon>inbox</mat-icon>
                  {{ tender.applicationCount === 0 ? 'No Applications' : 
                     tender.applicationCount === 1 ? '1 Application' : 
                     tender.applicationCount + ' Applications' }}
                </button>
                <button mat-button (click)="viewTenderDetails(tender.id)">
                  <mat-icon>visibility</mat-icon>
                  View Details
                </button>
                <button mat-button color="accent" (click)="editTender(tender.id)" *ngIf="tender.status === 'Open'">
                  <mat-icon>edit</mat-icon>
                  Edit
                </button>
              </div>
              
              <mat-divider></mat-divider>
            </div>
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Post New Tender Form -->
      <mat-card class="form-card">
        <mat-card-header>
          <div mat-card-avatar class="header-icon">
            <mat-icon>add_business</mat-icon>
          </div>
          <mat-card-title>{{ isEditMode ? 'Edit Transport Tender' : 'Post New Transport Tender' }}</mat-card-title>
          <mat-card-subtitle>{{ isEditMode ? 'Update tender details' : 'Create a new tender opportunity for fleet owners' }}</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <form [formGroup]="tenderForm" (ngSubmit)="submitTender()">
            <!-- Basic Information -->
            <div class="form-section">
              <h3><mat-icon>info</mat-icon> Basic Information</h3>
              
              <mat-form-field appearance="outline">
                <mat-label>Tender Title</mat-label>
                <input matInput formControlName="title" placeholder="e.g., Daily Staff Transport - Sandton to Midrand">
                <mat-error *ngIf="tenderForm.get('title')?.hasError('required')">
                  Title is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Description</mat-label>
                <textarea matInput formControlName="description" rows="4"
                          placeholder="Provide a brief overview of the tender"></textarea>
                <mat-error *ngIf="tenderForm.get('description')?.hasError('required')">
                  Description is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Detailed Requirements</mat-label>
                <textarea matInput formControlName="requirementDetails" rows="6"
                          placeholder="List all specific requirements, expectations, and deliverables"></textarea>
                <mat-error *ngIf="tenderForm.get('requirementDetails')?.hasError('required')">
                  Requirements are required
                </mat-error>
              </mat-form-field>
            </div>

            <!-- Transport Details -->
            <div class="form-section">
              <h3><mat-icon>local_shipping</mat-icon> Transport Details</h3>
              
              <mat-form-field appearance="outline">
                <mat-label>Transport Type</mat-label>
                <mat-select formControlName="transportType">
                  <mat-option value="Passenger">Passenger Transport</mat-option>
                  <mat-option value="Goods">Goods Transport</mat-option>
                  <mat-option value="Mixed">Mixed (Passenger & Goods)</mat-option>
                </mat-select>
                <mat-error *ngIf="tenderForm.get('transportType')?.hasError('required')">
                  Transport type is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Number of Required Vehicles</mat-label>
                <input matInput type="number" formControlName="requiredVehicles" min="1">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Route Details</mat-label>
                <textarea matInput formControlName="routeDetails" rows="3"
                          placeholder="Describe the routes, stops, frequency, etc."></textarea>
              </mat-form-field>
            </div>

            <!-- Location Details -->
            <div class="form-section">
              <h3><mat-icon>location_on</mat-icon> Location Details</h3>
              
              <mat-form-field appearance="outline">
                <mat-label>Pickup Location</mat-label>
                <input matInput formControlName="pickupLocation" placeholder="Main pickup point">
                <mat-icon matPrefix>place</mat-icon>
                <mat-error *ngIf="tenderForm.get('pickupLocation')?.hasError('required')">
                  Pickup location is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Dropoff Location</mat-label>
                <input matInput formControlName="dropoffLocation" placeholder="Main dropoff point">
                <mat-icon matPrefix>flag</mat-icon>
                <mat-error *ngIf="tenderForm.get('dropoffLocation')?.hasError('required')">
                  Dropoff location is required
                </mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Service Area</mat-label>
                <input matInput formControlName="serviceArea" 
                       placeholder="e.g., Gauteng, Johannesburg CBD, etc.">
              </mat-form-field>
            </div>

            <!-- Budget & Timeline -->
            <div class="form-section">
              <h3><mat-icon>attach_money</mat-icon> Budget & Timeline</h3>
              
              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Minimum Budget (R)</mat-label>
                  <input matInput type="number" formControlName="budgetMin" min="0" step="100">
                  <span matPrefix>R&nbsp;</span>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Maximum Budget (R)</mat-label>
                  <input matInput type="number" formControlName="budgetMax" min="0" step="100">
                  <span matPrefix>R&nbsp;</span>
                </mat-form-field>
              </div>

              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Start Date</mat-label>
                  <input matInput [matDatepicker]="startPicker" formControlName="startDate">
                  <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
                  <mat-datepicker #startPicker></mat-datepicker>
                  <mat-error *ngIf="tenderForm.get('startDate')?.hasError('required')">
                    Start date is required
                  </mat-error>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>End Date</mat-label>
                  <input matInput [matDatepicker]="endPicker" formControlName="endDate">
                  <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
                  <mat-datepicker #endPicker></mat-datepicker>
                  <mat-error *ngIf="tenderForm.get('endDate')?.hasError('required')">
                    End date is required
                  </mat-error>
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline">
                <mat-label>Application Deadline</mat-label>
                <input matInput [matDatepicker]="deadlinePicker" formControlName="applicationDeadline">
                <mat-datepicker-toggle matSuffix [for]="deadlinePicker"></mat-datepicker-toggle>
                <mat-datepicker #deadlinePicker></mat-datepicker>
              </mat-form-field>
            </div>

            <!-- Actions -->
            <div class="form-actions">
              <button mat-button type="button" (click)="cancel()">
                <mat-icon>cancel</mat-icon>
                Cancel
              </button>
              <button mat-raised-button color="primary" type="submit" 
                      [disabled]="tenderForm.invalid || submitting">
                <mat-spinner *ngIf="submitting" diameter="20"></mat-spinner>
                <mat-icon *ngIf="!submitting">{{ isEditMode ? 'save' : 'publish' }}</mat-icon>
                {{ submitting ? (isEditMode ? 'Updating...' : 'Publishing...') : (isEditMode ? 'Update Tender' : 'Publish Tender') }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .post-tender-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .my-tenders-card {
      margin-bottom: 24px;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .tenders-icon {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%) !important;
    }

    .tenders-list {
      padding: 0;
    }

    .tender-item {
      padding: 20px 0;
    }

    .tender-item:last-child mat-divider {
      display: none;
    }

    .tender-item-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .tender-item-header h3 {
      margin: 0;
      font-size: 18px;
      color: #2c3e50;
      font-weight: 600;
    }

    .tender-status {
      display: flex;
      gap: 8px;
    }

    .tender-description {
      color: #64748b;
      margin: 0 0 16px 0;
      line-height: 1.5;
    }

    .tender-details {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin-bottom: 16px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #64748b;
      font-size: 14px;
    }

    .detail-item mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #94a3b8;
    }

    .tender-actions {
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
    }

    .tender-actions button {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .status-open {
      background: #10b981 !important;
      color: white !important;
    }

    .status-awarded {
      background: #3b82f6 !important;
      color: white !important;
    }

    .status-closed {
      background: #6b7280 !important;
      color: white !important;
    }

    mat-divider {
      margin-top: 16px;
    }

    .form-card {
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

      .tender-item-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .tender-details {
        flex-direction: column;
        gap: 8px;
      }

      .tender-actions {
        flex-direction: column;
      }

      .tender-actions button {
        width: 100%;
      }
    }
  `]
})
export class PostTenderComponent implements OnInit {
  private apiUrl = 'http://localhost:5000/api';
  tenderForm: FormGroup;
  submitting = false;
  myTenders: Tender[] = [];
  loading = false;
  isEditMode = false;
  editingTenderId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private router: Router,
    private route: ActivatedRoute,
    private snackBar: MatSnackBar
  ) {
    this.tenderForm = this.fb.group({
      title: ['', Validators.required],
      description: ['', Validators.required],
      requirementDetails: ['', Validators.required],
      transportType: ['', Validators.required],
      requiredVehicles: [null],
      routeDetails: [''],
      pickupLocation: ['', Validators.required],
      dropoffLocation: ['', Validators.required],
      serviceArea: [''],
      budgetMin: [null],
      budgetMax: [null],
      startDate: ['', Validators.required],
      endDate: ['', Validators.required],
      applicationDeadline: [null]
    });
  }

  ngOnInit(): void {
    this.loadMyTenders();
    
    // Check if we're in edit mode
    this.route.paramMap.subscribe(params => {
      const tenderId = params.get('id');
      if (tenderId) {
        this.isEditMode = true;
        this.editingTenderId = tenderId;
        this.loadTenderForEdit(tenderId);
      }
    });
  }

  loadMyTenders(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.loading = true;
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<Tender[]>(`${this.apiUrl}/Tender/my-tenders`, { headers }).subscribe({
      next: (tenders) => {
        this.myTenders = tenders;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading my tenders:', error);
        this.loading = false;
      }
    });
  }

  loadTenderForEdit(tenderId: string): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    this.loading = true;
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    this.http.get<Tender>(`${this.apiUrl}/Tender/${tenderId}`, { headers }).subscribe({
      next: (tender) => {
        // Populate form with tender data
        this.tenderForm.patchValue({
          title: tender.title,
          description: tender.description,
          requirementDetails: tender.requirementDetails,
          transportType: tender.transportType,
          requiredVehicles: tender.requiredVehicles,
          routeDetails: tender.routeDetails,
          pickupLocation: tender.pickupLocation,
          dropoffLocation: tender.dropoffLocation,
          serviceArea: tender.serviceArea,
          budgetMin: tender.budgetMin,
          budgetMax: tender.budgetMax,
          startDate: tender.startDate,
          endDate: tender.endDate,
          applicationDeadline: tender.applicationDeadline
        });
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading tender for edit:', error);
        this.snackBar.open('Failed to load tender details', 'Close', { duration: 3000 });
        this.loading = false;
        this.router.navigate(['/tenders/post']);
      }
    });
  }

  submitTender(): void {
    if (this.tenderForm.invalid) {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      this.snackBar.open('Please login to post a tender', 'Close', { duration: 3000 });
      this.router.navigate(['/login']);
      return;
    }

    this.submitting = true;
    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);

    if (this.isEditMode && this.editingTenderId) {
      // Update existing tender
      this.http.put(`${this.apiUrl}/Tender/${this.editingTenderId}`, this.tenderForm.value, { headers }).subscribe({
        next: (response) => {
          this.snackBar.open('Tender updated successfully!', 'Close', { duration: 5000 });
          this.router.navigate(['/tenders/post']);
          this.submitting = false;
        },
        error: (error) => {
          console.error('Error updating tender:', error);
          this.snackBar.open('Failed to update tender. Please try again.', 'Close', { duration: 5000 });
          this.submitting = false;
        }
      });
    } else {
      // Create new tender
      this.http.post(`${this.apiUrl}/Tender`, this.tenderForm.value, { headers }).subscribe({
        next: (response) => {
          this.snackBar.open('Tender published successfully!', 'Close', { duration: 5000 });
          this.tenderForm.reset();
          this.loadMyTenders(); // Reload the list
          this.submitting = false;
        },
        error: (error) => {
          console.error('Error posting tender:', error);
          this.snackBar.open('Failed to publish tender. Please try again.', 'Close', { duration: 5000 });
          this.submitting = false;
        }
      });
    }
  }

  viewApplications(tenderId: string): void {
    this.router.navigate(['/tenders', tenderId, 'applications']);
  }

  viewTenderDetails(tenderId: string): void {
    this.router.navigate(['/tenders', tenderId]);
  }

  editTender(tenderId: string): void {
    this.router.navigate(['/tenders/post', tenderId]);
  }

  cancel(): void {
    this.router.navigate(['/tenders']);
  }
}
