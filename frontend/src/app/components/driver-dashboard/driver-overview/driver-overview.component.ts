import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatDialogModule, MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RoadsideAssistanceService } from '../../../services/roadside-assistance.service';
import { CreateRoadsideAssistanceRequest } from '../../../models/roadside-assistance.model';

@Component({
  selector: 'app-driver-overview',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatPaginatorModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSnackBarModule,
    ReactiveFormsModule
  ],
  template: `
    <div class="driver-overview">
      <div class="loading" *ngIf="loading">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        <p>Loading your dashboard...</p>
      </div>

      <div *ngIf="!loading" class="overview-content">
        <!-- Driver Status Card -->
        <mat-card class="status-card">
          <mat-card-header>
            <mat-icon mat-card-avatar class="card-icon">person</mat-icon>
            <mat-card-title>Driver Status</mat-card-title>
            <mat-card-subtitle>Your current profile information</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="status-grid">
              <div class="status-item">
                <span class="label">Status:</span>
                <mat-chip [class.active-chip]="driverProfile?.isActive" [class.inactive-chip]="!driverProfile?.isActive">
                  {{ driverProfile?.isActive ? 'Active' : 'Inactive' }}
                </mat-chip>
              </div>
              <div class="status-item">
                <span class="label">Availability:</span>
                <mat-chip [class.available-chip]="driverProfile?.isAvailable" [class.unavailable-chip]="!driverProfile?.isAvailable">
                  {{ driverProfile?.isAvailable ? 'Available' : 'Unavailable' }}
                </mat-chip>
              </div>
              <div class="status-item">
                <span class="label">Email:</span>
                <span class="value">{{ driverProfile?.email }}</span>
              </div>
              <div class="status-item">
                <span class="label">Phone:</span>
                <span class="value">{{ driverProfile?.phone || 'Not provided' }}</span>
              </div>
              <div class="status-item">
                <span class="label">License Category:</span>
                <span class="value">{{ driverProfile?.category || 'Not specified' }}</span>
              </div>
              <div class="status-item" *ngIf="driverProfile?.hasPdp">
                <span class="label">PDP:</span>
                <mat-chip class="pdp-chip">✓ Certified</mat-chip>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Vehicle Assignment Card -->
        <mat-card class="vehicle-card">
          <mat-card-header>
            <mat-icon mat-card-avatar class="card-icon">directions_car</mat-icon>
            <mat-card-title>Vehicle Assignment</mat-card-title>
            <mat-card-subtitle>Your current assigned vehicle</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="assignedVehicle" class="vehicle-info">
              <div class="vehicle-detail">
                <mat-icon>directions_car</mat-icon>
                <div>
                  <strong>{{ assignedVehicle.make }} {{ assignedVehicle.model }}</strong>
                  <span class="vehicle-reg">{{ assignedVehicle.registration }}</span>
                </div>
              </div>
              <div class="vehicle-stats">
                <div class="stat-item">
                  <span class="stat-label">Year</span>
                  <span class="stat-value">{{ assignedVehicle.year }}</span>
                </div>
                <div class="stat-item">
                  <span class="stat-label">Status</span>
                  <span class="stat-value">{{ assignedVehicle.status }}</span>
                </div>
              </div>
            </div>
            <div *ngIf="!assignedVehicle" class="no-vehicle">
              <mat-icon>info</mat-icon>
              <p>No vehicle currently assigned</p>
              <span class="hint">Contact your administrator to get a vehicle assigned</span>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Quick Actions Card -->
        <mat-card class="actions-card">
          <mat-card-header>
            <mat-icon mat-card-avatar class="card-icon">dashboard</mat-icon>
            <mat-card-title>Quick Actions</mat-card-title>
            <mat-card-subtitle>Common tasks and shortcuts</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="action-grid">
              <button mat-raised-button color="accent" (click)="navigateTo('maintenance')">
                <mat-icon>build</mat-icon>
                <span>Maintenance</span>
              </button>
              <button mat-raised-button color="accent" (click)="navigateTo('trips')">
                <mat-icon>map</mat-icon>
                <span>Trip History</span>
              </button>
              <button mat-raised-button color="warn" (click)="requestRoadsideAssistance()">
                <mat-icon>local_shipping</mat-icon>
                <span>Roadside Assistance</span>
              </button>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Performance Summary Card -->
        <mat-card class="summary-card">
          <mat-card-header>
            <mat-icon mat-card-avatar class="card-icon">insights</mat-icon>
            <mat-card-title>This Month's Summary</mat-card-title>
            <mat-card-subtitle>Your performance at a glance</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="summary-grid">
              <div class="summary-item earnings">
                <mat-icon>trending_up</mat-icon>
                <div class="summary-details">
                  <span class="summary-label">Total Earnings</span>
                  <span class="summary-value">R {{ monthlyEarnings.toFixed(2) }}</span>
                </div>
              </div>
              <div class="summary-item expenses">
                <mat-icon>trending_down</mat-icon>
                <div class="summary-details">
                  <span class="summary-label">Total Expenses</span>
                  <span class="summary-value">R {{ monthlyExpenses.toFixed(2) }}</span>
                </div>
              </div>
              <div class="summary-item profit">
                <mat-icon>account_balance_wallet</mat-icon>
                <div class="summary-details">
                  <span class="summary-label">Net Profit</span>
                  <span class="summary-value">R {{ (monthlyEarnings - monthlyExpenses).toFixed(2) }}</span>
                </div>
              </div>
              <div class="summary-item trips">
                <mat-icon>local_shipping</mat-icon>
                <div class="summary-details">
                  <span class="summary-label">Total Trips</span>
                  <span class="summary-value">{{ monthlyTrips }}</span>
                </div>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Trip History Card -->
        <mat-card class="trip-history-card full-width">
          <mat-card-header>
            <mat-icon mat-card-avatar class="card-icon">history</mat-icon>
            <mat-card-title>Recent Trip History</mat-card-title>
            <mat-card-subtitle>Your last 10 trips</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="loadingTrips" class="loading-trips">
              <mat-progress-spinner mode="indeterminate" diameter="40"></mat-progress-spinner>
              <p>Loading trips...</p>
            </div>

            <div *ngIf="!loadingTrips && tripHistory.length === 0" class="no-trips">
              <mat-icon>info</mat-icon>
              <p>No trips found</p>
              <span class="hint">Your completed trips will appear here</span>
            </div>

            <div *ngIf="!loadingTrips && tripHistory.length > 0" class="trips-table-container">
              <table mat-table [dataSource]="tripHistory" class="trips-table">
                <!-- Date Column -->
                <ng-container matColumnDef="date">
                  <th mat-header-cell *matHeaderCellDef>Date</th>
                  <td mat-cell *matCellDef="let trip">{{ trip.tripDate | date:'short' }}</td>
                </ng-container>

                <!-- Route Column -->
                <ng-container matColumnDef="route">
                  <th mat-header-cell *matHeaderCellDef>Route</th>
                  <td mat-cell *matCellDef="let trip">{{ trip.routeName || 'N/A' }}</td>
                </ng-container>

                <!-- Passengers Column -->
                <ng-container matColumnDef="passengers">
                  <th mat-header-cell *matHeaderCellDef>Passengers</th>
                  <td mat-cell *matCellDef="let trip">{{ trip.passengerCount || 0 }}</td>
                </ng-container>

                <!-- Fare Column -->
                <ng-container matColumnDef="fare">
                  <th mat-header-cell *matHeaderCellDef>Total Fare</th>
                  <td mat-cell *matCellDef="let trip">R {{ trip.totalFare?.toFixed(2) || '0.00' }}</td>
                </ng-container>

                <!-- Status Column -->
                <ng-container matColumnDef="status">
                  <th mat-header-cell *matHeaderCellDef>Status</th>
                  <td mat-cell *matCellDef="let trip">
                    <mat-chip [class.completed-chip]="trip.status === 'Completed'" [class.pending-chip]="trip.status === 'Pending'">
                      {{ trip.status || 'Completed' }}
                    </mat-chip>
                  </td>
                </ng-container>

                <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
              </table>
            </div>
          </mat-card-content>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .driver-overview {
      padding: 1.5rem;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem;
      gap: 1.5rem;

      p {
        font-size: 1.1rem;
        color: #2196F3;
        font-weight: 500;
      }
    }

    .overview-content {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(380px, 1fr));

      .full-width {
        grid-column: 1 / -1;
      }
      gap: 1.5rem;
    }

    mat-card {
      border-radius: 16px;
      box-shadow: 0 2px 12px rgba(33, 150, 243, 0.1);
      transition: all 0.3s ease;

      &:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 24px rgba(33, 150, 243, 0.15);
      }
    }

    .card-icon {
      background: linear-gradient(135deg, #2196F3 0%, #00BCD4 100%);
      color: #FFFFFF;
      font-size: 28px;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 12px;
    }

    mat-card-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #0D47A1;
    }

    mat-card-subtitle {
      color: #2196F3;
      font-size: 0.9rem;
    }

    .status-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .status-item {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;

      .label {
        font-size: 0.85rem;
        color: #666;
        font-weight: 500;
      }

      .value {
        font-size: 0.95rem;
        color: #333;
        font-weight: 600;
      }
    }

    .active-chip {
      background: #4CAF50 !important;
      color: #FFFFFF !important;
    }

    .inactive-chip {
      background: #9E9E9E !important;
      color: #FFFFFF !important;
    }

    .available-chip {
      background: #2196F3 !important;
      color: #FFFFFF !important;
    }

    .unavailable-chip {
      background: #FF9800 !important;
      color: #FFFFFF !important;
    }

    .pdp-chip {
      background: #00BCD4 !important;
      color: #FFFFFF !important;
    }

    .vehicle-info {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      margin-top: 1rem;
    }

    .vehicle-detail {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: linear-gradient(135deg, #E3F2FD 0%, #F5F5F5 100%);
      border-radius: 12px;

      mat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        color: #2196F3;
      }

      div {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;

        strong {
          font-size: 1.1rem;
          color: #0D47A1;
        }

        .vehicle-reg {
          font-size: 0.9rem;
          color: #2196F3;
          font-weight: 600;
        }
      }
    }

    .vehicle-stats {
      display: flex;
      gap: 1rem;
    }

    .stat-item {
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      padding: 0.75rem;
      background: #F5F5F5;
      border-radius: 8px;
      text-align: center;

      .stat-label {
        font-size: 0.8rem;
        color: #666;
      }

      .stat-value {
        font-size: 1rem;
        font-weight: 600;
        color: #2196F3;
      }
    }

    .no-vehicle {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 2rem;
      text-align: center;
      color: #999;

      mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        color: #BDBDBD;
      }

      p {
        margin: 0;
        font-size: 1rem;
        font-weight: 500;
      }

      .hint {
        font-size: 0.85rem;
        color: #BDBDBD;
      }
    }

    .action-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-top: 1rem;

      button {
        padding: 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        height: auto;
        border-radius: 12px;

        mat-icon {
          font-size: 28px;
          width: 28px;
          height: 28px;
        }

        span {
          font-size: 0.9rem;
          font-weight: 600;
        }
      }
    }

    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .summary-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      border-radius: 12px;
      background: #F5F5F5;

      mat-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
      }

      &.earnings {
        background: linear-gradient(135deg, #E8F5E9 0%, #C8E6C9 100%);
        
        mat-icon {
          color: #4CAF50;
        }
      }

      &.expenses {
        background: linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%);
        
        mat-icon {
          color: #F44336;
        }
      }

      &.profit {
        background: linear-gradient(135deg, #E3F2FD 0%, #BBDEFB 100%);
        
        mat-icon {
          color: #2196F3;
        }
      }

      &.trips {
        background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
        
        mat-icon {
          color: #FF9800;
        }
      }
    }

    .summary-details {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;

      .summary-label {
        font-size: 0.85rem;
        color: #666;
        font-weight: 500;
      }

      .summary-value {
        font-size: 1.25rem;
        font-weight: 700;
        color: #333;
      }
    }

    @media (max-width: 768px) {
      .overview-content {
        grid-template-columns: 1fr;
      }

      .action-grid,
      .summary-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    .trip-history-card {
      .loading-trips {
        display: flex;
        align-items: center;
        gap: 1rem;
        padding: 2rem;
        justify-content: center;

        p {
          color: #2196F3;
          font-weight: 500;
        }
      }

      .no-trips {
        text-align: center;
        padding: 3rem;
        color: #666;

        mat-icon {
          font-size: 4rem;
          width: 4rem;
          height: 4rem;
          color: #999;
          margin-bottom: 1rem;
        }

        p {
          font-size: 1.2rem;
          margin: 0.5rem 0;
        }

        .hint {
          font-size: 0.9rem;
          color: #999;
        }
      }

      .trips-table-container {
        overflow-x: auto;
      }

      .trips-table {
        width: 100%;

        th {
          background-color: #f5f5f5;
          font-weight: 600;
          color: #333;
        }

        td {
          padding: 1rem 0.5rem;
        }

        .completed-chip {
          background-color: #4caf50 !important;
          color: white !important;
        }

        .pending-chip {
          background-color: #ff9800 !important;
          color: white !important;
        }
      }
    }
  `]
})
export class DriverOverviewComponent implements OnInit {
  loading = true;
  loadingTrips = false;
  driverProfile: any = null;
  assignedVehicle: any = null;
  monthlyEarnings = 0;
  monthlyExpenses = 0;
  monthlyTrips = 0;
  tripHistory: any[] = [];
  displayedColumns: string[] = ['date', 'route', 'passengers', 'fare', 'status'];

