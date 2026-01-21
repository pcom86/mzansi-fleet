import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

interface Association {
  id: string;
  name: string;
  code: string;
  contactEmail: string;
  contactPhone: string;
  tenantType: string;
  // Backend returns PascalCase
  Name?: string;
  Code?: string;
  ContactEmail?: string;
  ContactPhone?: string;
  TenantType?: string;
}

interface TaxiRank {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  city: string;
  address: string;
  capacity: number;
  status: string;
  routes?: Route[];
}

interface Route {
  id: string;
  tenantId: string;
  taxiRankId?: string;
  code: string;
  name: string;
  origin: string;
  destination: string;
  stops: string[];
  distance: number;
  estimatedDuration: number;
  fareAmount: number;
  status: string;
  vehicles?: Vehicle[];
}

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  capacity: number;
  status: string;
  isActive: boolean;
}

@Component({
  selector: 'app-rank-overview',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTabsModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './rank-overview.component.html',
  styleUrls: ['./rank-overview.component.scss']
})
export class RankOverviewComponent implements OnInit {
  loading = false;
  adminId: string | null = null;
  tenantId: string | null = null;
  
  // Association and hierarchy
  association: Association | null = null;
  taxiRanks: TaxiRank[] = [];
  expandedRanks = new Set<string>();
  expandedRoutes = new Set<string>();
  
  vehicleColumns = ['registrationNumber', 'make', 'model', 'year', 'capacity', 'status'];

  constructor(
    private http: HttpClient,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadAdminProfile();
  }

  loadAdminProfile(): void {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      console.log('Current user data:', userData);
      this.adminId = userData.userId;
      this.tenantId = userData.tenantId;
      
      console.log('Admin ID:', this.adminId);
      console.log('Tenant ID:', this.tenantId);
      
      if (this.tenantId) {
        this.loadAssociationData();
      }
    }
  }

  loadAssociationData(): void {
    this.loading = true;
    console.log('Loading association for tenantId:', this.tenantId);
    
    // Load association/tenant details
    this.http.get<Association>(`${environment.apiUrl}/Tenants/${this.tenantId}`)
      .subscribe({
        next: (association) => {
          console.log('Raw association data:', association);
          console.log('Association keys:', Object.keys(association));
          console.log('Association name (PascalCase):', (association as any).Name);
          console.log('Association name (camelCase):', association.name);
          this.association = association;
          console.log('Association assigned, calling loadTaxiRanks');
          this.loadTaxiRanks();
        },
        error: (error) => {
          console.error('Error loading association:', error);
          this.loading = false;
        }
      });
  }

  loadTaxiRanks(): void {
    console.log('Loading taxi ranks for tenant:', this.tenantId);
    
    this.http.get<TaxiRank[]>(`${environment.apiUrl}/TaxiRanks?tenantId=${this.tenantId}`)
      .subscribe({
        next: (ranks) => {
          console.log('Received ranks:', ranks);
          console.log('Ranks as JSON:', JSON.stringify(ranks, null, 2));
          console.log('Ranks array length:', ranks?.length || 0);
          console.log('Ranks is array:', Array.isArray(ranks));
          this.taxiRanks = ranks;
          
          // Load routes for each rank
          this.taxiRanks.forEach(rank => {
            this.loadRoutesForRank(rank);
          });
          
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading taxi ranks:', error);
          this.loading = false;
        }
      });
  }

  loadRoutesForRank(rank: TaxiRank): void {
    // Load all routes and filter by taxi rank
    this.http.get<Route[]>(`${environment.apiUrl}/Routes`)
      .subscribe({
        next: (routes) => {
          // Filter routes for this taxi rank
          rank.routes = routes.filter(r => r.taxiRankId === rank.id);
          console.log(`Loaded ${rank.routes.length} routes for rank ${rank.name} (taxiRankId: ${rank.id})`);
          console.log('All routes:', routes);
          console.log('Filtered routes:', rank.routes);
        },
        error: (error) => {
          console.error(`Error loading routes for rank ${rank.name}:`, error);
          rank.routes = [];
        }
      });
  }

  loadVehiclesForRoute(route: Route): void {
    // Load vehicles assigned to this route via VehicleRouteAssignments
    this.http.get<any[]>(`${environment.apiUrl}/VehicleRouteAssignments`)
      .subscribe({
        next: (assignments) => {
          console.log('All VehicleRouteAssignments:', assignments);
          
          // Filter assignments for this specific route
          const routeAssignments = assignments.filter(a => 
            a.routeId === route.id && 
            a.status === 'Active' && 
            a.vehicle
          );
          
          console.log(`Filtered assignments for route ${route.name} (${route.id}):`, routeAssignments);
          
          // Map to vehicle objects
          route.vehicles = routeAssignments.map(a => ({
            id: a.vehicle.id,
            registrationNumber: a.vehicle.registration || a.vehicle.registrationNumber || 'N/A',
            make: a.vehicle.make || 'N/A',
            model: a.vehicle.model || 'N/A',
            year: a.vehicle.year || 0,
            capacity: a.vehicle.capacity || 0,
            status: a.vehicle.status || 'Active',
            isActive: a.status === 'Active'
          }));
          
          console.log(`Loaded ${route.vehicles?.length || 0} vehicles for route ${route.name}`);
        },
        error: (error) => {
          console.error(`Error loading vehicles for route ${route.name}:`, error);
          route.vehicles = [];
        }
      });
  }

  toggleRank(rankId: string): void {
    if (this.expandedRanks.has(rankId)) {
      this.expandedRanks.delete(rankId);
    } else {
      this.expandedRanks.add(rankId);
    }
  }

  toggleRoute(routeId: string, route: Route): void {
    if (this.expandedRoutes.has(routeId)) {
      this.expandedRoutes.delete(routeId);
    } else {
      this.expandedRoutes.add(routeId);
      // Load vehicles when expanding route
      if (!route.vehicles) {
        this.loadVehiclesForRoute(route);
      }
    }
  }

  isRankExpanded(rankId: string): boolean {
    return this.expandedRanks.has(rankId);
  }

  isRouteExpanded(routeId: string): boolean {
    return this.expandedRoutes.has(routeId);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'departed':
        return 'primary';
      case 'intransit':
        return 'accent';
      case 'arrived':
      case 'completed':
        return 'warn';
      default:
        return '';
    }
  }

  openCreateTaxiRankDialog(): void {
    const dialogRef = this.dialog.open(CreateTaxiRankDialog, {
      width: '600px',
      data: { tenantId: this.tenantId, associationName: this.association?.name }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadAssociationData();
      }
    });
  }
}

