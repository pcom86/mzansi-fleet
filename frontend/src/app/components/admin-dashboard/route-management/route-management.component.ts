import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormArray } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatSelectModule } from '@angular/material/select';
import { environment } from '../../../../environments/environment';

interface Route {
  id: string;
  tenantId: string;
  code: string;
  name: string;
  origin: string;
  destination: string;
  stops: string[];
  distance: number;
  estimatedDuration: number;
  fareAmount: number; // Keep for backward compatibility
  destinationFares: { [destination: string]: number }; // New: fare per destination
  status: string;
}

interface Tenant {
  id: string;
  name: string;
  code: string;
}

@Component({
  selector: 'app-route-management',
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
    MatDialogModule,
    MatSnackBarModule,
    MatChipsModule,
    MatSelectModule
  ],
  templateUrl: './route-management.component.html',
  styleUrls: ['./route-management.component.scss']
})
export class RouteManagementComponent implements OnInit {
  routeForm!: FormGroup;
  routes: Route[] = [];
  tenants: Tenant[] = [];
  displayedColumns: string[] = ['code', 'name', 'origin', 'destination', 'distance', 'fare', 'status', 'actions'];
  loading = false;
  editMode = false;
  editingRouteId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadTenants();
    this.loadRoutes();
  }

  initializeForm(): void {
    this.routeForm = this.fb.group({
      tenantId: ['', Validators.required],
      code: ['', Validators.required],
      name: ['', Validators.required],
      origin: ['', Validators.required],
      destination: ['', Validators.required],
      stops: this.fb.array([]),
      distance: [0, [Validators.required, Validators.min(0)]],
      estimatedDuration: [0, [Validators.required, Validators.min(0)]],
      fareAmount: [0, [Validators.required, Validators.min(0)]],
      destinationFares: this.fb.group({}), // Dynamic fares per destination
      status: ['Active']
    });

    // Auto-generate route code
    this.routeForm.get('name')?.valueChanges.subscribe(name => {
      if (name && !this.editMode) {
        const code = this.generateRouteCode(name);
        this.routeForm.patchValue({ code }, { emitEvent: false });
      }
    });

    // Update destination fares when destination or stops change
    this.routeForm.get('destination')?.valueChanges.subscribe(() => {
      this.updateDestinationFares();
    });
  }

  get stops(): FormArray {
    return this.routeForm.get('stops') as FormArray;
  }

  addStop(): void {
    this.stops.push(this.fb.control('', Validators.required));
  }

  removeStop(index: number): void {
    this.stops.removeAt(index);
    this.updateDestinationFares();
  }

  updateDestinationFares(): void {
    const destination = this.routeForm.get('destination')?.value;
    const stops = this.stops.value as string[];

    if (destination) {
      const destinations = [destination, ...stops.filter(stop => stop.trim())];
      const currentFares = this.routeForm.get('destinationFares')?.value || {};

      // Create fare controls for each destination
      const fareGroup: { [key: string]: any } = {};
      destinations.forEach(dest => {
        fareGroup[dest] = [currentFares[dest] || 0, [Validators.required, Validators.min(0)]];
      });

      this.routeForm.setControl('destinationFares', this.fb.group(fareGroup));
    }
  }

  get destinationFares(): { [key: string]: any } {
    return (this.routeForm.get('destinationFares') as any)?.controls || {};
  }

  get destinationFaresFormGroup(): FormGroup {
    return this.routeForm.get('destinationFares') as FormGroup;
  }

  getAllDestinations(): string[] {
    const destination = this.routeForm.get('destination')?.value;
    const stops = this.stops.value as string[];
    return destination ? [destination, ...stops.filter(stop => stop.trim())] : [];
  }

  generateRouteCode(name: string): string {
    const baseCode = name.toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 8);
    const timestamp = Date.now().toString().slice(-4);
    return `RT-${baseCode}-${timestamp}`;
  }

  loadTenants(): void {
    // Get logged in user's tenant ID
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      this.snackBar.open('User session not found', 'Close', { duration: 3000 });
      return;
    }

    const user = JSON.parse(userStr);
    const userTenantId = user.tenantId;

    if (!userTenantId) {
      this.snackBar.open('User is not associated with a taxi association', 'Close', { duration: 3000 });
      return;
    }

    // Load only the user's tenant
    this.http.get<Tenant>(`${environment.apiUrl}/Tenants/${userTenantId}`)
      .subscribe({
        next: (tenant) => {
          this.tenants = [tenant];
          // Auto-select the tenant
          this.routeForm.patchValue({ tenantId: tenant.id });
        },
        error: (error) => {
          console.error('Error loading tenant:', error);
          this.snackBar.open('Failed to load taxi association', 'Close', { duration: 3000 });
        }
      });
  }

  loadRoutes(): void {
    this.loading = true;
    this.http.get<Route[]>(`${environment.apiUrl}/Routes`)
      .subscribe({
        next: (routes) => {
          this.routes = routes;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading routes:', error);
          this.snackBar.open('Failed to load routes', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  onSubmit(): void {
    if (this.routeForm.invalid) {
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    const formValue = this.routeForm.value;
    const routeData = {
      tenantId: formValue.tenantId,
      code: formValue.code,
      name: formValue.name,
      origin: formValue.origin,
      destination: formValue.destination,
      stops: this.stops.value,
      distance: Number(formValue.distance),
      estimatedDuration: Math.round(Number(formValue.estimatedDuration)),
      fareAmount: Number(formValue.fareAmount), // Keep for backward compatibility
      destinationFares: formValue.destinationFares,
      status: formValue.status
    };

    const request = this.editMode
      ? this.http.put(`${environment.apiUrl}/Routes/${this.editingRouteId}`, routeData)
      : this.http.post(`${environment.apiUrl}/Routes`, routeData);

    request.subscribe({
      next: () => {
        this.snackBar.open(
          this.editMode ? 'Route updated successfully!' : 'Route created successfully!',
          'Close',
          { duration: 3000 }
        );
        this.loadRoutes();
        this.resetForm();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error saving route:', error);
        console.error('Error details:', error.error);
        console.error('Route data sent:', routeData);
        const errorMessage = error.error?.message || error.error?.title || 'Failed to save route';
        this.snackBar.open(errorMessage, 'Close', { duration: 5000 });
        this.loading = false;
      }
    });
  }

  editRoute(route: Route): void {
    this.editMode = true;
    this.editingRouteId = route.id;
    
    // Clear existing stops
    while (this.stops.length) {
      this.stops.removeAt(0);
    }
    
    // Add stops from route
    route.stops.forEach(stop => {
      this.stops.push(this.fb.control(stop, Validators.required));
    });
    
    this.routeForm.patchValue({
      code: route.code,
      name: route.name,
      origin: route.origin,
      destination: route.destination,
      distance: route.distance,
      estimatedDuration: route.estimatedDuration,
      fareAmount: route.fareAmount,
      status: route.status
    });
  }

  deleteRoute(id: string): void {
    if (!confirm('Are you sure you want to delete this route?')) {
      return;
    }

    this.http.delete(`${environment.apiUrl}/Routes/${id}`)
      .subscribe({
        next: () => {
          this.snackBar.open('Route deleted successfully!', 'Close', { duration: 3000 });
          this.loadRoutes();
        },
        error: (error) => {
          console.error('Error deleting route:', error);
          this.snackBar.open('Failed to delete route', 'Close', { duration: 3000 });
        }
      });
  }

  resetForm(): void {
    this.editMode = false;
    this.editingRouteId = null;
    this.routeForm.reset({ status: 'Active' });
    while (this.stops.length) {
      this.stops.removeAt(0);
    }
  }
}