  constructor(
    private router: Router,
    private http: HttpClient,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private roadsideAssistanceService: RoadsideAssistanceService
  ) {}

  async ngOnInit() {
    await this.loadDriverData();
  }

  async loadDriverData() {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        this.router.navigate(['/login']);
        return;
      }

      const user = JSON.parse(userStr);
      const userId = user.id || user.userId;
      
      // Load driver profile
      const drivers: any = await this.http.get('http://localhost:5000/api/Identity/driverprofiles').toPromise();
      this.driverProfile = drivers.find((d: any) => 
        d.userId === userId || 
        d.id === userId ||
        d.email === user.email
      );

      if (this.driverProfile) {
        // Load assigned vehicle
        const vehicles: any = await this.http.get('http://localhost:5000/api/Vehicles').toPromise();
        this.assignedVehicle = vehicles.find((v: any) => 
          v.driverId === this.driverProfile.id || 
          v.id === this.driverProfile.assignedVehicleId ||
          (this.driverProfile.assignedVehicleId && v.id === this.driverProfile.assignedVehicleId)
        );
        
        console.log('Driver profile:', this.driverProfile);
        console.log('Assigned vehicle:', this.assignedVehicle);
        
        // Load monthly statistics and trip history
        await this.loadMonthlySummary();
        await this.loadTripHistory();
      }
    } catch (error) {
      console.error('Error loading driver data:', error);
    } finally {
      this.loading = false;
    }
  }

  async loadMonthlySummary() {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      if (!this.assignedVehicle) {
        console.log('No assigned vehicle, cannot load financial data');
        return;
      }

      // Load earnings using VehicleEarnings API
      try {
        const startDate = startOfMonth.toISOString().split('T')[0];
        const endDate = endOfMonth.toISOString().split('T')[0];
        const earnings: any = await this.http.get(
          `http://localhost:5000/api/VehicleEarnings/vehicle/${this.assignedVehicle.id}/period?startDate=${startDate}&endDate=${endDate}`
        ).toPromise();
        
        this.monthlyEarnings = Array.isArray(earnings) 
          ? earnings.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
          : 0;
        console.log('Monthly earnings loaded:', this.monthlyEarnings);
      } catch (err) {
        console.log('Error loading earnings:', err);
        this.monthlyEarnings = 0;
      }

      // Load expenses using VehicleExpenses API
      try {
        const startDate = startOfMonth.toISOString().split('T')[0];
        const endDate = endOfMonth.toISOString().split('T')[0];
        const expenses: any = await this.http.get(
          `http://localhost:5000/api/VehicleExpenses/vehicle/${this.assignedVehicle.id}/period?startDate=${startDate}&endDate=${endDate}`
        ).toPromise();
        
        this.monthlyExpenses = Array.isArray(expenses)
          ? expenses.reduce((sum: number, e: any) => sum + (e.amount || 0), 0)
          : 0;
        console.log('Monthly expenses loaded:', this.monthlyExpenses);
      } catch (err) {
        console.log('Error loading expenses:', err);
        this.monthlyExpenses = 0;
      }

      // Load trips using TripDetails API
      try {
        const allTrips: any = await this.http.get('http://localhost:5000/api/TripDetails').toPromise();
        const driverTrips = Array.isArray(allTrips)
          ? allTrips.filter((t: any) => {
              const tripDate = new Date(t.tripDate);
              return (
                (t.driverId === this.driverProfile.id || t.vehicleId === this.assignedVehicle?.id) &&
                tripDate >= startOfMonth &&
                tripDate <= endOfMonth
              );
            })
          : [];
        this.monthlyTrips = driverTrips.length;
        console.log('Monthly trips loaded:', this.monthlyTrips);
      } catch (err) {
        console.log('Error loading trips:', err);
        this.monthlyTrips = 0;
      }

    } catch (error) {
      console.error('Error loading monthly summary:', error);
    }
  }

  async loadTripHistory() {
    this.loadingTrips = true;
    try {
      if (!this.assignedVehicle && !this.driverProfile) {
        console.log('No vehicle or driver profile, cannot load trip history');
        this.tripHistory = [];
        return;
      }

      const allTrips: any = await this.http.get('http://localhost:5000/api/TripDetails').toPromise();
      
      if (Array.isArray(allTrips)) {
        // Filter trips for this driver/vehicle and get last 10
        this.tripHistory = allTrips
          .filter((t: any) => 
            t.driverId === this.driverProfile?.id || 
            t.vehicleId === this.assignedVehicle?.id
          )
          .sort((a: any, b: any) => {
            const dateA = new Date(a.tripDate).getTime();
            const dateB = new Date(b.tripDate).getTime();
            return dateB - dateA; // Most recent first
          })
          .slice(0, 10)
          .map((trip: any) => ({
            ...trip,
            routeName: trip.routeName || 'Direct Trip',
            status: trip.status || 'Completed'
          }));
        
        console.log('Trip history loaded:', this.tripHistory.length, 'trips');
      } else {
        this.tripHistory = [];
      }
    } catch (error) {
      console.error('Error loading trip history:', error);
      this.tripHistory = [];
    } finally {
      this.loadingTrips = false;
    }
  }

  navigateTo(route: string) {
    this.router.navigate(['/driver-dashboard/' + route]);
  }

  requestRoadsideAssistance() {
    // Open a dialog to collect roadside assistance request details
    const dialogRef = this.dialog.open(RoadsideAssistanceRequestDialog, {
      width: '500px',
      data: {
        assignedVehicle: this.assignedVehicle,
        driverProfile: this.driverProfile
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.submitRoadsideAssistanceRequest(result);
      }
    });
  }

  private submitRoadsideAssistanceRequest(requestData: any) {
    const request: CreateRoadsideAssistanceRequest = {
      vehicleId: requestData.vehicleId,
      assistanceType: requestData.assistanceType,
      location: requestData.location,
      latitude: requestData.latitude?.toString(),
      longitude: requestData.longitude?.toString(),
      issueDescription: requestData.issueDescription,
      additionalNotes: requestData.additionalNotes,
      priority: requestData.priority
    };

    this.roadsideAssistanceService.createRequest(request).subscribe({
      next: (response) => {
        this.snackBar.open('Roadside assistance request submitted successfully!', 'Close', {
          duration: 5000,
          panelClass: 'success-snackbar'
        });
        console.log('Roadside assistance request created:', response);
      },
      error: (error) => {
        console.error('Error submitting roadside assistance request:', error);
        const errorMessage = error?.error?.message || error?.message || 'Unknown error occurred';
        this.snackBar.open(`Failed to submit roadside assistance request: ${errorMessage}`, 'Close', {
          duration: 5000,
          panelClass: 'error-snackbar'
        });
      }
    });
  }
}

