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
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

interface Vehicle {
  id: string;
  registration: string;
  make: string;
  model: string;
  ownerId: string;
  ownerName?: string;
}

interface Route {
  id: string;
  code: string;
  name: string;
  origin: string;
  destination: string;
}

interface VehicleRouteAssignment {
  id: string;
  vehicleId: string;
  vehicleRegistration: string;
  routeId: string;
  routeName: string;
  assignedDate: Date;
  status: string;
}

@Component({
  selector: 'app-vehicle-assignment',
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
    MatSnackBarModule
  ],
  templateUrl: './vehicle-assignment.component.html',
  styleUrls: ['./vehicle-assignment.component.scss']
})
export class VehicleAssignmentComponent implements OnInit {
  assignmentForm!: FormGroup;
  vehicles: Vehicle[] = [];
  routes: Route[] = [];
  assignments: VehicleRouteAssignment[] = [];
  displayedColumns: string[] = ['vehicleRegistration', 'routeName', 'assignedDate', 'status', 'actions'];
  loading = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadVehicles();
    this.loadRoutes();
    this.loadAssignments();
  }

  initializeForm(): void {
    this.assignmentForm = this.fb.group({
      vehicleId: ['', Validators.required],
      routeId: ['', Validators.required]
    });
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

  loadAssignments(): void {
    this.loading = true;
    this.http.get<any[]>(`${environment.apiUrl}/VehicleRouteAssignments`)
      .subscribe({
        next: (assignments) => {
          // Map backend navigation properties to display properties
          this.assignments = assignments.map(a => ({
            id: a.id,
            vehicleId: a.vehicleId,
            vehicleRegistration: a.vehicle ? a.vehicle.registration : 'Unknown Vehicle',
            routeId: a.routeId,
            routeName: a.route ? `${a.route.name} (${a.route.origin} → ${a.route.destination})` : 'Unknown Route',
            assignedDate: a.assignedDate,
            status: a.status
          }));
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading assignments:', error);
          this.snackBar.open('Failed to load vehicle assignments', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  onSubmit(): void {
    if (this.assignmentForm.invalid) {
      this.snackBar.open('Please select both vehicle and route', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    const assignmentData = {
      ...this.assignmentForm.value,
      assignedDate: new Date(),
      status: 'Active'
    };

    this.http.post(`${environment.apiUrl}/VehicleRouteAssignments`, assignmentData)
      .subscribe({
        next: () => {
          this.snackBar.open('Vehicle assigned to route successfully!', 'Close', { duration: 3000 });
          this.loadAssignments();
          this.assignmentForm.reset();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error assigning vehicle:', error);
          this.snackBar.open('Failed to assign vehicle', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  removeAssignment(id: string): void {
    if (!confirm('Are you sure you want to remove this assignment?')) {
      return;
    }

    this.http.delete(`${environment.apiUrl}/VehicleRouteAssignments/${id}`)
      .subscribe({
        next: () => {
          this.snackBar.open('Assignment removed successfully!', 'Close', { duration: 3000 });
          this.loadAssignments();
        },
        error: (error) => {
          console.error('Error removing assignment:', error);
          this.snackBar.open('Failed to remove assignment', 'Close', { duration: 3000 });
        }
      });
  }

  getVehicleDisplayName(vehicle: Vehicle): string {
    return `${vehicle.registration} - ${vehicle.make} ${vehicle.model}${vehicle.ownerName ? ' (' + vehicle.ownerName + ')' : ''}`;
  }
}
