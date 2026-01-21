import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MzansiFleetLogoComponent } from '../shared/mzansi-fleet-logo.component';

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    MatChipsModule,
    MatBadgeModule,
    MatSidenavModule,
    MatListModule,
    MatMenuModule,
    MatDividerModule,
    MatToolbarModule,
    MzansiFleetLogoComponent
  ],
  templateUrl: './driver-dashboard.component.html',
  styleUrls: ['./driver-dashboard.component.scss']
})
export class DriverDashboardComponent implements OnInit {
  userData: any;
  driverProfile: any = null;
  assignedVehicle: any = null;
  loading = true;
  loadingRequests = false;
  sidebarCollapsed = false;
  unreadNotifications = 0;
  tomorrowMaintenanceCount = 0;
  totalEarnings = 0;
  totalExpenses = 0;
  profit = 0;
  earningsCount = 0;
  expensesCount = 0;
  currentMonthName = '';
  maintenanceRequests: any[] = [];
  pendingRequestsCount = 0;
  approvedRequestsCount = 0;
  scheduledRequestsCount = 0;
  private apiUrl = 'http://localhost:5000/api/Identity';

  menuItems = [
    { title: 'Overview', icon: 'dashboard', route: 'overview' },
    { title: 'My Vehicle', icon: 'directions_car', route: 'vehicle' },
    { title: 'Earnings', icon: 'attach_money', route: 'earnings' },
    { title: 'Expenses', icon: 'receipt', route: 'expenses' },
    { title: 'Maintenance', icon: 'build', route: 'maintenance', badge: '0' },
    { title: 'Trip History', icon: 'map', route: 'trips' }
  ];

