import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ScheduleServiceDialogComponent } from '../maintenance/schedule-service-dialog.component';

@Component({
  selector: 'app-driver-maintenance-request',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTableModule,
    MatChipsModule,
    MatDialogModule
  ],
  template: `
    <div class="maintenance-request-page">
      <div class="page-header">
        <button mat-raised-button routerLink="/driver-dashboard" class="back-button">
          <mat-icon>arrow_back</mat-icon>
          Back to Dashboard
        </button>
        <h1>Maintenance & Service Requests</h1>
        <p>Submit requests and track their status</p>
      </div>

      <div class="content-grid">
        <!-- Request Form -->
        <mat-card class="form-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>{{ editingRequestId ? 'edit' : 'add_circle' }}</mat-icon>
            <mat-card-title>{{ editingRequestId ? 'Edit Maintenance Request' : 'New Maintenance Request' }}</mat-card-title>
            <mat-card-subtitle>You can only request maintenance for vehicles assigned to you</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="vehicles.length === 0" class="no-vehicles-message">
              <mat-icon>info</mat-icon>
              <p>You don't have any vehicles assigned to you yet. Please contact your fleet manager.</p>
            </div>

            <form *ngIf="vehicles.length > 0" #requestForm="ngForm" (ngSubmit)="submitRequest()">
              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Vehicle</mat-label>
                <mat-select [(ngModel)]="newRequest.vehicleId" name="vehicleId" required disabled>
                  <mat-option *ngFor="let vehicle of vehicles" [value]="vehicle.id">
                    {{ vehicle.make }} {{ vehicle.model }} ({{ vehicle.registration }})
                  </mat-option>
                </mat-select>
                <mat-hint>This is your assigned vehicle</mat-hint>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Request Type</mat-label>
                <mat-select [(ngModel)]="newRequest.category" name="category" required>
                  <mat-option value="Routine Service">Routine Service</mat-option>
                  <mat-option value="Urgent Repair">Urgent Repair</mat-option>
                  <mat-option value="Tire Service">Tire Service</mat-option>
                  <mat-option value="Brake Service">Brake Service</mat-option>
                  <mat-option value="Engine Issue">Engine Issue</mat-option>
                  <mat-option value="Electrical">Electrical</mat-option>
                  <mat-option value="Body Work">Body Work</mat-option>
                  <mat-option value="Other">Other</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Priority</mat-label>
                <mat-select [(ngModel)]="newRequest.priority" name="priority" required>
                  <mat-option value="Low">Low - Can wait</mat-option>
                  <mat-option value="Medium">Medium - Within a week</mat-option>
                  <mat-option value="High">High - Urgent attention needed</mat-option>
                  <mat-option value="Critical">Critical - Vehicle unsafe</mat-option>
                </mat-select>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Description</mat-label>
                <textarea 
                  matInput 
                  [(ngModel)]="newRequest.description" 
                  name="description"
                  rows="4"
                  placeholder="Describe the issue or service needed in detail..."
                  required>
                </textarea>
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Location</mat-label>
                <input 
                  matInput 
                  [(ngModel)]="newRequest.location" 
                  name="location"
                  placeholder="Where is the vehicle located?">
              </mat-form-field>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Preferred Service Date</mat-label>
                <input 
                  matInput 
                  [matDatepicker]="picker"
                  [(ngModel)]="newRequest.preferredTime"
                  name="preferredTime">
                <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
                <mat-datepicker #picker></mat-datepicker>
              </mat-form-field>

              <mat-checkbox 
                [(ngModel)]="newRequest.callOutRequired" 
                name="callOutRequired"
                class="full-width">
                Call-out service required (mechanic comes to location)
              </mat-checkbox>

              <div class="form-actions">
                <button 
                  mat-raised-button 
                  color="primary" 
                  type="submit"
                  [disabled]="!requestForm.valid || submitting">
                  <mat-icon>{{ editingRequestId ? 'save' : 'send' }}</mat-icon>
                  {{ editingRequestId ? 'Update Request' : 'Submit Request' }}
                </button>
                <button 
                  *ngIf="editingRequestId"
                  mat-raised-button 
                  type="button"
                  (click)="cancelEdit()">
                  <mat-icon>cancel</mat-icon>
                  Cancel
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>

        <!-- My Requests List -->
        <mat-card class="requests-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>list</mat-icon>
            <mat-card-title>My Requests</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="loading" class="loading-container">
              <mat-progress-spinner mode="indeterminate" diameter="50"></mat-progress-spinner>
            </div>

            <div *ngIf="!loading && myRequests.length === 0" class="empty-state">
              <mat-icon>inbox</mat-icon>
              <p>No requests yet</p>
            </div>

            <div *ngIf="!loading && myRequests.length > 0" class="requests-list">
              <div *ngFor="let request of myRequests" class="request-item">
                <div class="request-header">
                  <div class="request-title">
                    <strong>{{ request.vehicleName }}</strong>
                    <mat-chip [class]="'status-' + request.status.toLowerCase()">
                      {{ request.status }}
                    </mat-chip>
                  </div>
                  <span class="request-date">{{ request.createdAt | date:'short' }}</span>
                </div>
                
                <div class="request-details">
                  <div class="detail-row">
                    <mat-icon>category</mat-icon>
                    <span>{{ request.category }}</span>
                  </div>
                  <div class="detail-row">
                    <mat-icon>priority_high</mat-icon>
                    <span>Priority: {{ request.priority }}</span>
                  </div>
                  <div class="detail-row description">
                    <mat-icon>description</mat-icon>
                    <span>{{ request.description }}</span>
                  </div>
                </div>

                <div *ngIf="request.status === 'Approved' && !request.serviceProvider" class="action-section">
                  <button mat-raised-button color="primary" (click)="scheduleService(request)">
                    <mat-icon>event</mat-icon>
                    Schedule Service
                  </button>
                </div>

                <div *ngIf="request.status === 'Pending'" class="action-section">
                  <button mat-raised-button color="primary" (click)="editRequest(request)" style="margin-right: 10px;">
                    <mat-icon>edit</mat-icon>
                    Edit
                  </button>
                  <button mat-raised-button color="warn" (click)="deleteRequest(request)">
                    <mat-icon>delete</mat-icon>
                    Delete
                  </button>
                </div>

                <div *ngIf="request.serviceProvider" class="service-info">
                  <mat-icon>build</mat-icon>
                  <div>
                    <strong>Service Provider:</strong> {{ request.serviceProvider }}<br>
                    <strong>Scheduled:</strong> {{ request.scheduledDate | date:'medium' }}
                  </div>
                </div>

                <div *ngIf="(request.status === 'Scheduled' || request.status === 'In Progress') && !request.completedDate" class="action-section">
                  <button mat-raised-button color="accent" (click)="markAsComplete(request)">
                    <mat-icon>check_circle</mat-icon>
                    Mark as Complete
                  </button>
                </div>

                <div *ngIf="request.status === 'Declined'" class="declined-reason">
                  <mat-icon>info</mat-icon>
                  <span>Reason: {{ request.declineReason || 'No reason provided' }}</span>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .maintenance-request-page {
      padding: 20px;
      background-color: #f5f5f5;
      min-height: 100vh;
    }

    .page-header {
      background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
      padding: 30px;
      border-radius: 12px;
      color: white;
      margin-bottom: 20px;
    }

    .page-header h1 {
      margin: 10px 0 5px 0;
      font-size: 2rem;
    }

    .page-header p {
      margin: 0;
      opacity: 0.9;
    }

    .back-button {
      margin-bottom: 15px;
    }

    .content-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
    }

    .form-card, .requests-card {
      height: fit-content;
    }

    .full-width {
      width: 100%;
      margin-bottom: 15px;
    }

    .form-actions {
      margin-top: 20px;
      display: flex;
      justify-content: flex-end;
    }

    .no-vehicles-message {
      display: flex;
      align-items: center;
      gap: 15px;
      padding: 20px;
      background-color: #fff3cd;
      border: 1px solid #ffc107;
      border-radius: 8px;
      color: #856404;
    }

    .no-vehicles-message mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #ffc107;
    }

    .no-vehicles-message p {
      margin: 0;
      font-size: 1rem;
    }

    .loading-container {
      display: flex;
      justify-content: center;
      padding: 40px;
    }

    .empty-state {
      text-align: center;
      padding: 40px;
      color: #999;
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 15px;
    }

    .requests-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
      max-height: 600px;
      overflow-y: auto;
    }

    .request-item {
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #2196f3;
    }

    .request-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .request-title {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .request-date {
      font-size: 0.85rem;
      color: #666;
    }

    mat-chip {
      font-size: 0.75rem;
      height: 24px;
      padding: 0 8px;
    }

    mat-chip.status-pending {
      background-color: #ff9800;
      color: white;
    }

    mat-chip.status-approved {
      background-color: #4caf50;
      color: white;
    }

    mat-chip.status-declined {
      background-color: #f44336;
      color: white;
    }

    mat-chip.status-scheduled {
      background-color: #2196f3;
      color: white;
    }

    mat-chip.status-completed {
      background-color: #9e9e9e;
      color: white;
    }

    .request-details {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 10px;
    }

    .detail-row {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 0.9rem;
    }

    .detail-row mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #666;
    }

    .detail-row.description {
      color: #555;
    }

    .action-section {
      margin-top: 15px;
      padding-top: 15px;
      border-top: 1px solid #ddd;
    }

    .service-info {
      display: flex;
      gap: 10px;
      padding: 10px;
      background-color: #e3f2fd;
      border-radius: 4px;
      margin-top: 10px;
    }

    .service-info mat-icon {
      color: #2196f3;
    }

    .declined-reason {
      display: flex;
      gap: 10px;
      padding: 10px;
      background-color: #ffebee;
      border-radius: 4px;
      margin-top: 10px;
      color: #c62828;
    }

    @media (max-width: 968px) {
      .content-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DriverMaintenanceRequestComponent implements OnInit {
  loading = false;
  submitting = false;
  vehicles: any[] = [];
  myRequests: any[] = [];
  editingRequestId: string | null = null;
  serviceProviders: any[] = [
    { name: 'AutoCare Plus', specialty: 'General Service' },
    { name: 'QuickFix Mechanics', specialty: 'Emergency Repairs' },
    { name: 'Elite Auto Service', specialty: 'Luxury Vehicles' },
    { name: 'TirePro Center', specialty: 'Tire Services' },
    { name: 'BrakeExperts', specialty: 'Brake Systems' }
  ];

  newRequest: any = {
    vehicleId: null,
    category: '',
    priority: 'Medium',
    description: '',
    location: '',
    preferredTime: null,
    callOutRequired: false
  };

  private apiUrl = 'http://localhost:5000/api';

  constructor(
    private router: Router,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  async ngOnInit() {
    await this.loadData();
  }

  async loadData() {
    this.loading = true;
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        this.router.navigate(['/login']);
        return;
      }

      const user = JSON.parse(userStr);
      const userId = user.id || user.userId;
      console.log('Driver user info:', user);

      // Get driver profile to find assigned vehicle
      const driverProfiles: any = await this.http.get(`${this.apiUrl}/Drivers`).toPromise();
      const driverProfile = driverProfiles.find((d: any) => 
        d.userId === userId || 
        d.id === userId ||
        d.email === user.email
      );
      
      console.log('Driver profile:', driverProfile);

      if (!driverProfile) {
        console.error('Driver profile not found for user:', userId);
        this.loading = false;
        return;
      }

      // Load all vehicles
      const allVehicles: any = await this.http.get(`${this.apiUrl}/Vehicles`).toPromise();
      console.log('All vehicles:', allVehicles);
      
      // Filter to get only the assigned vehicle
      if (driverProfile.assignedVehicleId) {
        this.vehicles = allVehicles.filter((v: any) => v.id === driverProfile.assignedVehicleId);
        console.log('Driver assigned vehicle:', this.vehicles);
      } else {
        console.log('No vehicle assigned to this driver');
        this.vehicles = [];
      }

      // Auto-select the first vehicle (driver's assigned vehicle)
      if (this.vehicles.length > 0 && !this.newRequest.vehicleId) {
        this.newRequest.vehicleId = this.vehicles[0].id;
      }

      // Load driver's maintenance requests
      await this.loadMyRequests();

    } catch (error) {
      console.error('Error loading data:', error);
      this.snackBar.open('Error loading data', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  async loadMyRequests() {
    try {
      const userStr = localStorage.getItem('user');
      const user = JSON.parse(userStr!);

      const allRequests: any = await this.http.get(`${this.apiUrl}/MechanicalRequests`).toPromise();
      
      // Filter requests for this driver's vehicles
      this.myRequests = allRequests
        .filter((r: any) => this.vehicles.some(v => v.id === r.vehicleId))
        .map((r: any) => {
          const vehicle = this.vehicles.find(v => v.id === r.vehicleId);
          return {
            ...r,
            vehicleName: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.registration})` : 'Unknown',
            status: r.state || 'Pending',
            createdAt: r.createdAt || new Date()
          };
        })
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    } catch (error) {
      console.error('Error loading requests:', error);
    }
  }

  async submitRequest() {
    if (this.submitting) return;

    this.submitting = true;
    try {
      const userStr = localStorage.getItem('user');
      const user = JSON.parse(userStr!);

      const payload = {
        ownerId: user.tenantId,
        vehicleId: this.newRequest.vehicleId,
        location: this.newRequest.location,
        category: this.newRequest.category,
        description: this.newRequest.description,
        mediaUrls: '',
        preferredTime: this.newRequest.preferredTime,
        callOutRequired: this.newRequest.callOutRequired,
        state: 'Pending',
        priority: this.newRequest.priority,
        requestedBy: user.id,
        requestedByType: 'Driver'
      };

      if (this.editingRequestId) {
        // Update existing request
        await this.http.put(`${this.apiUrl}/MechanicalRequests/${this.editingRequestId}`, payload).toPromise();
        this.snackBar.open('Request updated successfully!', 'Close', { duration: 3000 });
        this.editingRequestId = null;
      } else {
        // Create new request
        await this.http.post(`${this.apiUrl}/MechanicalRequests`, payload).toPromise();
        this.snackBar.open('Request submitted successfully!', 'Close', { duration: 3000 });
      }
      
      // Reset form
      this.newRequest = {
        vehicleId: null,
        category: '',
        priority: 'Medium',
        description: '',
        location: '',
        preferredTime: null,
        callOutRequired: false
      };

      // Reload requests
      await this.loadMyRequests();

    } catch (error) {
      console.error('Error submitting request:', error);
      this.snackBar.open('Error submitting request', 'Close', { duration: 3000 });
    } finally {
      this.submitting = false;
    }
  }

  scheduleService(request: any) {
    const dialogRef = this.dialog.open(ScheduleServiceDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: { request },
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        await this.confirmSchedule(request, result);
      }
    });
  }

  async confirmSchedule(request: any, scheduleData: any) {
    try {
      const payload = {
        requestId: request.id,
        serviceProvider: scheduleData.providerName,
        scheduledDate: scheduleData.scheduledDate,
        notes: scheduleData.notes,
        scheduledBy: 'Driver'
      };

      await this.http.put(`${this.apiUrl}/MechanicalRequests/${request.id}/schedule`, payload).toPromise();

      this.snackBar.open(
        `Service scheduled with ${scheduleData.providerName} on ${new Date(scheduleData.scheduledDate).toLocaleDateString()} at ${scheduleData.timeSlot}`, 
        'Close', 
        { duration: 5000 }
      );
      await this.loadMyRequests();

    } catch (error) {
      console.error('Error scheduling service:', error);
      this.snackBar.open('Error scheduling service', 'Close', { duration: 3000 });
    }
  }

  editRequest(request: any) {
    // Populate the form with request data
    this.newRequest = {
      vehicleId: request.vehicleId,
      category: request.category,
      priority: request.priority,
      description: request.description,
      location: request.location,
      preferredTime: request.preferredTime ? new Date(request.preferredTime) : null,
      callOutRequired: request.callOutRequired
    };

    // Store the request ID for updating
    this.editingRequestId = request.id;

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });

    this.snackBar.open('Editing request - update the form and submit', 'Close', { duration: 3000 });
  }

  cancelEdit() {
    // Reset form
    this.newRequest = {
      vehicleId: null,
      category: '',
      priority: 'Medium',
      description: '',
      location: '',
      preferredTime: null,
      callOutRequired: false
    };
    
    this.editingRequestId = null;
    
    this.snackBar.open('Edit cancelled', 'Close', { duration: 2000 });
  }

  async deleteRequest(request: any) {
    if (!confirm(`Are you sure you want to delete this ${request.category} request?`)) {
      return;
    }

    try {
      await this.http.delete(`${this.apiUrl}/MechanicalRequests/${request.id}`).toPromise();

      this.snackBar.open('Request deleted successfully', 'Close', { duration: 3000 });
      await this.loadMyRequests();
    } catch (error: any) {
      console.error('Error deleting request:', error);
      this.snackBar.open(error.error?.message || 'Error deleting request', 'Close', { duration: 5000 });
    }
  }

  async markAsComplete(request: any) {
    const dialogRef = this.dialog.open(CompleteServiceDialogComponent, {
      width: '500px',
      data: { request }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          const payload = {
            completedDate: result.completedDate || new Date(),
            completionNotes: result.completionNotes || 'Service completed',
            mileageAtService: result.mileageAtService || null,
            serviceCost: result.serviceCost || null,
            invoiceNumber: result.invoiceNumber || null,
            serviceProviderRating: result.serviceProviderRating || null
          };

          await this.http.put(`${this.apiUrl}/MechanicalRequests/${request.id}/complete`, payload).toPromise();

          this.snackBar.open('Service marked as completed and recorded in maintenance history!', 'Close', { duration: 3000 });
          await this.loadMyRequests();
        } catch (error: any) {
          console.error('Error completing request:', error);
          this.snackBar.open(error.error?.message || 'Error completing request', 'Close', { duration: 5000 });
        }
      }
    });
  }
}

