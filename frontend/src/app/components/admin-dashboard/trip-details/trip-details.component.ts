import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
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
    MatDividerModule
  ],
  templateUrl: './trip-details.component.html',
  styleUrls: ['./trip-details.component.scss']
})
export class TripDetailsComponent implements OnInit {
  tripForm!: FormGroup;
  vehicles: Vehicle[] = [];
  routes: Route[] = [];
  drivers: Driver[] = [];
  loading = false;
  passengerColumns: string[] = ['name', 'contact', 'nextOfKin', 'nextOfKinContact', 'address', 'destination', 'fare', 'actions'];
  routeDestinations: string[] = [];

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
  }

  initializeForm(): void {
    this.tripForm = this.fb.group({
      vehicleId: ['', Validators.required],
      routeId: ['', Validators.required],
      driverId: ['', Validators.required],
      tripDate: [new Date(), Validators.required],
      departureTime: [''],
      arrivalTime: [''],
      passengers: this.fb.array([]),
      notes: ['']
    });

    // Auto-select driver when vehicle changes
    this.tripForm.get('vehicleId')?.valueChanges.subscribe(vehicleId => {
      this.onVehicleChange(vehicleId);
    });

    // Add initial passenger row
    this.addPassenger();
  }

  get passengers(): FormArray {
    return this.tripForm.get('passengers') as FormArray;
  }

  get totalFare(): number {
    return this.passengers.controls.reduce((total, passenger) => {
      return total + (parseFloat(passenger.get('fareAmount')?.value) || 0);
    }, 0);
  }

  get passengerCount(): number {
    return this.passengers.length;
  }

  addPassenger(): void {
    const passengerGroup = this.fb.group({
      name: ['', Validators.required],
      contactNumber: [''],
      nextOfKin: [''],
      nextOfKinContact: [''],
      address: [''],
      destination: [''],
      fareAmount: [0, [Validators.required, Validators.min(0)]]
    });

    this.passengers.push(passengerGroup);
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
      // Find driver assigned to this vehicle
      const assignedDriver = this.drivers.find(d => d.assignedVehicleId === vehicleId);
      if (assignedDriver) {
        this.tripForm.patchValue({ driverId: assignedDriver.id }, { emitEvent: false });
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
          this.drivers = drivers.map(d => ({
            id: d.id,
            firstName: d.user?.firstName || d.name?.split(' ')[0] || 'Unknown',
            lastName: d.user?.lastName || d.name?.split(' ').slice(1).join(' ') || '',
            userCode: d.user?.userCode || d.idNumber || '',
            assignedVehicleId: d.assignedVehicleId
          }));
          
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
      status: 'Completed'
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
}
