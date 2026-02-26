import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { NgxMaterialTimepickerModule } from 'ngx-material-timepicker';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';
import { PassengerCaptureDialogComponent } from '../passenger-capture-dialog/passenger-capture-dialog.component';

interface TaxiRank {
  id: string;
  name: string;
  location: string;
  tenantId: string;
}

interface Vehicle {
  id: string;
  registration: string;
  make: string;
  model: string;
}

interface Route {
  id: string;
  name: string;
  origin: string;
  destination: string;
  code?: string;
  distance?: number;
  estimatedDuration?: number;
  fareAmount?: number;
  status?: string;
}

interface Driver {
  id: string;
  name: string;
  phone?: string;
  assignedVehicleId?: string;
}

interface Marshal {
  id: string;
  fullName: string;
  marshalCode: string;
  userId: string;
  status?: string;
}

interface UserInfo {
  userId: string;
  email: string;
  role: string;
  tenantId: string;
  fullName?: string;
}

interface VehicleRouteAssignment {
  id: string;
  vehicleId: string;
  routeId: string;
  vehicle: Vehicle;
  route: Route;
  assignedDate: Date;
  status: string;
}

interface TripSchedule {
  id: string;
  vehicleId: string;
  driverId?: string;
  marshalId?: string;
  taxiRankId: string;
  departureStation: string;
  destinationStation: string;
  departureTime: string;
  status: string;
  passengerCount: number;
  totalAmount: number;
  notes?: string;
  vehicle?: Vehicle;
  driver?: any;
  marshal?: any;
}