// Complete Service Dialog Component
@Component({
  selector: 'complete-service-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>Complete Service</h2>
    <mat-dialog-content>
      <form #completeForm="ngForm">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Completion Date</mat-label>
          <input matInput [matDatepicker]="picker" [(ngModel)]="data.completedDate" name="completedDate" required>
          <mat-datepicker-toggle matSuffix [for]="picker"></mat-datepicker-toggle>
          <mat-datepicker #picker></mat-datepicker>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Current Mileage/Odometer</mat-label>
          <input matInput type="number" [(ngModel)]="data.mileageAtService" name="mileageAtService" placeholder="e.g., 85000">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Service Cost (R)</mat-label>
          <input matInput type="number" step="0.01" [(ngModel)]="data.serviceCost" name="serviceCost" placeholder="e.g., 2500.00">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Invoice Number</mat-label>
          <input matInput [(ngModel)]="data.invoiceNumber" name="invoiceNumber" placeholder="e.g., INV-12345">
        </mat-form-field>

        <div class="rating-section">
          <label class="rating-label">Rate Service Provider:</label>
          <div class="star-rating">
            <mat-icon 
              *ngFor="let star of [1,2,3,4,5]" 
              class="star-icon"
              [class.filled]="star <= (data.serviceProviderRating || 0)"
              (click)="setRating(star)">
              {{ star <= (data.serviceProviderRating || 0) ? 'star' : 'star_border' }}
            </mat-icon>
          </div>
          <span class="rating-text" *ngIf="data.serviceProviderRating">{{ getRatingText(data.serviceProviderRating) }}</span>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Completion Notes</mat-label>
          <textarea 
            matInput 
            [(ngModel)]="data.completionNotes" 
            name="completionNotes"
            rows="4"
            placeholder="Describe the work completed, parts replaced, etc.">
          </textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button 
        mat-raised-button 
        color="primary" 
        [disabled]="!completeForm.valid"
        (click)="onComplete()">
        Mark Complete
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    mat-dialog-content {
      min-width: 400px;
      padding: 20px;
    }

    textarea {
      min-height: 80px;
    }

    .rating-section {
      margin-bottom: 20px;
    }

    .rating-label {
      display: block;
      font-size: 14px;
      color: rgba(0, 0, 0, 0.6);
      margin-bottom: 8px;
    }

    .star-rating {
      display: flex;
      gap: 4px;
    }

    .star-icon {
      cursor: pointer;
      color: #ccc;
      transition: color 0.2s;
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .star-icon.filled {
      color: #ffa000;
    }

    .star-icon:hover {
      color: #ffa000;
      transform: scale(1.1);
    }

    .rating-text {
      display: block;
      margin-top: 8px;
      font-size: 14px;
      color: #666;
      font-style: italic;
    }
  `]
})
export class CompleteServiceDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<CompleteServiceDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    // Initialize with current date
    this.data.completedDate = new Date();
    // Initialize rating if not set
    if (!this.data.serviceProviderRating) {
      this.data.serviceProviderRating = 0;
    }
  }

  setRating(rating: number): void {
    this.data.serviceProviderRating = rating;
  }

  getRatingText(rating: number): string {
    const texts = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];
    return texts[rating] || '';
  }

  onComplete(): void {
    this.dialogRef.close(this.data);
  }
}
