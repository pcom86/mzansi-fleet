import { Component, OnInit } from '@angular/core';
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
    MatTooltipModule
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
  uploadingFile = false;
  passengerColumns: string[] = ['name', 'contact', 'nextOfKin', 'nextOfKinContact', 'address', 'destination', 'fare', 'actions'];
  routeDestinations: string[] = [];
  passengerEntryMode: 'manual' | 'file' = 'manual';
  selectedFile: File | null = null;
  passengerListFileName: string | null = null;
  passengerListFileData: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private router: Router
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
}