  topMenuItems = [
    { title: 'Go Online', icon: 'play_circle', badge: '', action: 'toggle-status' },
    { title: 'Quick Earning', icon: 'add_circle', badge: '', action: 'add-earning' }
  ];

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private http: HttpClient,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
    }
    this.loadDriverProfile();
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onMenuItemClick(): void {
    if (window.innerWidth < 768) {
      this.sidebarCollapsed = true;
    }
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }

  async loadDriverProfile() {
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      this.router.navigate(['/login']);
      return;
    }

    try {
      const user = JSON.parse(userStr);
      if (user?.role !== 'Driver') {
        this.router.navigate(['/login']);
        return;
      }

      const drivers: any = await this.http.get(`${this.apiUrl}/driverprofiles`).toPromise();
      this.driverProfile = drivers.find((d: any) => d.userId === user.userId);

      if (this.driverProfile) {
        await this.loadDriverVehicles(user.id);
      }
    } catch (error) {
      console.error('Error loading driver profile:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadDriverVehicles(driverId: string) {
    try {
      const allVehicles: any = await this.http.get('http://localhost:5000/api/Vehicles').toPromise();
      const driverVehicles = allVehicles.filter((v: any) => v.driverId === driverId);
      
      if (driverVehicles.length > 0) {
        this.assignedVehicle = driverVehicles[0];
        await this.loadFinancialSummary(this.assignedVehicle.id);
        await this.loadMaintenanceRequests(driverVehicles);
      }
    } catch (error) {
      console.error('Error loading driver vehicles:', error);
    }
  }

  async loadMaintenanceRequests(vehicles: any[]) {
    this.loadingRequests = true;
    try {
      const allRequests: any = await this.http.get('http://localhost:5000/api/MechanicalRequests').toPromise();
      
      if (!Array.isArray(allRequests)) {
        this.maintenanceRequests = [];
        return;
      }
      
      this.maintenanceRequests = allRequests
        .filter((r: any) => vehicles.some(v => v.id === r.vehicleId))
        .map((r: any) => {
          const vehicle = vehicles.find(v => v.id === r.vehicleId);
          return {
            ...r,
            vehicleName: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.registration})` : 'Unknown',
            status: r.state || 'Pending',
            createdAt: r.createdAt || new Date(),
            category: r.category || 'General'
          };
        })
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      this.pendingRequestsCount = this.maintenanceRequests.filter(r => r.status === 'Pending').length;
      this.approvedRequestsCount = this.maintenanceRequests.filter(r => r.status === 'Approved').length;
      this.scheduledRequestsCount = this.maintenanceRequests.filter(r => r.status === 'Scheduled').length;

      this.tomorrowMaintenanceCount = this.countTomorrowMaintenance();
      
      const maintenanceItem = this.menuItems.find(item => item.route === 'maintenance');
      if (maintenanceItem && this.tomorrowMaintenanceCount > 0) {
        maintenanceItem.badge = this.tomorrowMaintenanceCount.toString();
      }
    } catch (error) {
      console.error('Error loading maintenance requests:', error);
      this.maintenanceRequests = [];
    } finally {
      this.loadingRequests = false;
    }
  }

  countTomorrowMaintenance(): number {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    return this.maintenanceRequests.filter(r => {
      if (r.status !== 'Scheduled' || !r.scheduledDate) return false;

      const scheduledDate = new Date(r.scheduledDate);
      scheduledDate.setHours(0, 0, 0, 0);

      return scheduledDate >= tomorrow && scheduledDate < dayAfterTomorrow;
    }).length;
  }

  viewScheduledAppointments() {
    const scheduledRequests = this.maintenanceRequests.filter(r => r.status === 'Scheduled');
    
    this.dialog.open(ScheduledAppointmentsDialogComponent, {
      width: '900px',
      maxHeight: '90vh',
      data: {
        appointments: scheduledRequests,
        vehicleName: this.assignedVehicle?.vehicleName || 'Unknown Vehicle'
      }
    });
  }

  async loadFinancialSummary(vehicleId: string) {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      
      this.currentMonthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
      
      const earnings: any = await this.http.get(
        `http://localhost:5000/api/VehicleEarnings/vehicle/${vehicleId}/period?startDate=${startDateStr}&endDate=${endDateStr}`
      ).toPromise();
      this.earningsCount = earnings?.length || 0;
      this.totalEarnings = earnings?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
      
      const expenses: any = await this.http.get(
        `http://localhost:5000/api/VehicleExpenses/vehicle/${vehicleId}/period?startDate=${startDateStr}&endDate=${endDateStr}`
      ).toPromise();
      this.expensesCount = expenses?.length || 0;
      this.totalExpenses = expenses?.reduce((sum: number, e: any) => sum + (e.amount || 0), 0) || 0;
      
      this.profit = this.totalEarnings - this.totalExpenses;
    } catch (error) {
      console.error('Error loading financial summary:', error);
    }
  }

  openAddEarningDialog() {
    const dialogRef = this.dialog.open(AddEarningDialogComponent, {
      width: '500px',
      data: { vehicleId: this.assignedVehicle?.id }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Earning added successfully!', 'Close', { duration: 3000 });
        if (this.assignedVehicle?.id) {
          this.loadFinancialSummary(this.assignedVehicle.id);
        }
      }
    });
  }

  async toggleAvailability() {
    if (!this.driverProfile) return;

    this.loading = true;
    try {
      const updatedProfile = {
        ...this.driverProfile,
        isAvailable: !this.driverProfile.isAvailable
      };

      await this.http.put(`${this.apiUrl}/driverprofiles/${this.driverProfile.id}`, updatedProfile).toPromise();
      this.driverProfile.isAvailable = !this.driverProfile.isAvailable;
      
      this.snackBar.open(
        this.driverProfile.isAvailable ? 'You are now online' : 'You are now offline',
        'Close',
        { duration: 3000 }
      );
    } catch (error) {
      console.error('Error updating availability:', error);
      this.snackBar.open('Failed to update availability', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  isServiceDueSoon(nextServiceDate: string | null | undefined): boolean {
    if (!nextServiceDate) return false;
    
    const serviceDate = new Date(nextServiceDate);
    const today = new Date();
    const daysUntilService = Math.floor((serviceDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysUntilService <= 7;
  }
}

// Add Earning Dialog Component

@Component({
  selector: 'add-earning-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule],
  template: `
    <h2 mat-dialog-title>Add Vehicle Earning</h2>
    <mat-dialog-content>
      <form #earningForm="ngForm">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Amount (R)</mat-label>
          <input matInput type="number" [(ngModel)]="earning.amount" name="amount" required min="0">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Source</mat-label>
          <mat-select [(ngModel)]="earning.source" name="source" required>
            <mat-option value="Trip">Trip</mat-option>
            <mat-option value="Delivery">Delivery</mat-option>
            <mat-option value="Bonus">Bonus</mat-option>
            <mat-option value="Other">Other</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput [(ngModel)]="earning.description" name="description" rows="3"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Date</mat-label>
          <input matInput [matDatepicker]="earningPicker" [(ngModel)]="earning.date" name="date" required
                 [min]="minDate" [max]="maxDate">
          <mat-datepicker-toggle matIconSuffix [for]="earningPicker"></mat-datepicker-toggle>
          <mat-datepicker #earningPicker></mat-datepicker>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="!earningForm.valid || loading">
        {{ loading ? 'Saving...' : 'Add Earning' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; margin-bottom: 15px; }
  `]
})
export class AddEarningDialogComponent {
  earning: any = {
    amount: null,
    source: '',
    description: '',
    date: new Date()
  };
  loading = false;
  minDate: Date;
  maxDate: Date;

  constructor(
    private dialogRef: MatDialogRef<AddEarningDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    // Set min date to first day of current month
    const now = new Date();
    this.minDate = new Date(now.getFullYear(), now.getMonth(), 1);
    // Set max date to today
    this.maxDate = new Date();
  }

  async onSubmit() {
    if (!this.data.vehicleId) {
      this.snackBar.open('No vehicle assigned', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    try {
      const payload = {
        vehicleId: this.data.vehicleId,
        amount: this.earning.amount,
        source: this.earning.source,
        description: this.earning.description,
        date: this.earning.date instanceof Date ? this.earning.date.toISOString().split('T')[0] : this.earning.date
      };

      await this.http.post('http://localhost:5000/api/VehicleEarnings', payload).toPromise();
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error adding earning:', error);
      this.snackBar.open('Failed to add earning', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}

// Add Expense Dialog Component
@Component({
  selector: 'add-expense-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule, MatDatepickerModule, MatNativeDateModule],
  template: `
    <h2 mat-dialog-title>Add Vehicle Expense</h2>
    <mat-dialog-content>
      <form #expenseForm="ngForm">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Amount (R)</mat-label>
          <input matInput type="number" [(ngModel)]="expense.amount" name="amount" required min="0">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Category</mat-label>
          <mat-select [(ngModel)]="expense.category" name="category" required>
            <mat-option value="Fuel">Fuel</mat-option>
            <mat-option value="Maintenance">Maintenance</mat-option>
            <mat-option value="Repairs">Repairs</mat-option>
            <mat-option value="Insurance">Insurance</mat-option>
            <mat-option value="Toll">Toll</mat-option>
            <mat-option value="Other">Other</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput [(ngModel)]="expense.description" name="description" rows="3"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Date</mat-label>
          <input matInput [matDatepicker]="expensePicker" [(ngModel)]="expense.date" name="date" required
                 [min]="minDate" [max]="maxDate">
          <mat-datepicker-toggle matIconSuffix [for]="expensePicker"></mat-datepicker-toggle>
          <mat-datepicker #expensePicker></mat-datepicker>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="!expenseForm.valid || loading">
        {{ loading ? 'Saving...' : 'Add Expense' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; margin-bottom: 15px; }
  `]
})
export class AddExpenseDialogComponent {
  expense: any = {
    amount: null,
    category: '',
    description: '',
    date: new Date()
  };
  loading = false;
  minDate: Date;
  maxDate: Date;

  constructor(
    private dialogRef: MatDialogRef<AddExpenseDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    // Set min date to first day of current month
    const now = new Date();
    this.minDate = new Date(now.getFullYear(), now.getMonth(), 1);
    // Set max date to today
    this.maxDate = new Date();
  }

  async onSubmit() {
    if (!this.data.vehicleId) {
      this.snackBar.open('No vehicle assigned', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    try {
      const payload = {
        vehicleId: this.data.vehicleId,
        amount: this.expense.amount,
        category: this.expense.category,
        description: this.expense.description,
        date: this.expense.date instanceof Date ? this.expense.date.toISOString().split('T')[0] : this.expense.date
      };

      await this.http.post('http://localhost:5000/api/VehicleExpenses', payload).toPromise();
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error adding expense:', error);
      this.snackBar.open('Failed to add expense', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}

// Service Request Dialog Component
@Component({
  selector: 'service-request-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatSelectModule],
  template: `
    <h2 mat-dialog-title>Request Service/Maintenance</h2>
    <mat-dialog-content>
      <form #serviceForm="ngForm">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Category</mat-label>
          <mat-select [(ngModel)]="request.category" name="category" required>
            <mat-option value="Engine">Engine</mat-option>
            <mat-option value="Brakes">Brakes</mat-option>
            <mat-option value="Tires">Tires</mat-option>
            <mat-option value="Oil Change">Oil Change</mat-option>
            <mat-option value="Transmission">Transmission</mat-option>
            <mat-option value="Electrical">Electrical</mat-option>
            <mat-option value="Body Work">Body Work</mat-option>
            <mat-option value="Other">Other</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Location</mat-label>
          <input matInput [(ngModel)]="request.location" name="location" required 
            placeholder="Where is the vehicle located?">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Description</mat-label>
          <textarea matInput [(ngModel)]="request.description" name="description" rows="4" required 
            placeholder="Describe the issue or service needed..."></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Preferred Time</mat-label>
          <input matInput type="datetime-local" [(ngModel)]="request.preferredTime" name="preferredTime">
        </mat-form-field>

        <div class="full-width" style="margin-bottom: 15px;">
          <label>
            <input type="checkbox" [(ngModel)]="request.callOutRequired" name="callOutRequired">
            Call-out service required
          </label>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="accent" (click)="onSubmit()" [disabled]="!serviceForm.valid || loading">
        {{ loading ? 'Submitting...' : 'Submit Request' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .full-width { width: 100%; margin-bottom: 15px; }
  `]
})
export class ServiceRequestDialogComponent {
  request: any = {
    category: '',
    location: '',
    description: '',
    preferredTime: null,
    callOutRequired: false
  };
  loading = false;

  constructor(
    private dialogRef: MatDialogRef<ServiceRequestDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  async onSubmit() {
    if (!this.data.vehicleId) {
      this.snackBar.open('No vehicle assigned', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    try {
      const payload = {
        ownerId: this.data.ownerId || '00000000-0000-0000-0000-000000000000',
        vehicleId: this.data.vehicleId,
        category: this.request.category,
        location: this.request.location,
        description: this.request.description,
        mediaUrls: '',
        preferredTime: this.request.preferredTime ? new Date(this.request.preferredTime).toISOString() : null,
        callOutRequired: this.request.callOutRequired,
        state: 'OPEN'
      };

      await this.http.post('http://localhost:5000/api/MechanicalRequests', payload).toPromise();
      this.dialogRef.close(true);
    } catch (error) {
      console.error('Error submitting service request:', error);
      this.snackBar.open('Failed to submit request', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  onCancel() {
    this.dialogRef.close();
  }
}

// Scheduled Appointments Dialog Component
@Component({
  selector: 'scheduled-appointments-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>event</mat-icon>
      Scheduled Maintenance Appointments
    </h2>
    <mat-dialog-content>
      <div class="appointments-container">
        <p class="subtitle" *ngIf="data.appointments.length > 0">
          You have {{ data.appointments.length }} scheduled appointment{{ data.appointments.length > 1 ? 's' : '' }}
        </p>

        <div *ngIf="data.appointments.length === 0" class="empty-state">
          <mat-icon>event_available</mat-icon>
          <h3>No Scheduled Appointments</h3>
          <p>You don't have any maintenance appointments scheduled at the moment.</p>
        </div>

        <div *ngIf="data.appointments.length > 0" class="appointments-list">
          <div *ngFor="let appointment of data.appointments" class="appointment-card">
            <div class="appointment-header">
              <div class="appointment-title">
                <mat-icon>build</mat-icon>
                <h3>{{ appointment.category || 'Maintenance' }}</h3>
              </div>
              <mat-chip class="status-chip">{{ appointment.status }}</mat-chip>
            </div>

            <div class="appointment-details">
              <div class="detail-row">
                <mat-icon>directions_car</mat-icon>
                <span><strong>Vehicle:</strong> {{ appointment.vehicleName || data.vehicleName }}</span>
              </div>

              <div class="detail-row" *ngIf="appointment.scheduledDate">
                <mat-icon>calendar_today</mat-icon>
                <span><strong>Scheduled:</strong> {{ appointment.scheduledDate | date: 'EEEE, MMMM d, yyyy' }}</span>
              </div>

              <div class="detail-row" *ngIf="appointment.serviceProvider">
                <mat-icon>engineering</mat-icon>
                <span><strong>Service Provider:</strong> {{ appointment.serviceProvider }}</span>
              </div>

              <div class="detail-row" *ngIf="appointment.location">
                <mat-icon>location_on</mat-icon>
                <span><strong>Location:</strong> {{ appointment.location }}</span>
              </div>

              <div class="detail-row" *ngIf="appointment.description">
                <mat-icon>description</mat-icon>
                <span><strong>Description:</strong> {{ appointment.description }}</span>
              </div>

              <div class="detail-row" *ngIf="appointment.estimatedCost">
                <mat-icon>attach_money</mat-icon>
                <span><strong>Estimated Cost:</strong> R{{ appointment.estimatedCost }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-height: 300px;
      max-height: 70vh;
      overflow-y: auto;
    }

    .appointments-container {
      padding: 10px 0;
    }

    .subtitle {
      color: #666;
      font-size: 14px;
      margin-bottom: 20px;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #999;
    }

    .empty-state mat-icon {
      font-size: 72px;
      width: 72px;
      height: 72px;
      color: #ddd;
      margin-bottom: 20px;
    }

    .empty-state h3 {
      font-size: 20px;
      font-weight: 500;
      color: #666;
      margin: 10px 0;
    }

    .empty-state p {
      font-size: 14px;
      color: #999;
    }

    .appointments-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .appointment-card {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 16px;
      background: #fafafa;
      transition: all 0.2s ease;
    }

    .appointment-card:hover {
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      background: white;
    }

    .appointment-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding-bottom: 12px;
      border-bottom: 1px solid #e0e0e0;
    }

    .appointment-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .appointment-title mat-icon {
      color: #ff9800;
    }

    .appointment-title h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      color: #333;
    }

    .status-chip {
      background: #4caf50 !important;
      color: white !important;
      font-weight: 600;
    }

    .appointment-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .detail-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      font-size: 14px;
      color: #666;
    }

    .detail-row mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #999;
      flex-shrink: 0;
      margin-top: 2px;
    }

    .detail-row span {
      flex: 1;
    }

    .detail-row strong {
      color: #333;
      margin-right: 4px;
    }

    mat-dialog-actions {
      padding: 16px 24px;
    }
  `]
})
export class ScheduledAppointmentsDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}
}

