import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTableModule } from '@angular/material/table';
import { MatDividerModule } from '@angular/material/divider';
import { MatRadioModule } from '@angular/material/radio';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { environment } from '../../../../environments/environment';

interface Vehicle {
  id: string;
  registration: string;
  make: string;
  model: string;
}

interface Route {
  id: string;
  code: string;
  name: string;
  fareAmount: number;
  origin: string;
  destination: string;
  stops: string[];
}

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
  userCode: string;
  assignedVehicleId?: string;
}

@Component({
  selector: 'app-trip-details',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatTableModule,
    MatDividerModule,
    MatRadioModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatTabsModule,
    MatDialogModule
  ],
  templateUrl: './trip-details.component.html',
  styleUrls: ['./trip-details.component.scss']
})
export class TripDetailsComponent implements OnInit {
  tripForm!: FormGroup;
  dateFilterForm!: FormGroup;
  vehicles: Vehicle[] = [];
  routes: Route[] = [];
  drivers: Driver[] = [];
  loading = false;
  uploadingFile = false;
  passengerColumns: string[] = ['name', 'contact', 'nextOfKin', 'nextOfKinContact', 'address', 'destination', 'fare', 'actions'];
  routeDestinations: string[] = [];
  passengerEntryMode: 'manual' | 'file' = 'manual';
  selectedFile: File | null = null;
  passengerListFileName: string | null = null;
  passengerListFileData: string | null = null;
  
  // Historical trips properties
  historicalTrips: any[] = [];
  filteredHistoricalTrips: any[] = [];
  loadingHistory = false;
  historyColumns: string[] = ['tripDate', 'vehicle', 'route', 'driver', 'passengers', 'totalFare', 'actions'];
  