@Component({
  selector: 'app-trip-schedule',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    NgxMaterialTimepickerModule
  ],
  templateUrl: './trip-schedule.component.html',
  styleUrls: ['./trip-schedule.component.scss']
})
export class TripScheduleComponent implements OnInit {
  scheduleForm!: FormGroup;
  taxiRanks: TaxiRank[] = [];
  vehicles: Vehicle[] = [];
  routes: Route[] = [];
  drivers: Driver[] = [];
  marshals: Marshal[] = [];
  schedules: TripSchedule[] = [];
  todaysSchedules: TripSchedule[] = [];
  groupedSchedules: { [date: string]: TripSchedule[] } = {};
  scheduleDates: string[] = [];
  vehicleRouteAssignments: VehicleRouteAssignment[] = [];
  userInfo: UserInfo | null = null;
  displayedColumns: string[] = ['time', 'vehicle', 'route', 'driver', 'marshal', 'passengers', 'status', 'actions'];
  todaysDisplayedColumns: string[] = ['time', 'vehicle', 'route', 'driver', 'marshal', 'status'];
  loading = false;
  editMode = false;
  editingScheduleId: string | null = null;
  isMarshalUser = false;
  isAdminUser = false;
  today = new Date();

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadUserInfo();
    this.loadTaxiRanks();
    this.loadMarshals();
    this.loadDrivers();
    this.loadVehicleRouteAssignments();
    this.loadSchedules();
  }

  initializeForm(): void {
    this.scheduleForm = this.fb.group({
      taxiRankId: ['', Validators.required],
      routeId: ['', Validators.required],
      vehicleId: ['', Validators.required],
      driverId: ['', Validators.required],
      marshalId: [''],
      scheduledDate: [new Date(), Validators.required],
      departureTime: ['08:00', Validators.required], // Default to 8:00 AM
      estimatedArrivalTime: [''],
      status: ['Scheduled']
    });

    // Set up cascading dropdowns
    this.scheduleForm.get('taxiRankId')?.valueChanges.subscribe(value => {
      if (value) {
        this.loadRoutesForTaxiRank(value);
        this.loadMarshalsForTaxiRank(value);
        this.scheduleForm.patchValue({ routeId: '', vehicleId: '', driverId: '', marshalId: '' });
      }
    });

    this.scheduleForm.get('routeId')?.valueChanges.subscribe(value => {
      if (value) {
        this.loadVehiclesForRoute(value);
        this.scheduleForm.patchValue({ vehicleId: '', driverId: '' });
      }
    });

    this.scheduleForm.get('vehicleId')?.valueChanges.subscribe(value => {
      if (value) {
        this.loadDriverForVehicle(value);
        // Auto-populate marshal if user is a marshal
        if (this.isMarshalUser && this.userInfo) {
          this.scheduleForm.patchValue({ marshalId: this.userInfo.userId });
        }
      } else {
        // Clear driver when no vehicle is selected
        this.scheduleForm.patchValue({ driverId: '' });
      }
    });
  }

  loadVehicles(): void {
    this.http.get<Vehicle[]>(`${environment.apiUrl}/Vehicles`)
      .subscribe({
        next: (vehicles) => this.vehicles = vehicles,
        error: (error) => {
          console.error('Error loading vehicles:', error);
          this.snackBar.open('Failed to load vehicles', 'Close', { duration: 3000 });
        }
      });
  }

  loadRoutes(): void {
    this.http.get<Route[]>(`${environment.apiUrl}/Routes`)
      .subscribe({
        next: (routes) => this.routes = routes,
        error: (error) => {
          console.error('Error loading routes:', error);
          this.snackBar.open('Failed to load routes', 'Close', { duration: 3000 });
        }
      });
  }

  loadDrivers(): void {
    this.http.get<Driver[]>(`${environment.apiUrl}/Drivers`)
      .subscribe({
        next: (drivers) => this.drivers = drivers,
        error: (error) => {
          console.error('Error loading drivers:', error);
          this.snackBar.open('Failed to load drivers', 'Close', { duration: 3000 });
        }
      });
  }

  loadMarshals(): void {
    // Load all marshals initially - will be filtered by taxi rank selection
    this.http.get<Marshal[]>(`${environment.apiUrl}/TaxiRankUsers/marshals`)
      .subscribe({
        next: (marshals) => this.marshals = marshals,
        error: (error) => {
          console.error('Error loading marshals:', error);
          this.snackBar.open('Failed to load marshals', 'Close', { duration: 3000 });
        }
      });
  }

  loadMarshalsForTaxiRank(taxiRankId: string): void {
    this.http.get<Marshal[]>(`${environment.apiUrl}/TaxiRankUsers/marshals?taxiRankId=${taxiRankId}`)
      .subscribe({
        next: (marshals) => {
          this.marshals = marshals;
          // Set default marshal for the taxi rank (first active marshal) for non-marshal users
          const defaultMarshal = marshals.find(m => m.status === 'Active');
          if (defaultMarshal && !this.isMarshalUser && !this.isAdminUser) {
            this.scheduleForm.patchValue({ marshalId: defaultMarshal.id });
          }
        },
        error: (error) => {
          console.error('Error loading marshals for taxi rank:', error);
          this.snackBar.open('Failed to load marshals for selected taxi rank', 'Close', { duration: 3000 });
        }
      });
  }

  loadVehicleRouteAssignments(): void {
    this.http.get<VehicleRouteAssignment[]>(`${environment.apiUrl}/VehicleRouteAssignments`)
      .subscribe({
        next: (assignments) => {
          this.vehicleRouteAssignments = assignments.filter(a => a.status === 'Active');
        },
        error: (error) => {
          console.error('Error loading vehicle-route assignments:', error);
          this.snackBar.open('Failed to load vehicle assignments', 'Close', { duration: 3000 });
        }
      });
  }

  loadSchedules(): void {
    this.loading = true;
    let url = `${environment.apiUrl}/TaxiRankTrips`;
    if (this.userInfo?.tenantId) {
      url += `?tenantId=${this.userInfo.tenantId}`;
    }

    this.http.get<TripSchedule[]>(url)
      .subscribe({
        next: (schedules) => {
          this.schedules = schedules;
          
          // Group schedules by date
          this.groupedSchedules = {};
          schedules.forEach(schedule => {
            if (schedule.departureTime) {
              const date = new Date(schedule.departureTime).toDateString();
              if (!this.groupedSchedules[date]) {
                this.groupedSchedules[date] = [];
              }
              this.groupedSchedules[date].push(schedule);
            }
          });
          
          // Sort dates in descending order (most recent first)
          this.scheduleDates = Object.keys(this.groupedSchedules).sort((a, b) => 
            new Date(b).getTime() - new Date(a).getTime()
          );
          
          // Filter today's schedules
          const todayStr = this.today.toISOString().split('T')[0];
          this.todaysSchedules = schedules.filter(s => {
            if (!s.departureTime) return false;
            const date = new Date(s.departureTime);
            return !isNaN(date.getTime()) && date >= new Date(); // Only future trips
          });
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading trips:', error);
          this.snackBar.open('Failed to load trip schedules', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  loadUserInfo(): void {
    this.userInfo = this.authService.getCurrentUserInfo();
    if (this.userInfo) {
      // Set marshal field based on user role
      this.isMarshalUser = this.userInfo.role === 'TaxiMarshal';
      this.isAdminUser = this.userInfo.role === 'TaxiRankAdmin';
      if (this.isMarshalUser && this.scheduleForm) {
        this.scheduleForm.patchValue({ marshalId: this.userInfo.userId });
      }
    } else {
      console.error('No user information available');
      this.snackBar.open('User information not available. Please log in again.', 'Close', { duration: 3000 });
    }
  }

  loadTaxiRanks(): void {
    if (!this.userInfo?.tenantId) {
      this.snackBar.open('User tenant information not available', 'Close', { duration: 3000 });
      return;
    }

    this.http.get<TaxiRank[]>(`${environment.apiUrl}/TaxiRanks?tenantId=${this.userInfo.tenantId}`)
      .subscribe({
        next: (taxiRanks) => this.taxiRanks = taxiRanks,
        error: (error) => {
          console.error('Error loading taxi ranks:', error);
          this.snackBar.open('Failed to load taxi ranks', 'Close', { duration: 3000 });
        }
      });
  }

  loadRoutesForTaxiRank(taxiRankId: string): void {
    this.http.get<Route[]>(`${environment.apiUrl}/Routes?taxiRankId=${taxiRankId}`)
      .subscribe({
        next: (routes) => this.routes = routes,
        error: (error) => {
          console.error('Error loading routes for taxi rank:', error);
          this.snackBar.open('Failed to load routes', 'Close', { duration: 3000 });
        }
      });
  }

  loadVehiclesForRoute(routeId: string): void {
    // Filter vehicles that are assigned to the selected route
    const assignedVehicleIds = this.vehicleRouteAssignments
      .filter(assignment => assignment.routeId === routeId && assignment.status === 'Active')
      .map(assignment => assignment.vehicleId);

    // Get the actual vehicle objects for the assigned vehicle IDs
    this.vehicles = this.vehicleRouteAssignments
      .filter(assignment => assignment.routeId === routeId && assignment.status === 'Active')
      .map(assignment => assignment.vehicle)
      .filter(vehicle => vehicle != null); // Filter out any null vehicles
  }

  loadDriverForVehicle(vehicleId: string): void {
    // Find the driver assigned to this vehicle from the loaded drivers list
    const assignedDriver = this.drivers.find(driver => driver.assignedVehicleId === vehicleId);

    if (assignedDriver) {
      this.scheduleForm.patchValue({ driverId: assignedDriver.id });
    } else {
      // Clear the driver field if no driver is assigned
      this.scheduleForm.patchValue({ driverId: '' });
    }
  }

  onSubmit(): void {
    if (this.scheduleForm.invalid) {
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    const formData = this.scheduleForm.value;

    // Get the selected route to extract departure/destination stations
    const selectedRoute = this.routes.find(r => r.id === formData.routeId);
    if (!selectedRoute) {
      this.snackBar.open('Selected route not found', 'Close', { duration: 3000 });
      this.loading = false;
      return;
    }

    // Combine scheduled date and departure time into a DateTime
    const scheduledDate = new Date(formData.scheduledDate);

    // Validate and parse departure time (handles both 12-hour AM/PM and 24-hour formats)
    if (!formData.departureTime || !formData.departureTime.includes(':')) {
      this.snackBar.open('Please select a valid departure time', 'Close', { duration: 3000 });
      this.loading = false;
      return;
    }

    // Parse time handling AM/PM format from ngx-material-timepicker
    const timeString = formData.departureTime.trim();
    const isPM = timeString.toUpperCase().includes('PM');
    const isAM = timeString.toUpperCase().includes('AM');
    
    // Remove AM/PM suffix and get the time parts
    const cleanTime = timeString.replace(/\s*(AM|PM)\s*/i, '').trim();
    const timeParts = cleanTime.split(':');
    
    if (timeParts.length !== 2) {
      this.snackBar.open('Invalid departure time format', 'Close', { duration: 3000 });
      this.loading = false;
      return;
    }

    let hours = parseInt(timeParts[0], 10);
    const minutes = parseInt(timeParts[1], 10);

    // Convert 12-hour format to 24-hour format
    if (isPM && hours !== 12) {
      hours += 12; // Convert PM hours (1-11 PM becomes 13-23)
    } else if (isAM && hours === 12) {
      hours = 0; // 12 AM is midnight (0:00)
    }

    if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
      this.snackBar.open('Invalid departure time values', 'Close', { duration: 3000 });
      this.loading = false;
      return;
    }

    scheduledDate.setHours(hours, minutes, 0, 0);

    // Validate that the resulting date is valid
    if (isNaN(scheduledDate.getTime())) {
      this.snackBar.open('Invalid date/time combination', 'Close', { duration: 3000 });
      this.loading = false;
      return;
    }

    // Transform form data to match CreateTripDto
    const tripData = {
      tenantId: this.userInfo?.tenantId,
      vehicleId: formData.vehicleId,
      driverId: formData.driverId || null,
      marshalId: formData.marshalId || null,
      taxiRankId: formData.taxiRankId,
      departureStation: selectedRoute.origin,
      destinationStation: selectedRoute.destination,
      departureTime: scheduledDate.toISOString(),
      notes: `Trip scheduled for ${selectedRoute.name}`
    };

    const request = this.http.post(`${environment.apiUrl}/TaxiRankTrips`, tripData);

    request.subscribe({
      next: () => {
        this.snackBar.open('Trip scheduled successfully!', 'Close', { duration: 3000 });
        this.loadSchedules();
        this.resetForm();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error saving trip:', error);
        this.snackBar.open('Failed to save trip', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  openPassengerDialog(schedule: TripSchedule): void {
    const dialogRef = this.dialog.open(PassengerCaptureDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: { trip: schedule }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadSchedules(); // Refresh to update passenger counts
      }
    });
  }

  deleteSchedule(id: string): void {
    if (!confirm('Are you sure you want to delete this trip?')) {
      return;
    }

    this.http.delete(`${environment.apiUrl}/TaxiRankTrips/${id}`)
      .subscribe({
        next: () => {
          this.snackBar.open('Trip deleted successfully!', 'Close', { duration: 3000 });
          this.loadSchedules();
        },
        error: (error) => {
          console.error('Error deleting trip:', error);
          this.snackBar.open('Failed to delete trip', 'Close', { duration: 3000 });
        }
      });
  }

  resetForm(): void {
    this.editMode = false;
    this.editingScheduleId = null;
    this.scheduleForm.reset({
      taxiRankId: '',
      routeId: '',
      vehicleId: '',
      driverId: '',
      marshalId: '',
      scheduledDate: new Date(),
      departureTime: '08:00', // Default to 8:00 AM
      estimatedArrivalTime: '',
      status: 'Scheduled'
    });
  }

  getVehicleDisplayName(vehicle: Vehicle): string {
    return `${vehicle.registration} - ${vehicle.make} ${vehicle.model}`;
  }

  getDriverDisplayName(driver: Driver): string {
    return driver.name || 'Unknown Driver';
  }

  getMarshalDisplayName(marshal: Marshal): string {
    return `${marshal.fullName} (${marshal.marshalCode})`;
  }
}
