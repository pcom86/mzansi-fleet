import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { RentalMarketplaceService, CreateRentalRequestDto } from '../../services/rental-marketplace.service';

@Component({
  selector: 'app-request-vehicle-rental',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule
  ],
  template: `
    <div class="rental-request-container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>Request Vehicle Rental</mat-card-title>
          <mat-card-subtitle>Post your rental requirements and receive offers from vehicle owners</mat-card-subtitle>
        </mat-card-header>
        
        <mat-card-content>
          <form [formGroup]="rentalForm" (ngSubmit)="submitRequest()">
            <div class="form-grid">
              <mat-form-field appearance="outline">
                <mat-label>Vehicle Type</mat-label>
                <mat-select formControlName="vehicleType">
                  <mat-option value="Sedan">Sedan</mat-option>
                  <mat-option value="SUV">SUV</mat-option>
                  <mat-option value="Minibus">Minibus</mat-option>
                  <mat-option value="Van">Van</mat-option>
                  <mat-option value="Truck">Truck</mat-option>
                  <mat-option value="Luxury">Luxury</mat-option>
                  <mat-option value="Any">Any Type</mat-option>
                </mat-select>
                <mat-error *ngIf="rentalForm.get('vehicleType')?.hasError('required')">Vehicle type is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Minimum Seating Capacity</mat-label>
                <input matInput type="number" formControlName="seatingCapacity" min="1">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Pickup Location</mat-label>
                <input matInput formControlName="pickupLocation">
                <mat-error *ngIf="rentalForm.get('pickupLocation')?.hasError('required')">Pickup location is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Dropoff Location</mat-label>
                <input matInput formControlName="dropoffLocation">
                <mat-error *ngIf="rentalForm.get('dropoffLocation')?.hasError('required')">Dropoff location is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Start Date</mat-label>
                <input matInput [matDatepicker]="startPicker" formControlName="startDate" [min]="minDate">
                <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
                <mat-datepicker #startPicker></mat-datepicker>
                <mat-error *ngIf="rentalForm.get('startDate')?.hasError('required')">Start date is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>End Date</mat-label>
                <input matInput [matDatepicker]="endPicker" formControlName="endDate" [min]="rentalForm.get('startDate')?.value || minDate">
                <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
                <mat-datepicker #endPicker></mat-datepicker>
                <mat-error *ngIf="rentalForm.get('endDate')?.hasError('required')">End date is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Trip Purpose</mat-label>
                <mat-select formControlName="tripPurpose">
                  <mat-option value="Business">Business</mat-option>
                  <mat-option value="Personal">Personal</mat-option>
                  <mat-option value="Event">Event/Wedding</mat-option>
                  <mat-option value="Airport Transfer">Airport Transfer</mat-option>
                  <mat-option value="Tourism">Tourism</mat-option>
                  <mat-option value="Other">Other</mat-option>
                </mat-select>
                <mat-error *ngIf="rentalForm.get('tripPurpose')?.hasError('required')">Trip purpose is required</mat-error>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Special Requirements (Optional)</mat-label>
                <textarea matInput formControlName="specialRequirements" rows="3" 
                          placeholder="e.g., GPS, child seat, roof rack"></textarea>
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Budget Min (R)</mat-label>
                <input matInput type="number" formControlName="budgetMin" min="0" step="100">
              </mat-form-field>

              <mat-form-field appearance="outline">
                <mat-label>Budget Max (R)</mat-label>
                <input matInput type="number" formControlName="budgetMax" min="0" step="100">
              </mat-form-field>
            </div>

            <div class="duration-info" *ngIf="calculatedDuration > 0">
              <strong>Duration:</strong> {{ calculatedDuration }} day(s)
            </div>

            <div class="actions">
              <button mat-raised-button type="button" (click)="cancel()">Cancel</button>
              <button mat-raised-button color="primary" type="submit" [disabled]="!rentalForm.valid || isSubmitting">
                {{ isSubmitting ? 'Posting...' : 'Post Request' }}
              </button>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .rental-request-container {
      max-width: 900px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    mat-card {
      padding: 1.5rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 1.5rem;
    }

    .full-width {
      grid-column: 1 / -1;
    }

    .duration-info {
      margin: 1rem 0;
      padding: 1rem;
      background: #e3f2fd;
      border-radius: 4px;
      color: #1976d2;
    }

    .actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 1.5rem;
    }

    @media (max-width: 768px) {
      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class RequestVehicleRentalComponent implements OnInit {
  rentalForm!: FormGroup;
  minDate = new Date();
  isSubmitting = false;
  calculatedDuration = 0;

  constructor(
    private fb: FormBuilder,
    private rentalService: RentalMarketplaceService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit() {
    this.rentalForm = this.fb.group({
      vehicleType: ['', Validators.required],
      seatingCapacity: [null],
      pickupLocation: ['', Validators.required],
      dropoffLocation: ['', Validators.required],
      startDate: [null, Validators.required],
      endDate: [null, Validators.required],
      tripPurpose: ['', Validators.required],
      specialRequirements: [''],
      budgetMin: [null],
      budgetMax: [null]
    });

    // Calculate duration when dates change
    this.rentalForm.get('startDate')?.valueChanges.subscribe(() => this.calculateDuration());
    this.rentalForm.get('endDate')?.valueChanges.subscribe(() => this.calculateDuration());
  }

  calculateDuration() {
    const start = this.rentalForm.get('startDate')?.value;
    const end = this.rentalForm.get('endDate')?.value;
    
    if (start && end) {
      const diffTime = Math.abs(end.getTime() - start.getTime());
      this.calculatedDuration = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    }
  }

  submitRequest() {
    if (this.rentalForm.invalid) {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.isSubmitting = true;
    const formValue = this.rentalForm.value;

    const request: CreateRentalRequestDto = {
      vehicleType: formValue.vehicleType,
      seatingCapacity: formValue.seatingCapacity,
      pickupLocation: formValue.pickupLocation,
      dropoffLocation: formValue.dropoffLocation,
      startDate: formValue.startDate.toISOString(),
      endDate: formValue.endDate.toISOString(),
      tripPurpose: formValue.tripPurpose,
      specialRequirements: formValue.specialRequirements,
      budgetMin: formValue.budgetMin,
      budgetMax: formValue.budgetMax
    };

    this.rentalService.createRequest(request).subscribe({
      next: (response) => {
        this.snackBar.open('Rental request posted successfully! Owners will start sending offers.', 'Close', { duration: 5000 });
        this.router.navigate(['/rental/my-requests']);
      },
      error: (error) => {
        console.error('Error posting rental request:', error);
        this.snackBar.open('Error posting rental request. Please try again.', 'Close', { duration: 3000 });
        this.isSubmitting = false;
      }
    });
  }

  cancel() {
    this.router.navigate(['/dashboard']);
  }
}
