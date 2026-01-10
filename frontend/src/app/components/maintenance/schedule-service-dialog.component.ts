import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-schedule-service-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule,
    MatCardModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>event</mat-icon>
      Schedule Service Appointment
    </h2>

    <mat-dialog-content>
      <div class="dialog-content">
        <!-- Request Details -->
        <mat-card class="request-info">
          <mat-card-content>
            <h3>Request Details</h3>
            <p><strong>Vehicle:</strong> {{ data.request.vehicleName }}</p>
            <p><strong>Type:</strong> {{ data.request.requestType || data.request.category }}</p>
            <p><strong>Description:</strong> {{ data.request.description }}</p>
          </mat-card-content>
        </mat-card>

        <div class="loading-state" *ngIf="loadingProviders">
          <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
          <p>Loading service providers...</p>
        </div>

        <div *ngIf="!loadingProviders">
          <!-- Service Provider Selection -->
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Select Service Provider</mat-label>
            <mat-select [(ngModel)]="selectedProviderId" (selectionChange)="onProviderChange()">
              <mat-option *ngFor="let provider of serviceProviders" [value]="provider.id">
                <div class="provider-option">
                  <div>
                    <strong>{{ provider.name }}</strong>
                    <small class="provider-specialty">{{ provider.specialty }}</small>
                  </div>
                  <mat-chip class="rating-chip">★ {{ provider.rating }}</mat-chip>
                </div>
              </mat-option>
            </mat-select>
            <mat-hint>Choose a provider based on their specialty and rating</mat-hint>
          </mat-form-field>

          <!-- Provider Details -->
          <mat-card *ngIf="selectedProvider" class="provider-details">
            <mat-card-content>
              <div class="provider-header">
                <div>
                  <h3>{{ selectedProvider.name }}</h3>
                  <p class="provider-specialty">{{ selectedProvider.specialty }}</p>
                </div>
                <div class="provider-rating">
                  <mat-icon>star</mat-icon>
                  <span>{{ selectedProvider.rating }}/5</span>
                </div>
              </div>
              <p><mat-icon>location_on</mat-icon> {{ selectedProvider.address }}</p>
              <p><mat-icon>phone</mat-icon> {{ selectedProvider.phone }}</p>
              <p><mat-icon>schedule</mat-icon> Operating Hours: {{ selectedProvider.operatingHours }}</p>
            </mat-card-content>
          </mat-card>

          <!-- Date Selection -->
          <mat-form-field appearance="outline" class="full-width" *ngIf="selectedProvider">
            <mat-label>Select Date</mat-label>
            <input 
              matInput 
              [matDatepicker]="picker"
              [(ngModel)]="selectedDate"
              [min]="minDate"
              (dateChange)="onDateChange()"
              placeholder="Choose a date">
            <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>

          <!-- Available Time Slots -->
          <div *ngIf="selectedDate && selectedProvider" class="time-slots-section">
            <h3>Available Time Slots</h3>
            <div class="loading-state" *ngIf="loadingSlots">
              <mat-progress-spinner mode="indeterminate" diameter="30"></mat-progress-spinner>
              <p>Checking availability...</p>
            </div>

            <div *ngIf="!loadingSlots && availableSlots.length > 0" class="time-slots-grid">
              <button
                *ngFor="let slot of availableSlots"
                mat-stroked-button
                [class.selected]="selectedTimeSlot === slot.time"
                [disabled]="!slot.available"
                (click)="selectTimeSlot(slot)">
                <mat-icon>{{ slot.available ? 'schedule' : 'block' }}</mat-icon>
                {{ slot.time }}
                <span class="slot-status" *ngIf="!slot.available">(Booked)</span>
              </button>
            </div>

            <div *ngIf="!loadingSlots && availableSlots.length === 0" class="no-slots">
              <mat-icon>event_busy</mat-icon>
              <p>No available slots for this date. Please select another date.</p>
            </div>
          </div>

          <!-- Additional Notes -->
          <mat-form-field appearance="outline" class="full-width" *ngIf="selectedTimeSlot">
            <mat-label>Additional Notes (Optional)</mat-label>
            <textarea 
              matInput 
              [(ngModel)]="additionalNotes"
              rows="3"
              placeholder="Any special instructions or requirements...">
            </textarea>
          </mat-form-field>

          <!-- Appointment Summary -->
          <mat-card *ngIf="selectedProvider && selectedDate && selectedTimeSlot" class="appointment-summary">
            <mat-card-content>
              <h3>Appointment Summary</h3>
              <div class="summary-details">
                <p><mat-icon>business</mat-icon> <strong>Provider:</strong> {{ selectedProvider.name }}</p>
                <p><mat-icon>calendar_today</mat-icon> <strong>Date:</strong> {{ selectedDate | date:'fullDate' }}</p>
                <p><mat-icon>access_time</mat-icon> <strong>Time:</strong> {{ selectedTimeSlot }}</p>
                <p><mat-icon>location_on</mat-icon> <strong>Location:</strong> {{ selectedProvider.address }}</p>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button 
        mat-raised-button 
        color="primary"
        [disabled]="!canConfirm()"
        (click)="onConfirm()">
        <mat-icon>check_circle</mat-icon>
        Confirm Appointment
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .dialog-content {
      min-width: 600px;
      max-width: 800px;
      padding: 20px 0;
    }

    .request-info {
      margin-bottom: 20px;
      background-color: #f5f5f5;
    }

    .request-info h3 {
      margin-top: 0;
      color: #667eea;
    }

    .request-info p {
      margin: 8px 0;
    }

    .full-width {
      width: 100%;
      margin-bottom: 20px;
    }

    .provider-option {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      padding: 5px 0;
    }

    .provider-specialty {
      display: block;
      color: #666;
      font-size: 0.85rem;
      margin-top: 2px;
    }

    .rating-chip {
      background-color: #ffc107;
      color: #000;
      font-weight: 600;
      font-size: 0.8rem;
      height: 24px;
    }

    .provider-details {
      margin-bottom: 20px;
      border-left: 4px solid #667eea;
    }

    .provider-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 15px;
    }

    .provider-header h3 {
      margin: 0 0 5px 0;
      color: #333;
    }

    .provider-rating {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 1.2rem;
      font-weight: 600;
      color: #ffc107;
    }

    .provider-details p {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 8px 0;
      color: #666;
    }

    .provider-details mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #667eea;
    }

    .time-slots-section {
      margin: 20px 0;
    }

    .time-slots-section h3 {
      margin-bottom: 15px;
      color: #333;
    }

    .time-slots-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
      gap: 10px;
    }

    .time-slots-grid button {
      padding: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 5px;
      transition: all 0.3s ease;
    }

    .time-slots-grid button:not([disabled]):hover {
      background-color: #e8eaf6;
      border-color: #667eea;
    }

    .time-slots-grid button.selected {
      background-color: #667eea;
      color: white;
      border-color: #667eea;
    }

    .time-slots-grid button.selected mat-icon {
      color: white;
    }

    .time-slots-grid button[disabled] {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .slot-status {
      font-size: 0.75rem;
      color: #f44336;
    }

    .no-slots {
      text-align: center;
      padding: 30px;
      color: #999;
    }

    .no-slots mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 10px;
    }

    .appointment-summary {
      margin-top: 20px;
      background-color: #e8f5e9;
      border-left: 4px solid #4caf50;
    }

    .appointment-summary h3 {
      margin-top: 0;
      color: #2e7d32;
    }

    .summary-details p {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 10px 0;
    }

    .summary-details mat-icon {
      color: #4caf50;
    }

    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 30px;
      gap: 15px;
    }

    mat-dialog-actions {
      padding: 20px;
      margin-top: 20px;
    }

    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 10px;
      color: #667eea;
      margin-bottom: 20px;
    }

    @media (max-width: 768px) {
      .dialog-content {
        min-width: 100%;
      }

      .time-slots-grid {
        grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      }
    }
  `]
})
export class ScheduleServiceDialogComponent implements OnInit {
  serviceProviders: any[] = [];
  selectedProviderId: string | null = null;
  selectedProvider: any = null;
  selectedDate: Date | null = null;
  selectedTimeSlot: string | null = null;
  additionalNotes: string = '';
  availableSlots: any[] = [];
  minDate = new Date();
  loadingProviders = true;
  loadingSlots = false;

  private apiUrl = 'http://localhost:5000/api';

  constructor(
    public dialogRef: MatDialogRef<ScheduleServiceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpClient
  ) {}

  async ngOnInit() {
    await this.loadServiceProviders();
  }

  async loadServiceProviders() {
    try {
      // Load available service providers from database
      const providers: any = await this.http.get(`${this.apiUrl}/ServiceProviderProfiles/available`).toPromise();
      
      // Map backend structure to frontend structure
      this.serviceProviders = providers.map((p: any) => ({
        id: p.id,
        name: p.businessName,
        specialty: p.serviceTypes,
        rating: p.rating || 4.5,
        address: p.address,
        phone: p.phone,
        operatingHours: p.operatingHours || 'Mon-Fri 8:00-17:00'
      }));
      
      console.log(`Loaded ${this.serviceProviders.length} service providers from database`);
    } catch (error) {
      console.error('Error loading service providers from API:', error);
      // Use mock data if API doesn't exist yet or fails
      this.serviceProviders = [
        {
          id: '1',
          name: 'AutoCare Plus',
          specialty: 'General Service & Repairs',
          rating: 4.8,
          address: '123 Main Street, Johannesburg',
          phone: '+27 11 123 4567',
          operatingHours: 'Mon-Fri 8:00-17:00, Sat 8:00-13:00'
        },
        {
          id: '2',
          name: 'QuickFix Mechanics',
          specialty: 'Emergency Repairs & Diagnostics',
          rating: 4.6,
          address: '456 Industrial Road, Sandton',
          phone: '+27 11 234 5678',
          operatingHours: 'Mon-Sat 7:00-18:00'
        },
        {
          id: '3',
          name: 'Elite Auto Service',
          specialty: 'Luxury & Premium Vehicles',
          rating: 4.9,
          address: '789 Premium Ave, Rosebank',
          phone: '+27 11 345 6789',
          operatingHours: 'Mon-Fri 8:00-17:00'
        },
        {
          id: '4',
          name: 'TirePro Center',
          specialty: 'Tire Services & Wheel Alignment',
          rating: 4.7,
          address: '321 Service Lane, Midrand',
          phone: '+27 11 456 7890',
          operatingHours: 'Mon-Sat 8:00-17:00'
        },
        {
          id: '5',
          name: 'BrakeExperts SA',
          specialty: 'Brake Systems & Safety',
          rating: 4.8,
          address: '654 Safety Street, Randburg',
          phone: '+27 11 567 8901',
          operatingHours: 'Mon-Fri 8:00-17:00, Sat 8:00-12:00'
        }
      ];
    } finally {
      this.loadingProviders = false;
    }
  }

  onProviderChange() {
    this.selectedProvider = this.serviceProviders.find(p => p.id === this.selectedProviderId);
    this.selectedDate = null;
    this.selectedTimeSlot = null;
    this.availableSlots = [];
  }

  async onDateChange() {
    if (!this.selectedDate || !this.selectedProvider) return;

    this.loadingSlots = true;
    this.selectedTimeSlot = null;

    // Simulate API call to get available slots
    await new Promise(resolve => setTimeout(resolve, 800));

    // Generate time slots based on operating hours
    this.availableSlots = this.generateTimeSlots();
    this.loadingSlots = false;
  }

  generateTimeSlots(): any[] {
    const slots: Array<{ time: string; available: boolean }> = [];
    const times = [
      '08:00', '08:30', '09:00', '09:30', '10:00', '10:30',
      '11:00', '11:30', '12:00', '12:30', '13:00', '13:30',
      '14:00', '14:30', '15:00', '15:30', '16:00', '16:30'
    ];

    // Randomly mark some slots as unavailable for realism
    times.forEach(time => {
      const available = Math.random() > 0.3; // 70% availability
      slots.push({ time, available });
    });

    return slots;
  }

  selectTimeSlot(slot: any) {
    if (slot.available) {
      this.selectedTimeSlot = slot.time;
    }
  }

  canConfirm(): boolean {
    return !!(this.selectedProvider && this.selectedDate && this.selectedTimeSlot);
  }

  onCancel() {
    this.dialogRef.close(null);
  }

  onConfirm() {
    if (!this.canConfirm()) return;

    const scheduledDateTime = new Date(this.selectedDate!);
    const [hours, minutes] = this.selectedTimeSlot!.split(':');
    scheduledDateTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const result = {
      providerId: this.selectedProviderId,
      providerName: this.selectedProvider.name,
      scheduledDate: scheduledDateTime,
      timeSlot: this.selectedTimeSlot,
      notes: this.additionalNotes,
      providerPhone: this.selectedProvider.phone,
      providerAddress: this.selectedProvider.address
    };

    this.dialogRef.close(result);
  }
}
