import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

interface Trip {
  id: string;
  tripDate: string;
  vehicleId: string;
  routeId: string;
  driverId: string;
  departureTime: string;
  arrivalTime: string;
  passengerCount: number;
  totalFare: number;
  status: string;
  vehicleRegistration?: string;
  routeName?: string;
  driverName?: string;
  passengers?: Passenger[]; // Passengers are included in the trip data
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

@Component({
  selector: 'app-marshal-trip-history',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatToolbarModule,
    MatSnackBarModule,
    MatTooltipModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    FormsModule
  ],
  templateUrl: './marshal-trip-history.component.html',
  styleUrls: ['./marshal-trip-history.component.scss']
})
export class MarshalTripHistoryComponent implements OnInit {
  trips: Trip[] = [];
  filteredTrips: Trip[] = [];
  loading = false;
  displayedColumns: string[] = ['tripDate', 'vehicle', 'route', 'driver', 'departure', 'passengers', 'fare', 'status', 'actions'];
  userData: any;
  marshalProfile: any;
  vehicles: any[] = [];
  routes: any[] = [];
  drivers: any[] = [];

  // Filter properties
  filterDateFrom: string = '';
  filterDateTo: string = '';
  filterVehicle: string = '';
  filterRoute: string = '';
  filterDriver: string = '';
  filterStatus: string = '';

  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
      this.loadMarshalProfile();
    }
  }

  loadMarshalProfile(): void {
    const url = `${environment.apiUrl}/TaxiRankUsers/marshals?tenantId=${this.userData.tenantId}`;
    
    this.http.get<any[]>(url).subscribe({
      next: (marshals) => {
        this.marshalProfile = marshals.find(m => m.userId === this.userData.userId);
        if (this.marshalProfile && this.marshalProfile.taxiRankId) {
          this.loadReferenceData();
        } else {
          this.snackBar.open('No taxi rank assigned to marshal', 'Close', { duration: 3000 });
        }
      },
      error: (error) => {
        console.error('Error loading marshal profile:', error);
        this.snackBar.open('Failed to load marshal profile', 'Close', { duration: 3000 });
      }
    });
  }

  loadReferenceData(): void {
    // Load vehicles, routes, and drivers first, then load trips
    Promise.all([
      this.http.get<any[]>(`${environment.apiUrl}/Vehicles`).toPromise(),
      this.http.get<any[]>(`${environment.apiUrl}/Routes`).toPromise(),
      this.http.get<any[]>(`${environment.apiUrl}/Drivers`).toPromise()
    ]).then(([vehicles, routes, drivers]) => {
      this.vehicles = vehicles || [];
      this.routes = routes || [];
      this.drivers = drivers || [];
      this.loadTrips();
    }).catch(error => {
      console.error('Error loading reference data:', error);
      this.loadTrips(); // Still try to load trips even if reference data fails
    });
  }

  loadTrips(): void {
    this.loading = true;

    // Get all trips and filter by vehicles assigned to this taxi rank
    const url = `${environment.apiUrl}/TripDetails`;
    
    this.http.get<Trip[]>(url).subscribe({
      next: (trips) => {
        // Filter trips by vehicles that belong to the marshal's taxi rank
        this.filterTripsByRank(trips);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading trips:', error);
        this.snackBar.open('Failed to load trips', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  filterTripsByRank(trips: Trip[]): void {
    // Filter routes that belong to this taxi rank
    const rankRoutes = this.routes.filter(r => r.taxiRankId === this.marshalProfile.taxiRankId);
    const rankRouteIds = rankRoutes.map(r => r.id);

    // Filter trips that used routes from this rank
    this.trips = trips.filter(trip => rankRouteIds.includes(trip.routeId));
    
    // Add reference data
    this.trips.forEach(trip => {
      const vehicle = this.vehicles.find(v => v.id === trip.vehicleId);
      const route = this.routes.find(r => r.id === trip.routeId);
      const driver = this.drivers.find(d => d.id === trip.driverId);
      
      trip.vehicleRegistration = vehicle?.registration || 'Unknown';
      trip.routeName = route?.name || 'Unknown';
      trip.driverName = driver?.name || 'Unknown';
    });

    // Sort by date descending
    this.trips.sort((a, b) => new Date(b.tripDate).getTime() - new Date(a.tripDate).getTime());
    
    // Apply filters
    this.applyFilters();
  }

  applyFilters(): void {
    this.filteredTrips = this.trips.filter(trip => {
      // Date from filter
      if (this.filterDateFrom && new Date(trip.tripDate) < new Date(this.filterDateFrom)) {
        return false;
      }
      
      // Date to filter
      if (this.filterDateTo && new Date(trip.tripDate) > new Date(this.filterDateTo + 'T23:59:59')) {
        return false;
      }
      
      // Vehicle filter
      if (this.filterVehicle && trip.vehicleId !== this.filterVehicle) {
        return false;
      }
      
      // Route filter
      if (this.filterRoute && trip.routeId !== this.filterRoute) {
        return false;
      }
      
      // Driver filter
      if (this.filterDriver && trip.driverId !== this.filterDriver) {
        return false;
      }
      
      // Status filter
      if (this.filterStatus && trip.status !== this.filterStatus) {
        return false;
      }
      
      return true;
    });
  }

  onFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.filterDateFrom = '';
    this.filterDateTo = '';
    this.filterVehicle = '';
    this.filterRoute = '';
    this.filterDriver = '';
    this.filterStatus = '';
    this.applyFilters();
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  }

  goToDashboard(): void {
    this.router.navigate(['/marshal-dashboard']);
  }

  viewTripDetails(trip: Trip): void {
    this.dialog.open(TripDetailsDialogComponent, {
      width: '800px',
      maxHeight: '90vh',
      data: trip
    });
  }
}

// Trip Details Dialog Component
@Component({
  selector: 'app-trip-details-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatTableModule,
    MatProgressSpinnerModule,
    MatTooltipModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>receipt_long</mat-icon>
      Trip Details
    </h2>
    <mat-dialog-content>
      <div class="trip-details-content">
        <mat-card class="detail-section">
          <mat-card-header>
            <mat-card-title>Basic Information</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Trip Date:</span>
                <span class="value">{{ formatDate(data.tripDate) }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Status:</span>
                <span class="value status-badge" [class.completed]="data.status === 'Completed'">
                  {{ data.status }}
                </span>
              </div>
              <div class="detail-item">
                <span class="label">Departure Time:</span>
                <span class="value">{{ data.departureTime || 'N/A' }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Arrival Time:</span>
                <span class="value">{{ data.arrivalTime || 'N/A' }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="detail-section">
          <mat-card-header>
            <mat-card-title>Vehicle & Route</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Vehicle:</span>
                <span class="value">{{ data.vehicleRegistration }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Route:</span>
                <span class="value">{{ data.routeName }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Driver:</span>
                <span class="value">{{ data.driverName }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="detail-section">
          <mat-card-header>
            <mat-card-title>Passenger & Fare Information</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="detail-grid">
              <div class="detail-item">
                <span class="label">Number of Passengers:</span>
                <span class="value">{{ data.passengerCount }}</span>
              </div>
              <div class="detail-item">
                <span class="label">Total Fare Collected:</span>
                <span class="value fare-amount">R {{ data.totalFare | number:'1.2-2' }}</span>
              </div>
            </div>
          </mat-card-content>
        </mat-card>

        <mat-card class="detail-section">
          <mat-card-header>
            <mat-card-title>
              <mat-icon>people</mat-icon>
              Passenger List
              <button mat-icon-button 
                      *ngIf="data.passengerListFileName" 
                      (click)="downloadPassengerList()" 
                      matTooltip="Download attached passenger list"
                      class="download-btn">
                <mat-icon>download</mat-icon>
              </button>
            </mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div *ngIf="loadingPassengers" class="loading-container">
              <mat-spinner diameter="40"></mat-spinner>
              <p>Loading passengers...</p>
            </div>

            <div *ngIf="!loadingPassengers && passengers.length === 0" class="no-data">
              <mat-icon>info</mat-icon>
              <p>No passenger records found for this trip</p>
            </div>

            <table mat-table [dataSource]="passengers" *ngIf="!loadingPassengers && passengers.length > 0" class="passengers-table">
              <!-- Seat Number Column -->
              <ng-container matColumnDef="seat">
                <th mat-header-cell *matHeaderCellDef>Name</th>
                <td mat-cell *matCellDef="let passenger">{{ passenger.name }}</td>
              </ng-container>

              <!-- Contact Column -->
              <ng-container matColumnDef="name">
                <th mat-header-cell *matHeaderCellDef>Contact</th>
                <td mat-cell *matCellDef="let passenger">{{ passenger.contactNumber || '-' }}</td>
              </ng-container>

              <!-- Destination Column -->
              <ng-container matColumnDef="departure">
                <th mat-header-cell *matHeaderCellDef>Destination</th>
                <td mat-cell *matCellDef="let passenger">{{ passenger.destination || '-' }}</td>
              </ng-container>

              <!-- Next of Kin Column -->
              <ng-container matColumnDef="arrival">
                <th mat-header-cell *matHeaderCellDef>Next of Kin</th>
                <td mat-cell *matCellDef="let passenger">{{ passenger.nextOfKin || '-' }}</td>
              </ng-container>

              <!-- Amount Column -->
              <ng-container matColumnDef="amount">
                <th mat-header-cell *matHeaderCellDef>Fare</th>
                <td mat-cell *matCellDef="let passenger" class="amount-cell">
                  R {{ passenger.fareAmount | number:'1.2-2' }}
                </td>
              </ng-container>

              <!-- Next of Kin Contact Column -->
              <ng-container matColumnDef="phone">
                <th mat-header-cell *matHeaderCellDef>Next of Kin Contact</th>
                <td mat-cell *matCellDef="let passenger">{{ passenger.nextOfKinContact || '-' }}</td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedPassengerColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedPassengerColumns;"></tr>
            </table>
          </mat-card-content>
        </mat-card>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .trip-details-content {
      padding: 16px 0;
    }

    .detail-section {
      margin-bottom: 16px;
    }

    .detail-section:last-child {
      margin-bottom: 0;
    }

    mat-card-title {
      font-size: 16px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 8px;
      justify-content: space-between;
      width: 100%;
    }

    .download-btn {
      margin-left: auto;
      color: #1976d2;
    }

    .download-btn:hover {
      background-color: #e3f2fd;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 12px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .label {
      font-size: 12px;
      color: #666;
      font-weight: 500;
      text-transform: uppercase;
    }

    .value {
      font-size: 14px;
      color: #333;
    }

    .fare-amount {
      font-size: 18px;
      font-weight: 600;
      color: #4caf50;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
      background-color: #f0f0f0;
      color: #666;
    }

    .status-badge.completed {
      background-color: #e8f5e9;
      color: #2e7d32;
    }

    mat-dialog-actions {
      padding: 16px 24px;
    }

    h2[mat-dialog-title] {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0;
      padding: 16px 24px;
      border-bottom: 1px solid #e0e0e0;
    }

    mat-dialog-content {
      max-height: 70vh;
      overflow-y: auto;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px;
      gap: 16px;
    }

    .loading-container p {
      margin: 0;
      color: #666;
    }

    .no-data {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 32px;
      gap: 8px;
      color: #999;
    }

    .no-data mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }

    .no-data p {
      margin: 0;
    }

    .passengers-table {
      width: 100%;
      margin-top: 16px;
    }

    .passengers-table th {
      font-weight: 600;
      color: #666;
      background-color: #f5f5f5;
    }

    .passengers-table td {
      padding: 12px 8px;
    }

    .amount-cell {
      font-weight: 600;
      color: #4caf50;
    }
  `]
})
export class TripDetailsDialogComponent implements OnInit {
  passengers: Passenger[] = [];
  loadingPassengers = false;
  displayedPassengerColumns: string[] = ['seat', 'name', 'departure', 'arrival', 'amount', 'phone'];

  constructor(
    @Inject(MAT_DIALOG_DATA) public data: Trip,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    // Passengers are already included in the trip data
    this.passengers = this.data.passengers || [];
  }

  downloadPassengerList(): void {
    console.log('Download button clicked');
    console.log('File name:', this.data.passengerListFileName);
    console.log('File data exists:', !!this.data.passengerListFileData);
    console.log('File data length:', this.data.passengerListFileData?.length);
    
    if (!this.data.passengerListFileData || !this.data.passengerListFileName) {
      console.warn('No file data or filename available');
      alert('No passenger list file is attached to this trip.');
      return;
    }

    try {
      console.log('Cleaning and decoding base64 data...');
      
      // Clean the base64 string - remove whitespace and newlines
      let base64Data = this.data.passengerListFileData.trim();
      base64Data = base64Data.replace(/\s/g, '');
      base64Data = base64Data.replace(/\n/g, '');
      base64Data = base64Data.replace(/\r/g, '');
      
      console.log('Cleaned base64 length:', base64Data.length);
      console.log('First 50 chars:', base64Data.substring(0, 50));
      
      // Decode base64 data
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      
      // Determine MIME type based on file extension
      const fileName = this.data.passengerListFileName;
      const extension = fileName.split('.').pop()?.toLowerCase();
      let mimeType = 'application/octet-stream';
      
      if (extension === 'pdf') {
        mimeType = 'application/pdf';
      } else if (extension === 'xlsx' || extension === 'xls') {
        mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      } else if (extension === 'csv') {
        mimeType = 'text/csv';
      } else if (extension === 'txt') {
        mimeType = 'text/plain';
      }
      
      console.log('Creating blob with MIME type:', mimeType);
      console.log('File name:', fileName);
      console.log('Blob size:', byteArray.length, 'bytes');
      
      // Create blob and download
      const blob = new Blob([byteArray], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link); // Append to body for Firefox compatibility
      link.click();
      document.body.removeChild(link); // Clean up
      window.URL.revokeObjectURL(url);
      
      console.log('Download triggered successfully');
    } catch (error) {
      console.error('Error downloading passenger list:', error);
      console.error('Error details:', error);
      alert(`Failed to download file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }
}
