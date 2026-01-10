import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../../environments/environment';

interface Trip {
  id: string;
  vehicleId: string;
  routeId: string;
  driverId: string;
  tripDate: string;
  departureTime: string;
  arrivalTime?: string;
  passengers: Passenger[];
  passengerCount: number;
  totalFare: number;
  notes?: string;
  status: string;
  createdAt: string;
  passengerListFileName?: string;
  passengerListFileData?: string;
}

interface Passenger {
  id: string;
  tripId: string;
  name: string;
  contactNumber?: string;
  nextOfKin?: string;
  nextOfKinContact?: string;
  address?: string;
  destination?: string;
  fareAmount: number;
}

interface Vehicle {
  id: string;
  registration: string;
  make: string;
  model: string;
}

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  licenseNumber: string;
}

interface Route {
  id: string;
  name: string;
  origin: string;
  destination: string;
}

interface VehicleEarnings {
  id: string;
  vehicleId: string;
  date: string;
  amount: number;
  source: string;
  description: string;
}

interface VehicleExpense {
  id: string;
  vehicleId: string;
  date: string;
  amount: number;
  category: string;
  description: string;
}

@Component({
  selector: 'app-owner-trips',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatDialogModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatExpansionModule,
    MatChipsModule,
    MatTooltipModule,
    MatSelectModule
  ],
  templateUrl: './owner-trips.component.html',
  styleUrls: ['./owner-trips.component.scss']
})
export class OwnerTripsComponent implements OnInit {
  trips: Trip[] = [];
  filteredTrips: Trip[] = [];
  vehicles: Vehicle[] = [];
  drivers: Driver[] = [];
  routes: Route[] = [];
  loading = false;
  filterForm!: FormGroup;
  
  displayedColumns: string[] = ['tripDate', 'vehicle', 'driver', 'route', 'passengers', 'totalFare', 'status', 'actions'];
  
  // Summary stats
  totalTrips = 0;
  totalEarnings = 0;
  totalPassengers = 0;
  avgFarePerTrip = 0;

  constructor(
    private http: HttpClient,
    private fb: FormBuilder,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeFilterForm();
    this.loadData();
  }

  initializeFilterForm(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    this.filterForm = this.fb.group({
      startDate: [firstDayOfMonth],
      endDate: [today],
      vehicleId: [''],
      routeId: ['']
    });

    // Watch for filter changes
    this.filterForm.valueChanges.subscribe(() => {
      this.applyFilters();
    });
  }

