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
import { environment } from '../../../../environments/environment';

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
}

interface Driver {
  id: string;
  firstName: string;
  lastName: string;
}

interface Marshal {
  id: string;
  firstName: string;
  lastName: string;
  marshalCode: string;
}

interface TripSchedule {
  id: string;
  vehicleRegistration: string;
  routeName: string;
  driverName: string;
  marshalName: string;
  scheduledDate: Date;
  departureTime: string;
  status: string;
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
    MatSnackBarModule
  ],
  templateUrl: './trip-schedule.component.html',
  styleUrls: ['./trip-schedule.component.scss']
})
export class TripScheduleComponent implements OnInit {
  scheduleForm!: FormGroup;
  vehicles: Vehicle[] = [];
  routes: Route[] = [];
  drivers: Driver[] = [];
  marshals: Marshal[] = [];
  schedules: TripSchedule[] = [];
  displayedColumns: string[] = ['date', 'time', 'vehicle', 'route', 'driver', 'marshal', 'status', 'actions'];
  loading = false;
  editMode = false;
  editingScheduleId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadVehicles();
    this.loadRoutes();
    this.loadDrivers();
    this.loadMarshals();
    this.loadSchedules();
  }

  initializeForm(): void {
    this.scheduleForm = this.fb.group({
      vehicleId: ['', Validators.required],
      routeId: ['', Validators.required],
      driverId: ['', Validators.required],
      marshalId: ['', Validators.required],
      scheduledDate: [new Date(), Validators.required],
      departureTime: ['', Validators.required],
      estimatedArrivalTime: [''],
      status: ['Scheduled']
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
    this.http.get<Marshal[]>(`${environment.apiUrl}/Marshals`)
      .subscribe({
        next: (marshals) => this.marshals = marshals,
        error: (error) => {
          console.error('Error loading marshals:', error);
          this.snackBar.open('Failed to load marshals', 'Close', { duration: 3000 });
        }
      });
  }

  loadSchedules(): void {
    this.loading = true;
    this.http.get<TripSchedule[]>(`${environment.apiUrl}/TripSchedules`)
      .subscribe({
        next: (schedules) => {
          this.schedules = schedules;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading schedules:', error);
          this.snackBar.open('Failed to load trip schedules', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  onSubmit(): void {
    if (this.scheduleForm.invalid) {
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    const scheduleData = this.scheduleForm.value;

    const request = this.editMode
      ? this.http.put(`${environment.apiUrl}/TripSchedules/${this.editingScheduleId}`, scheduleData)
      : this.http.post(`${environment.apiUrl}/TripSchedules`, scheduleData);

    request.subscribe({
      next: () => {
        this.snackBar.open(
          this.editMode ? 'Schedule updated successfully!' : 'Trip scheduled successfully!',
          'Close',
          { duration: 3000 }
        );
        this.loadSchedules();
        this.resetForm();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error saving schedule:', error);
        this.snackBar.open('Failed to save schedule', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  editSchedule(schedule: TripSchedule): void {
    this.editMode = true;
    this.editingScheduleId = schedule.id;
    
    this.scheduleForm.patchValue({
      vehicleId: (schedule as any).vehicleId,
      routeId: (schedule as any).routeId,
      driverId: (schedule as any).driverId,
      marshalId: (schedule as any).marshalId,
      scheduledDate: schedule.scheduledDate,
      departureTime: schedule.departureTime,
      estimatedArrivalTime: (schedule as any).estimatedArrivalTime,
      status: schedule.status
    });
  }

  deleteSchedule(id: string): void {
    if (!confirm('Are you sure you want to delete this schedule?')) {
      return;
    }

    this.http.delete(`${environment.apiUrl}/TripSchedules/${id}`)
      .subscribe({
        next: () => {
          this.snackBar.open('Schedule deleted successfully!', 'Close', { duration: 3000 });
          this.loadSchedules();
        },
        error: (error) => {
          console.error('Error deleting schedule:', error);
          this.snackBar.open('Failed to delete schedule', 'Close', { duration: 3000 });
        }
      });
  }

  resetForm(): void {
    this.editMode = false;
    this.editingScheduleId = null;
    this.scheduleForm.reset({
      scheduledDate: new Date(),
      status: 'Scheduled'
    });
  }

  getVehicleDisplayName(vehicle: Vehicle): string {
    return `${vehicle.registration} - ${vehicle.make} ${vehicle.model}`;
  }

  getDriverDisplayName(driver: Driver): string {
    return `${driver.firstName} ${driver.lastName}`;
  }

  getMarshalDisplayName(marshal: Marshal): string {
    return `${marshal.firstName} ${marshal.lastName} (${marshal.marshalCode})`;
  }
}
