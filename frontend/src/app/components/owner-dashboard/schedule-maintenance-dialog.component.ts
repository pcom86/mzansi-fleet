import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { HttpClient } from '@angular/common/http';

export interface ScheduleDialogData {
  requestId: string;
}

export interface ServiceProvider {
  id: string;
  businessName: string;
  contactPerson: string;
  phone: string;
  serviceTypes: string;
  rating: number;
  isAvailable: boolean;
}

@Component({
  selector: 'app-schedule-maintenance-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
    <h2 mat-dialog-title>Schedule Service Appointment</h2>
    <mat-dialog-content>
      <form [formGroup]="scheduleForm" class="schedule-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Scheduled Date</mat-label>
          <input matInput [matDatepicker]="picker" formControlName="scheduledDate" [min]="minDate" required>
          <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
          <mat-error *ngIf="scheduleForm.get('scheduledDate')?.hasError('required')">
            Date is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Service Provider</mat-label>
          <mat-select formControlName="serviceProviderId" required>
            <mat-option *ngFor="let provider of serviceProviders" [value]="provider.id">
              <div class="provider-option">
                <span class="provider-name">{{ provider.businessName }}</span>
                <span class="provider-rating" *ngIf="provider.rating">⭐ {{ provider.rating.toFixed(1) }}</span>
              </div>
              <div class="provider-details">
                {{ provider.serviceTypes }} | {{ provider.phone }}
              </div>
            </mat-option>
          </mat-select>
          <mat-error *ngIf="scheduleForm.get('serviceProviderId')?.hasError('required')">
            Service provider is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Additional Notes (Optional)</mat-label>
          <textarea matInput formControlName="notes" rows="3" placeholder="Any special instructions or notes..."></textarea>
        </mat-form-field>
      </form>

      <div *ngIf="loading" class="loading-message">
        Loading available service providers...
      </div>

      <div *ngIf="!loading && serviceProviders.length === 0" class="no-providers-message">
        No service providers available at the moment. Please try again later.
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" 
              (click)="onSchedule()" 
              [disabled]="!scheduleForm.valid || loading || serviceProviders.length === 0">
        Schedule
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .schedule-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 400px;
      padding: 16px 0;
    }

    .full-width {
      width: 100%;
    }

    .provider-option {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-weight: 500;
    }

    .provider-name {
      font-size: 14px;
    }

    .provider-rating {
      font-size: 12px;
      color: #f57c00;
    }

    .provider-details {
      font-size: 11px;
      color: #666;
      margin-top: 4px;
    }

    .loading-message, .no-providers-message {
      padding: 16px;
      text-align: center;
      color: #666;
      font-style: italic;
    }

    mat-dialog-content {
      min-height: 300px;
    }

    mat-dialog-actions {
      padding: 16px 24px;
    }
  `]
})
export class ScheduleMaintenanceDialogComponent implements OnInit {
  scheduleForm: FormGroup;
  serviceProviders: ServiceProvider[] = [];
  loading = true;
  minDate = new Date();

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    public dialogRef: MatDialogRef<ScheduleMaintenanceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ScheduleDialogData
  ) {
    this.scheduleForm = this.fb.group({
      scheduledDate: ['', Validators.required],
      serviceProviderId: ['', Validators.required],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadServiceProviders();
  }

  loadServiceProviders(): void {
    this.loading = true;
    this.http.get<ServiceProvider[]>('http://localhost:5000/api/ServiceProviderProfiles/available')
      .subscribe({
        next: (providers) => {
          this.serviceProviders = providers;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading service providers:', error);
          this.loading = false;
        }
      });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSchedule(): void {
    if (this.scheduleForm.valid) {
      const selectedProviderId = this.scheduleForm.value.serviceProviderId;
      const selectedProvider = this.serviceProviders.find(p => p.id === selectedProviderId);
      
      this.dialogRef.close({
        scheduledDate: this.scheduleForm.value.scheduledDate,
        serviceProviderId: selectedProviderId,
        serviceProviderName: selectedProvider?.businessName || '',
        notes: this.scheduleForm.value.notes
      });
    }
  }
}