// Roadside Assistance Request Dialog Component
@Component({
  selector: 'roadside-assistance-request-dialog',
  template: `
    <h2 mat-dialog-title>Request Roadside Assistance</h2>
    <mat-dialog-content>
      <form [formGroup]="requestForm" class="request-form">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Assistance Type</mat-label>
          <mat-select formControlName="assistanceType" required>
            <mat-option value="Towing">Towing</mat-option>
            <mat-option value="Battery Jump Start">Battery Jump Start</mat-option>
            <mat-option value="Flat Tire">Flat Tire</mat-option>
            <mat-option value="Fuel Delivery">Fuel Delivery</mat-option>
            <mat-option value="Lockout">Lockout</mat-option>
            <mat-option value="Mechanical Breakdown">Mechanical Breakdown</mat-option>
            <mat-option value="Other">Other</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Location</mat-label>
          <input matInput formControlName="location" placeholder="Current location or address" required>
        </mat-form-field>

        <div class="coordinates-row">
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Latitude</mat-label>
            <input matInput type="number" formControlName="latitude" step="0.000001">
          </mat-form-field>
          <mat-form-field appearance="outline" class="half-width">
            <mat-label>Longitude</mat-label>
            <input matInput type="number" formControlName="longitude" step="0.000001">
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Issue Description</mat-label>
          <textarea matInput formControlName="issueDescription" rows="3" 
                    placeholder="Describe the issue you're experiencing" required></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Additional Notes</mat-label>
          <textarea matInput formControlName="additionalNotes" rows="2" 
                    placeholder="Any additional information that might help"></textarea>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Priority</mat-label>
          <mat-select formControlName="priority">
            <mat-option value="Low">Low</mat-option>
            <mat-option value="Medium">Medium</mat-option>
            <mat-option value="High">High</mat-option>
            <mat-option value="Emergency">Emergency</mat-option>
          </mat-select>
        </mat-form-field>

        <div class="vehicle-info" *ngIf="data.assignedVehicle">
          <mat-icon>directions_car</mat-icon>
          <span>Vehicle: {{ data.assignedVehicle.make }} {{ data.assignedVehicle.model }} ({{ data.assignedVehicle.registration }})</span>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancel</button>
      <button mat-raised-button color="primary" 
              [disabled]="requestForm.invalid || loading"
              (click)="submitRequest()">
        <mat-icon *ngIf="loading">hourglass_empty</mat-icon>
        <span *ngIf="!loading">Submit Request</span>
        <span *ngIf="loading">Submitting...</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .request-form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 400px;
    }

    .full-width {
      width: 100%;
    }

    .half-width {
      width: calc(50% - 8px);
    }

    .coordinates-row {
      display: flex;
      gap: 16px;
    }

    .vehicle-info {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px;
      background: #f5f5f5;
      border-radius: 8px;
      font-size: 14px;
      color: #666;
    }

    mat-dialog-actions {
      padding: 16px 24px;
    }
  `],
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    ReactiveFormsModule
  ]
})
export class RoadsideAssistanceRequestDialog {
  requestForm: FormGroup;
  loading = false;

  constructor(
    public dialogRef: MatDialogRef<RoadsideAssistanceRequestDialog>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder
  ) {
    this.requestForm = this.fb.group({
      assistanceType: ['', Validators.required],
      location: ['', Validators.required],
      latitude: [null],
      longitude: [null],
      issueDescription: ['', Validators.required],
      additionalNotes: [''],
      priority: ['Medium']
    });

    // Try to get current location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.requestForm.patchValue({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
        },
        (error) => {
          console.log('Could not get location:', error);
        }
      );
    }
  }

  submitRequest() {
    if (this.requestForm.valid) {
      const formValue = this.requestForm.value;
      const requestData = {
        ...formValue,
        vehicleId: this.data.assignedVehicle?.id
      };
      this.dialogRef.close(requestData);
    }
  }
}