  // Revenue chart properties
  revenueChartData: any = null;
  revenueByVehicle: any[] = [];
  revenueByRoute: any[] = [];
  dailyRevenue: any[] = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private router: Router,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.initializeDateFilterForm();
    this.loadVehicles();
    this.loadRoutes();
    this.loadDrivers();
    this.loadHistoricalTrips();
  }

  initializeDateFilterForm(): void {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    this.dateFilterForm = this.fb.group({
      startDate: [thirtyDaysAgo],
      endDate: [today],
      vehicleId: [''],
      routeId: ['']
    });

    // Watch for filter changes
    this.dateFilterForm.valueChanges.subscribe(() => {
      this.applyDateFilter();
    });
  }

  initializeForm(): void {
    this.tripForm = this.fb.group({
      vehicleId: ['', Validators.required],
      routeId: ['', Validators.required],
      totalAmountCollected: [null],
      totalPassengerCount: [null],
      driverId: ['', Validators.required],
      tripDate: [new Date(), Validators.required],
      departureTime: [''],
      arrivalTime: [''],
      passengers: this.fb.array([this.createPassengerFormGroup()]),
      notes: ['']
    });

    // Auto-select driver when vehicle changes
    this.tripForm.get('vehicleId')?.valueChanges.subscribe(vehicleId => {
      this.onVehicleChange(vehicleId);
    });
  }

  createPassengerFormGroup(): FormGroup {
    // Name is only required if no file is uploaded
    const nameValidators = this.selectedFile ? [] : [Validators.required];
    
    return this.fb.group({
      name: ['', nameValidators],
      contactNumber: [''],
      nextOfKin: [''],
      nextOfKinContact: [''],
      address: [''],
      destination: [''],
      fareAmount: [0, [Validators.required, Validators.min(0)]]
    });
  }

  get passengers(): FormArray {
    return this.tripForm.get('passengers') as FormArray;
  }

  get totalFare(): number {
    // If manual amount is provided, use it; otherwise calculate from passengers
    const manualAmount = this.tripForm.get('totalAmountCollected')?.value;
    if (manualAmount !== null && manualAmount !== undefined && manualAmount !== '') {
      return parseFloat(manualAmount) || 0;
    }
    
    return this.passengers.controls.reduce((total, passenger) => {
      return total + (parseFloat(passenger.get('fareAmount')?.value) || 0);
    }, 0);
  }

  get passengerCount(): number {
    // If manual count is provided, use it; otherwise count from form array
    const manualCount = this.tripForm.get('totalPassengerCount')?.value;
    if (manualCount !== null && manualCount !== undefined && manualCount !== '') {
      return parseInt(manualCount) || 0;
    }
    return this.passengers.length;
  }

  addPassenger(): void {
    this.passengers.push(this.createPassengerFormGroup());
    
    // Scroll to the newly added passenger after a short delay to allow rendering
    setTimeout(() => {
      const newIndex = this.passengers.length - 1;
      const passengerElement = document.getElementById(`passenger-card-${newIndex}`);
      if (passengerElement) {
        passengerElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
        // Also add a highlight effect
        passengerElement.classList.add('highlight-new');
        setTimeout(() => {
          passengerElement.classList.remove('highlight-new');
        }, 2000);
      }
    }, 100);
  }

  removePassenger(index: number): void {
    this.passengers.removeAt(index);
  }

  setDefaultFare(): void {
    const routeId = this.tripForm.get('routeId')?.value;
    if (routeId) {
      const route = this.routes.find(r => r.id === routeId);
      if (route) {
        this.passengers.controls.forEach(passenger => {
          if (!passenger.get('fareAmount')?.value) {
            passenger.patchValue({ fareAmount: route.fareAmount });
          }
        });
      }
    }
  }

  onRouteChange(): void {
    this.setDefaultFare();
    this.updateRouteDestinations();
  }

  updateRouteDestinations(): void {
    const routeId = this.tripForm.get('routeId')?.value;
    if (routeId) {
      const route = this.routes.find(r => r.id === routeId);
      if (route) {
        this.routeDestinations = [
          route.origin,
          ...(route.stops || []),
          route.destination
        ].filter(d => d && d.trim() !== '');
      }
    }
  }

  onVehicleChange(vehicleId: string): void {
    if (vehicleId && this.drivers.length > 0) {
      console.log('Vehicle changed to:', vehicleId);
      
      // Find driver assigned to this vehicle
      const assignedDriver = this.drivers.find(d => d.assignedVehicleId === vehicleId);
      
      if (assignedDriver) {
        console.log('Found assigned driver:', assignedDriver);
        this.tripForm.patchValue({ driverId: assignedDriver.id }, { emitEvent: false });
        this.snackBar.open(
          `Driver ${assignedDriver.firstName} ${assignedDriver.lastName} auto-selected for this vehicle`,
          'OK',
          { duration: 3000 }
        );
      } else {
        console.log('No driver assigned to this vehicle');
        // Clear driver selection if no driver is assigned to the vehicle
        this.tripForm.patchValue({ driverId: '' }, { emitEvent: false });
        this.snackBar.open(
          'No driver assigned to this vehicle. Please select a driver manually.',
          'OK',
          { duration: 3000 }
        );
      }
    }
  }

  loadVehicles(): void {
    this.http.get<Vehicle[]>(`${environment.apiUrl}/Vehicles`)
      .subscribe({
        next: (vehicles) => {
          this.vehicles = vehicles;
        },
        error: (error) => {
          console.error('Error loading vehicles:', error);
          this.snackBar.open('Failed to load vehicles', 'Close', { duration: 3000 });
        }
      });
  }

  loadRoutes(): void {
    this.http.get<Route[]>(`${environment.apiUrl}/Routes`)
      .subscribe({
        next: (routes) => {
          this.routes = routes;
        },
        error: (error) => {
          console.error('Error loading routes:', error);
          this.snackBar.open('Failed to load routes', 'Close', { duration: 3000 });
        }
      });
  }

  loadDrivers(): void {
    this.http.get<any[]>(`${environment.apiUrl}/Drivers`)
      .subscribe({
        next: (drivers) => {
          console.log('Loaded drivers:', drivers);
          
          this.drivers = drivers.map(d => ({
            id: d.id,
            firstName: d.user?.firstName || d.name?.split(' ')[0] || 'Unknown',
            lastName: d.user?.lastName || d.name?.split(' ').slice(1).join(' ') || '',
            userCode: d.user?.userCode || d.idNumber || '',
            assignedVehicleId: d.assignedVehicleId || null
          }));
          
          console.log('Mapped drivers with vehicle assignments:', this.drivers);
          
          // If a vehicle is already selected, set the driver
          const currentVehicleId = this.tripForm.get('vehicleId')?.value;
          if (currentVehicleId) {
            this.onVehicleChange(currentVehicleId);
          }
        },
        error: (error) => {
          console.error('Error loading drivers:', error);
          this.snackBar.open('Failed to load drivers', 'Close', { duration: 3000 });
        }
      });
  }

  onSubmit(): void {
    if (this.tripForm.invalid) {
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    if (this.passengers.length === 0) {
      this.snackBar.open('Please add at least one passenger', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    const tripData = {
      ...this.tripForm.value,
      totalFare: this.totalFare,
      passengerCount: this.passengerCount,
      status: 'Completed',
      passengerListFileName: this.passengerListFileName,
      passengerListFileData: this.passengerListFileData
    };

    this.http.post(`${environment.apiUrl}/TripDetails`, tripData)
      .subscribe({
        next: (response: any) => {
          // Add earnings to vehicle
          const earningsData = {
            vehicleId: tripData.vehicleId,
            amount: this.totalFare,
            date: tripData.tripDate,
            source: 'Trip',
            description: `Trip earnings - ${this.passengerCount} passengers (Trip ID: ${response.id})`,
            period: 'Daily'
          };

          this.http.post(`${environment.apiUrl}/VehicleEarnings`, earningsData)
            .subscribe({
              next: () => {
                this.snackBar.open('Trip details saved and earnings recorded successfully!', 'Close', { duration: 5000 });
                this.resetForm();
                this.loading = false;
              },
              error: (error) => {
                console.error('Error recording earnings:', error);
                this.snackBar.open('Trip saved but failed to record earnings', 'Close', { duration: 5000 });
                this.loading = false;
              }
            });
        },
        error: (error) => {
          console.error('Error saving trip:', error);
          this.snackBar.open('Failed to save trip details', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  resetForm(): void {
    this.tripForm.reset({
      tripDate: new Date()
    });
    while (this.passengers.length) {
      this.passengers.removeAt(0);
    }
    this.addPassenger();
  }

  getVehicleDisplayName(vehicle: Vehicle): string {
    return `${vehicle.registration} - ${vehicle.make} ${vehicle.model}`;
  }

  getDriverDisplayName(driver: Driver): string {
    return `${driver.firstName} ${driver.lastName} (${driver.userCode})`;
  }

  isDriverAssignedToSelectedVehicle(driver: Driver): boolean {
    const selectedVehicleId = this.tripForm.get('vehicleId')?.value;
    return driver.assignedVehicleId === selectedVehicleId;
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      this.passengerListFileName = file.name;
      
      // Convert file to base64 for storage
      const reader = new FileReader();
      reader.onload = () => {
        this.passengerListFileData = reader.result as string;
        // Update passenger name validators when file is selected
        this.updatePassengerNameValidators();
        this.snackBar.open(`File "${file.name}" attached successfully`, 'Close', { duration: 2000 });
      };
      reader.onerror = () => {
        this.snackBar.open('Error reading file', 'Close', { duration: 3000 });
        this.removeFile();
      };
      reader.readAsDataURL(file);
    }
  }

  removeFile(): void {
    this.selectedFile = null;
    this.passengerListFileName = null;
    this.passengerListFileData = null;
    // Update passenger name validators when file is removed
    this.updatePassengerNameValidators();
    this.snackBar.open('File removed', 'Close', { duration: 2000 });
  }

  updatePassengerNameValidators(): void {
    // Update validators for all existing passengers
    const nameValidators = this.selectedFile ? [] : [Validators.required];
    this.passengers.controls.forEach(passenger => {
      const nameControl = passenger.get('name');
      nameControl?.clearValidators();
      nameControl?.setValidators(nameValidators);
      nameControl?.updateValueAndValidity();
    });
  }

  downloadPassengerList(): void {
    if (this.passengerListFileData && this.passengerListFileName) {
      // Create a link element and trigger download
      const link = document.createElement('a');
      link.href = this.passengerListFileData;
      link.download = this.passengerListFileName;
      link.click();
    }
  }

  isMarshal(): boolean {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      return userData.role === 'TaxiMarshal';
    }
    return false;
  }

  goToDashboard(): void {
    this.router.navigate(['/marshal-dashboard']);
  }

  loadHistoricalTrips(): void {
    this.loadingHistory = true;
    const url = `${environment.apiUrl}/TripDetails`;
    
    this.http.get<any[]>(url).subscribe({
      next: (data) => {
        this.historicalTrips = data || [];
        this.applyDateFilter();
        this.loadingHistory = false;
      },
      error: (err) => {
        console.error('Error loading historical trips:', err);
        this.snackBar.open('Failed to load trip history', 'Close', { duration: 3000 });
        this.loadingHistory = false;
      }
    });
  }

  applyDateFilter(): void {
    const filters = this.dateFilterForm?.value;
    if (!filters) {
      this.filteredHistoricalTrips = this.historicalTrips;
      return;
    }

    let filtered = [...this.historicalTrips];

    // Apply date range filter
    if (filters.startDate) {
      const startDate = new Date(filters.startDate);
      startDate.setHours(0, 0, 0, 0);
      filtered = filtered.filter(trip => {
        const tripDate = new Date(trip.tripDate);
        return tripDate >= startDate;
      });
    }

    if (filters.endDate) {
      const endDate = new Date(filters.endDate);
      endDate.setHours(23, 59, 59, 999);
      filtered = filtered.filter(trip => {
        const tripDate = new Date(trip.tripDate);
        return tripDate <= endDate;
      });
    }

    // Apply vehicle filter
    if (filters.vehicleId) {
      filtered = filtered.filter(trip => trip.vehicleId === filters.vehicleId);
    }

    // Apply route filter
    if (filters.routeId) {
      filtered = filtered.filter(trip => trip.routeId === filters.routeId);
    }

    this.filteredHistoricalTrips = filtered;
    this.generateRevenueCharts();
  }

  getVehicleName(vehicleId: string): string {
    const vehicle = this.vehicles.find(v => v.id === vehicleId);
    return vehicle ? `${vehicle.registration} - ${vehicle.make} ${vehicle.model}` : 'Unknown';
  }

  getRouteName(routeId: string): string {
    const route = this.routes.find(r => r.id === routeId);
    return route ? route.name : 'Unknown';
  }

  getDriverName(driverId: string): string {
    const driver = this.drivers.find(d => d.id === driverId);
    return driver ? `${driver.firstName} ${driver.lastName}` : 'Unknown';
  }

  viewTripDetails(trip: any): void {
    this.dialog.open(TripDetailsDialog, {
      width: '800px',
      data: { trip, vehicles: this.vehicles, routes: this.routes, drivers: this.drivers }
    });
  }

  resetFilters(): void {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    this.dateFilterForm.patchValue({
      startDate: thirtyDaysAgo,
      endDate: today,
      vehicleId: '',
      routeId: ''
    });
  }

  getTotalRevenue(): number {
    return this.filteredHistoricalTrips.reduce((sum, trip) => sum + (trip.totalFare || 0), 0);
  }

  getTotalPassengers(): number {
    return this.filteredHistoricalTrips.reduce((sum, trip) => sum + (trip.passengerCount || trip.passengers?.length || 0), 0);
  }

  generateRevenueCharts(): void {
    // Revenue by Vehicle
    const vehicleRevenueMap = new Map<string, number>();
    this.filteredHistoricalTrips.forEach(trip => {
      const vehicleId = trip.vehicleId;
      const current = vehicleRevenueMap.get(vehicleId) || 0;
      vehicleRevenueMap.set(vehicleId, current + (trip.totalFare || 0));
    });

    this.revenueByVehicle = Array.from(vehicleRevenueMap.entries()).map(([vehicleId, revenue]) => ({
      vehicle: this.getVehicleName(vehicleId),
      revenue: revenue
    })).sort((a, b) => b.revenue - a.revenue);

    // Revenue by Route
    const routeRevenueMap = new Map<string, number>();
    this.filteredHistoricalTrips.forEach(trip => {
      const routeId = trip.routeId;
      const current = routeRevenueMap.get(routeId) || 0;
      routeRevenueMap.set(routeId, current + (trip.totalFare || 0));
    });

    this.revenueByRoute = Array.from(routeRevenueMap.entries()).map(([routeId, revenue]) => ({
      route: this.getRouteName(routeId),
      revenue: revenue
    })).sort((a, b) => b.revenue - a.revenue);

    // Daily Revenue
    const dailyRevenueMap = new Map<string, number>();
    this.filteredHistoricalTrips.forEach(trip => {
      const date = new Date(trip.tripDate).toISOString().split('T')[0];
      const current = dailyRevenueMap.get(date) || 0;
      dailyRevenueMap.set(date, current + (trip.totalFare || 0));
    });

    this.dailyRevenue = Array.from(dailyRevenueMap.entries())
      .map(([date, revenue]) => ({
        date: date,
        revenue: revenue
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  getAverageRevenuePerTrip(): number {
    if (this.filteredHistoricalTrips.length === 0) return 0;
    return this.getTotalRevenue() / this.filteredHistoricalTrips.length;
  }

  getTopPerformingVehicle(): string {
    if (this.revenueByVehicle.length === 0) return 'N/A';
    return this.revenueByVehicle[0].vehicle;
  }

  getTopPerformingRoute(): string {
    if (this.revenueByRoute.length === 0) return 'N/A';
    return this.revenueByRoute[0].route;
  }

  getMaxDailyRevenue(): number {
    if (this.dailyRevenue.length === 0) return 1;
    return Math.max(...this.dailyRevenue.map(d => d.revenue));
  }
}

// Trip Details Dialog Component
@Component({
  selector: 'app-trip-details-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, MatDividerModule],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>info</mat-icon>
      Trip Details
    </h2>
    <mat-dialog-content class="trip-details-dialog">
      <div class="details-section">
        <h3>Trip Information</h3>
        <div class="detail-row">
          <span class="label">Date:</span>
          <span class="value">{{ data.trip.tripDate | date:'medium' }}</span>
        </div>
        <div class="detail-row">
          <span class="label">Vehicle:</span>
          <span class="value">{{ getVehicleName(data.trip.vehicleId) }}</span>
        </div>
        <div class="detail-row">
          <span class="label">Route:</span>
          <span class="value">{{ getRouteName(data.trip.routeId) }}</span>
        </div>
        <div class="detail-row">
          <span class="label">Driver:</span>
          <span class="value">{{ getDriverName(data.trip.driverId) }}</span>
        </div>
        <div class="detail-row">
          <span class="label">Departure:</span>
          <span class="value">{{ data.trip.departureTime }}</span>
        </div>
        <div class="detail-row" *ngIf="data.trip.arrivalTime">
          <span class="label">Arrival:</span>
          <span class="value">{{ data.trip.arrivalTime }}</span>
        </div>
      </div>

      <mat-divider></mat-divider>

      <div class="details-section">
        <h3>Passenger Details</h3>
        <div class="detail-row">
          <span class="label">Total Passengers:</span>
          <span class="value">{{ data.trip.passengerCount || data.trip.passengers?.length || 0 }}</span>
        </div>
        <div class="detail-row">
          <span class="label">Total Fare:</span>
          <span class="value">R{{ data.trip.totalFare?.toFixed(2) || '0.00' }}</span>
        </div>
      </div>

      <mat-divider *ngIf="data.trip.passengers && data.trip.passengers.length > 0"></mat-divider>

      <div class="details-section" *ngIf="data.trip.passengers && data.trip.passengers.length > 0">
        <h3>Passenger List</h3>
        <div class="passenger-list">
          <div class="passenger-item" *ngFor="let passenger of data.trip.passengers; let i = index">
            <div class="passenger-number">{{ i + 1 }}</div>
            <div class="passenger-info">
              <div class="passenger-name">{{ passenger.name }}</div>
              <div class="passenger-details">
                <span *ngIf="passenger.destination">To: {{ passenger.destination }}</span>
                <span *ngIf="passenger.contactNumber"> • {{ passenger.contactNumber }}</span>
              </div>
            </div>
            <div class="passenger-fare">R{{ passenger.fareAmount?.toFixed(2) || '0.00' }}</div>
          </div>
        </div>
      </div>

      <div class="details-section" *ngIf="data.trip.notes">
        <h3>Notes</h3>
        <p>{{ data.trip.notes }}</p>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .trip-details-dialog {
      max-height: 70vh;
      overflow-y: auto;
    }

    .details-section {
      padding: 1rem 0;
    }

    .details-section h3 {
      margin: 0 0 1rem 0;
      color: #333;
      font-size: 1.1rem;
      font-weight: 600;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f0f0f0;
    }

    .detail-row:last-child {
      border-bottom: none;
    }

    .label {
      font-weight: 600;
      color: #666;
    }

    .value {
      color: #333;
    }

    .passenger-list {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .passenger-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 0.75rem;
      background: #f9fafb;
      border-radius: 8px;
    }

    .passenger-number {
      width: 32px;
      height: 32px;
      background: #D4AF37;
      color: white;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .passenger-info {
      flex: 1;
    }

    .passenger-name {
      font-weight: 600;
      color: #333;
      margin-bottom: 0.25rem;
    }

    .passenger-details {
      font-size: 0.875rem;
      color: #666;
    }

    .passenger-fare {
      font-weight: 600;
      color: #D4AF37;
      font-size: 1.1rem;
    }

    mat-divider {
      margin: 1rem 0;
    }
  `]
})
export class TripDetailsDialog {
  constructor(@Inject(MAT_DIALOG_DATA) public data: any) {}

  getVehicleName(vehicleId: string): string {
    const vehicle = this.data.vehicles.find((v: any) => v.id === vehicleId);
    return vehicle ? `${vehicle.registration} - ${vehicle.make} ${vehicle.model}` : 'Unknown';
  }

  getRouteName(routeId: string): string {
    const route = this.data.routes.find((r: any) => r.id === routeId);
    return route ? route.name : 'Unknown';
  }

  getDriverName(driverId: string): string {
    const driver = this.data.drivers.find((d: any) => d.id === driverId);
    return driver ? `${driver.firstName} ${driver.lastName}` : 'Unknown';
  }
}