// Create Taxi Rank Dialog Component
@Component({
  selector: 'app-create-taxi-rank-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>add_location</mat-icon>
      Create New Taxi Rank
    </h2>
    <mat-dialog-content>
      <form [formGroup]="taxiRankForm">
        <div class="form-info">
          <p><strong>Association:</strong> {{ data.associationName }}</p>
          <mat-icon class="info-icon">info</mat-icon>
          <p class="hint">This taxi rank will be linked to your taxi association</p>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Rank Name</mat-label>
          <input matInput formControlName="name" placeholder="e.g., Bree Street Taxi Rank">
          <mat-error *ngIf="taxiRankForm.get('name')?.hasError('required')">
            Rank name is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Rank Code</mat-label>
          <input matInput formControlName="code" placeholder="e.g., BST001">
          <mat-hint>Unique identifier for this rank</mat-hint>
          <mat-error *ngIf="taxiRankForm.get('code')?.hasError('required')">
            Rank code is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>City</mat-label>
          <input matInput formControlName="city" placeholder="e.g., Johannesburg">
          <mat-error *ngIf="taxiRankForm.get('city')?.hasError('required')">
            City is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Physical Address</mat-label>
          <textarea matInput formControlName="address" rows="2" 
            placeholder="Complete address of the taxi rank"></textarea>
          <mat-error *ngIf="taxiRankForm.get('address')?.hasError('required')">
            Address is required
          </mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Capacity (Number of Bays)</mat-label>
          <input matInput type="number" formControlName="capacity" placeholder="e.g., 50">
          <mat-hint>Maximum number of vehicles that can park simultaneously</mat-hint>
          <mat-error *ngIf="taxiRankForm.get('capacity')?.hasError('required')">
            Capacity is required
          </mat-error>
          <mat-error *ngIf="taxiRankForm.get('capacity')?.hasError('min')">
            Capacity must be at least 1
          </mat-error>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()" [disabled]="saving">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="!taxiRankForm.valid || saving">
        <mat-icon *ngIf="!saving">save</mat-icon>
        <mat-spinner *ngIf="saving" diameter="20"></mat-spinner>
        {{ saving ? 'Creating...' : 'Create Taxi Rank' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    mat-dialog-content {
      min-width: 500px;
      padding: 24px;
    }

    .form-info {
      background: #f5f5f5;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 24px;
      display: flex;
      flex-direction: column;
      gap: 8px;

      p {
        margin: 0;
        color: #666;
      }

      .info-icon {
        color: #673ab7;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .hint {
        font-size: 14px;
        color: #999;
      }
    }

    .full-width {
      width: 100%;
      margin-bottom: 16px;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #673ab7;

      mat-icon {
        color: #673ab7;
      }
    }

    mat-dialog-actions {
      padding: 16px 24px;

      button {
        mat-icon, mat-spinner {
          margin-right: 8px;
        }
      }
    }
  `]
})
export class CreateTaxiRankDialog {
  taxiRankForm: FormGroup;
  saving = false;

  constructor(
    public dialogRef: MatDialogRef<CreateTaxiRankDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {
    this.taxiRankForm = this.fb.group({
      name: ['', Validators.required],
      code: ['', Validators.required],
      city: ['', Validators.required],
      address: ['', Validators.required],
      capacity: [20, [Validators.required, Validators.min(1)]]
    });
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.taxiRankForm.valid) {
      this.saving = true;
      
      const taxiRankData = {
        ...this.taxiRankForm.value,
        tenantId: this.data.tenantId,
        status: 'Active'
      };

      this.http.post(`${environment.apiUrl}/TaxiRanks`, taxiRankData).subscribe({
        next: () => {
          this.snackBar.open('Taxi rank created successfully!', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (err) => {
          console.error('Error creating taxi rank:', err);
          this.snackBar.open('Failed to create taxi rank: ' + (err.error?.message || 'Unknown error'), 'Close', { duration: 5000 });
          this.saving = false;
        }
      });
    }
  }
}