  async loadData(): Promise<void> {
    this.loading = true;
    try {
      // Get owner's vehicles first
      const vehiclesData = await this.http.get<Vehicle[]>(`${environment.apiUrl}/Vehicles`).toPromise();
      this.vehicles = vehiclesData || [];
      
      // Get vehicle IDs to filter trips
      const vehicleIds = this.vehicles.map(v => v.id).join(',');
      
      // Load trips and routes
      const [tripsData, routesData] = await Promise.all([
        this.http.get<Trip[]>(`${environment.apiUrl}/TripDetails?vehicleIds=${vehicleIds}`).toPromise(),
        this.http.get<Route[]>(`${environment.apiUrl}/Routes`).toPromise()
      ]);

      this.trips = tripsData || [];
      this.routes = routesData || [];
      
      // Get unique driver IDs from trips
      const uniqueDriverIds = [...new Set(this.trips.map(t => t.driverId).filter(id => id))];
      
      console.log('Unique driver IDs from trips:', uniqueDriverIds);
      
      // Load each driver by their ID using the Drivers endpoint
      const driverPromises = uniqueDriverIds.map(driverId => 
        this.http.get<any>(`${environment.apiUrl}/Drivers/${driverId}`).toPromise()
          .catch(err => {
            console.warn(`Failed to load driver ${driverId}:`, err);
            return null;
          })
      );
      
      const driversData = await Promise.all(driverPromises);
      
      // Map loaded drivers to the correct format
      this.drivers = driversData
        .filter(driver => driver !== null)
        .map((driver: any) => ({
          id: driver.id,
          firstName: driver.name || driver.firstName || `${driver.user?.firstName || ''} ${driver.user?.lastName || ''}`.trim() || 'Unknown',
          lastName: '',
          licenseNumber: driver.licenseNumber || driver.category || ''
        }));

      console.log('Loaded drivers:', this.drivers);
      console.log('Sample trips with driver IDs:', this.trips.slice(0, 3).map(t => ({ 
        tripId: t.id, 
        driverId: t.driverId,
        matchedDriver: this.drivers.find(d => d.id === t.driverId)
      })));

      this.applyFilters();
      this.calculateStats();
    } catch (error) {
      console.error('Error loading trips data:', error);
      this.snackBar.open('Failed to load trips data', 'Close', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  applyFilters(): void {
    const { startDate, endDate, vehicleId, routeId } = this.filterForm.value;
    
    this.filteredTrips = this.trips.filter(trip => {
      const tripDate = new Date(trip.tripDate);
      const matchesDate = (!startDate || tripDate >= startDate) && 
                          (!endDate || tripDate <= endDate);
      const matchesVehicle = !vehicleId || trip.vehicleId === vehicleId;
      const matchesRoute = !routeId || trip.routeId === routeId;
      return matchesDate && matchesVehicle && matchesRoute;
    });

    this.calculateStats();
  }

  calculateStats(): void {
    this.totalTrips = this.filteredTrips.length;
    this.totalEarnings = this.filteredTrips.reduce((sum, trip) => sum + trip.totalFare, 0);
    this.totalPassengers = this.filteredTrips.reduce((sum, trip) => sum + trip.passengerCount, 0);
    this.avgFarePerTrip = this.totalTrips > 0 ? this.totalEarnings / this.totalTrips : 0;
  }

  getVehicleName(vehicleId: string): string {
    const vehicle = this.vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.registration} - ${vehicle.make} ${vehicle.model}` : 'Unknown Vehicle';
  }

  getDriverName(driverId: string): string {
    if (!driverId) {
      return 'No Driver Assigned';
    }
    const driver = this.drivers.find(d => d.id === driverId);
    if (!driver) {
      console.warn('Driver not found for ID:', driverId);
      return 'Unknown Driver';
    }
    const fullName = `${driver.firstName} ${driver.lastName}`.trim();
    return fullName || driver.firstName || 'Unknown Driver';
  }

  getRouteName(routeId: string): string {
    const route = this.routes.find(r => r.id === routeId);
    return route ? `${route.name} (${route.origin} → ${route.destination})` : 'Unknown Route';
  }

  viewTripDetails(trip: Trip): void {
    // Load expenses for this trip's vehicle and date
    const tripDate = new Date(trip.tripDate);
    const startDate = tripDate.toISOString().split('T')[0];
    const endDate = tripDate.toISOString().split('T')[0];
    
    this.http.get<VehicleExpense[]>(
      `${environment.apiUrl}/VehicleExpenses/vehicle/${trip.vehicleId}/period?startDate=${startDate}&endDate=${endDate}`
    ).subscribe({
      next: (expenses) => {
        this.dialog.open(TripDetailsDialogComponent, {
          width: '900px',
          maxHeight: '90vh',
          data: {
            trip,
            vehicleName: this.getVehicleName(trip.vehicleId),
            driverName: this.getDriverName(trip.driverId),
            routeName: this.getRouteName(trip.routeId),
            expenses: expenses || []
          }
        });
      },
      error: (error) => {
        console.error('Error loading expenses:', error);
        // Show dialog anyway without expenses
        this.dialog.open(TripDetailsDialogComponent, {
          width: '900px',
          maxHeight: '90vh',
          data: {
            trip,
            vehicleName: this.getVehicleName(trip.vehicleId),
            driverName: this.getDriverName(trip.driverId),
            routeName: this.getRouteName(trip.routeId),
            expenses: []
          }
        });
      }
    });
  }

  exportToCSV(): void {
    const headers = ['Date', 'Vehicle', 'Driver', 'Route', 'Passengers', 'Total Fare', 'Status'];
    const rows = this.filteredTrips.map(trip => [
      new Date(trip.tripDate).toLocaleDateString(),
      this.getVehicleName(trip.vehicleId),
      this.getDriverName(trip.driverId),
      this.getRouteName(trip.routeId),
      trip.passengerCount.toString(),
      trip.totalFare.toFixed(2),
      trip.status
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trips_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
    
    this.snackBar.open('Trips exported successfully', 'Close', { duration: 2000 });
  }
}

// Trip Details Dialog Component
@Component({
  selector: 'app-trip-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatCardModule,
    MatChipsModule,
    MatTooltipModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>trip_origin</mat-icon>
      Trip Details
    </h2>
    <mat-dialog-content>
      <!-- Trip Info Card -->
      <mat-card class="mb-3">
        <mat-card-header>
          <mat-icon mat-card-avatar>info</mat-icon>
          <mat-card-title>Trip Information</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="info-grid">
            <div class="info-item">
              <span class="label">Date:</span>
              <span class="value">{{ data.trip.tripDate | date:'medium' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Vehicle:</span>
              <span class="value">{{ data.vehicleName }}</span>
            </div>
            <div class="info-item">
              <span class="label">Driver:</span>
              <span class="value">{{ data.driverName }}</span>
            </div>
            <div class="info-item">
              <span class="label">Route:</span>
              <span class="value">{{ data.routeName }}</span>
            </div>
            <div class="info-item">
              <span class="label">Departure:</span>
              <span class="value">{{ data.trip.departureTime }}</span>
            </div>
            <div class="info-item">
              <span class="label">Arrival:</span>
              <span class="value">{{ data.trip.arrivalTime || 'N/A' }}</span>
            </div>
            <div class="info-item">
              <span class="label">Status:</span>
              <mat-chip [class.status-completed]="data.trip.status === 'Completed'"
                        [class.status-in-progress]="data.trip.status === 'In Progress'">
                {{ data.trip.status }}
              </mat-chip>
            </div>
          </div>
          <div *ngIf="data.trip.notes" class="notes">
            <strong>Notes:</strong> {{ data.trip.notes }}
          </div>
        </mat-card-content>
      </mat-card>

      <!-- Passengers Card -->
      <mat-card class="mb-3">
        <mat-card-header>
          <mat-icon mat-card-avatar>people</mat-icon>
          <mat-card-title>Passengers ({{ data.trip.passengers.length }})</mat-card-title>
          <button mat-icon-button *ngIf="data.trip.passengerListFileName" 
                  (click)="downloadPassengerList()" 
                  matTooltip="Download Passenger List">
            <mat-icon>download</mat-icon>
          </button>
        </mat-card-header>
        <mat-card-content>
          <div *ngIf="data.trip.passengerListFileName" class="file-info">
            <mat-icon>attach_file</mat-icon>
            <span>{{ data.trip.passengerListFileName }}</span>
          </div>
          <table mat-table [dataSource]="data.trip.passengers" class="passengers-table">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Name</th>
              <td mat-cell *matCellDef="let passenger">{{ passenger.name }}</td>
            </ng-container>

            <ng-container matColumnDef="contact">
              <th mat-header-cell *matHeaderCellDef>Contact</th>
              <td mat-cell *matCellDef="let passenger">{{ passenger.contactNumber || 'N/A' }}</td>
            </ng-container>

            <ng-container matColumnDef="destination">
              <th mat-header-cell *matHeaderCellDef>Destination</th>
              <td mat-cell *matCellDef="let passenger">{{ passenger.destination || 'N/A' }}</td>
            </ng-container>

            <ng-container matColumnDef="fare">
              <th mat-header-cell *matHeaderCellDef class="text-right">Fare</th>
              <td mat-cell *matCellDef="let passenger" class="text-right">
                R{{ passenger.fareAmount.toFixed(2) }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="passengerColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: passengerColumns;"></tr>
          </table>
        </mat-card-content>
      </mat-card>

      <!-- Expenses Card (if any) -->
      <mat-card class="mb-3" *ngIf="data.expenses && data.expenses.length > 0">
        <mat-card-header>
          <mat-icon mat-card-avatar color="warn">payment</mat-icon>
          <mat-card-title>Trip Expenses ({{ data.expenses.length }})</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <table mat-table [dataSource]="data.expenses" class="expenses-table">
            <ng-container matColumnDef="category">
              <th mat-header-cell *matHeaderCellDef>Category</th>
              <td mat-cell *matCellDef="let expense">{{ expense.category }}</td>
            </ng-container>

            <ng-container matColumnDef="description">
              <th mat-header-cell *matHeaderCellDef>Description</th>
              <td mat-cell *matCellDef="let expense">{{ expense.description }}</td>
            </ng-container>

            <ng-container matColumnDef="amount">
              <th mat-header-cell *matHeaderCellDef class="text-right">Amount</th>
              <td mat-cell *matCellDef="let expense" class="text-right expense-amount">
                R{{ expense.amount.toFixed(2) }}
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="expenseColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: expenseColumns;"></tr>
          </table>
        </mat-card-content>
      </mat-card>

      <!-- Financial Summary Card -->
      <mat-card>
        <mat-card-header>
          <mat-icon mat-card-avatar>account_balance_wallet</mat-icon>
          <mat-card-title>Financial Summary</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="financial-summary">
            <div class="summary-row">
              <span class="label">Total Passengers:</span>
              <span class="value">{{ data.trip.passengerCount }}</span>
            </div>
            <div class="summary-row earnings-row">
              <span class="label">Total Earnings:</span>
              <span class="value earnings">R{{ data.trip.totalFare.toFixed(2) }}</span>
            </div>
            <div class="summary-row expenses-row" *ngIf="totalExpenses > 0">
              <span class="label">Total Expenses:</span>
              <span class="value expenses">R{{ totalExpenses.toFixed(2) }}</span>
            </div>
            <div class="summary-row profit-row" *ngIf="totalExpenses > 0">
              <span class="label">Net Profit:</span>
              <span class="value profit">R{{ (data.trip.totalFare - totalExpenses).toFixed(2) }}</span>
            </div>
            <div class="summary-row" *ngIf="totalExpenses === 0">
              <span class="label">Average Fare per Passenger:</span>
              <span class="value">R{{ (data.trip.totalFare / data.trip.passengerCount).toFixed(2) }}</span>
            </div>
          </div>
        </mat-card-content>
      </mat-card>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
      <button mat-raised-button color="primary" (click)="printDetails()">
        <mat-icon>print</mat-icon> Print
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 16px;
      margin-bottom: 16px;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .label {
      font-weight: 500;
      color: #666;
      font-size: 0.875rem;
    }

    .value {
      font-size: 1rem;
    }

    .notes {
      margin-top: 16px;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 4px;
    }

    .passengers-table {
      width: 100%;
      margin-top: 16px;
    }

    .text-right {
      text-align: right;
    }

    .expense-amount {
      color: #f44336;
      font-weight: 500;
    }

    .expenses-table {
      width: 100%;
      margin-top: 16px;
    }

    .expenses-row .value.expenses {
      color: #f44336;
      font-weight: 600;
    }

    .profit-row {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 2px solid #e0e0e0;
      font-weight: 600;
    }

    .profit-row .value.profit {
      color: #4caf50;
      font-size: 1.2rem;
      font-weight: 700;
    }

    .financial-summary {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }

    .earnings-row {
      border-bottom: 2px solid #4caf50;
      font-weight: 600;
      font-size: 1.1rem;
    }

    .earnings {
      color: #4caf50;
    }

    .status-completed {
      background-color: #4caf50 !important;
      color: white !important;
    }

    .status-in-progress {
      background-color: #ff9800 !important;
      color: white !important;
    }

    .mb-3 {
      margin-bottom: 16px;
    }

    .file-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: #f5f5f5;
      border-radius: 4px;
      margin-bottom: 12px;
    }

    .file-info mat-icon {
      color: #666;
    }

    .download-btn {
      margin-left: auto;
    }

    mat-card-header {
      display: flex;
      align-items: center;
    }
  `]
})
export class TripDetailsDialogComponent {
  passengerColumns: string[] = ['name', 'contact', 'destination', 'fare'];
  expenseColumns: string[] = ['category', 'description', 'amount'];
  totalExpenses = 0;

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: {
      trip: Trip;
      vehicleName: string;
      driverName: string;
      routeName: string;
      expenses: VehicleExpense[];
    }
  ) {
    // Calculate total expenses
    this.totalExpenses = (data.expenses || []).reduce((sum, exp) => sum + exp.amount, 0);
  }

  downloadPassengerList(): void {
    if (this.data.trip.passengerListFileData && this.data.trip.passengerListFileName) {
      const link = document.createElement('a');
      link.href = this.data.trip.passengerListFileData;
      link.download = this.data.trip.passengerListFileName;
      link.click();
    }
  }

  printDetails(): void {
    window.print();
  }
}
