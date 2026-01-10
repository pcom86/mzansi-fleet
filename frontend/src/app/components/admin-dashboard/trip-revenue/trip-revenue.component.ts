import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

interface TripSummary {
  tripId: string;
  tripDate: string;
  vehicleRegistration: string;
  routeName: string;
  driverName: string;
  departureTime: string;
  arrivalTime: string;
  passengerCount: number;
  totalFare: number;
  vehicleEarnings: number;
  driverEarnings: number;
}

interface PeriodSummary {
  totalTrips: number;
  totalRevenue: number;
  totalVehicleEarnings: number;
  totalDriverEarnings: number;
  totalPassengers: number;
}

@Component({
  selector: 'app-trip-revenue',
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
    MatDatepickerModule,
    MatNativeDateModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  templateUrl: './trip-revenue.component.html',
  styleUrls: ['./trip-revenue.component.scss']
})
export class TripRevenueComponent implements OnInit {
  filterForm!: FormGroup;
  trips: TripSummary[] = [];
  periodSummary: PeriodSummary = {
    totalTrips: 0,
    totalRevenue: 0,
    totalVehicleEarnings: 0,
    totalDriverEarnings: 0,
    totalPassengers: 0
  };
  
  displayedColumns: string[] = [
    'tripDate',
    'vehicleRegistration',
    'routeName',
    'driverName',
    'departureTime',
    'passengerCount',
    'totalFare',
    'vehicleEarnings',
    'driverEarnings'
  ];
  
  loading = false;
  tenantId = '';
  taxiRankId = '';

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadUserData();
    this.loadTrips();
  }

  initializeForm(): void {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    this.filterForm = this.fb.group({
      startDate: [firstDayOfMonth],
      endDate: [today]
    });
  }

  loadUserData(): void {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      this.tenantId = userData.tenantId;
      // TaxiRankId might not be in user object, so make it optional
      this.taxiRankId = userData.taxiRankId || '';
    }
  }

  loadTrips(): void {
    this.loading = true;
    const startDate = this.filterForm.get('startDate')?.value;
    const endDate = this.filterForm.get('endDate')?.value;
    
    if (!startDate || !endDate) {
      this.snackBar.open('Please select both start and end dates', 'Close', { duration: 3000 });
      this.loading = false;
      return;
    }

    // Build params object, only include taxiRankId if it exists
    const params: any = {
      tenantId: this.tenantId,
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate)
    };

    // Only add taxiRankId if it's not empty
    if (this.taxiRankId) {
      params.taxiRankId = this.taxiRankId;
    }

    this.http.get<TripSummary[]>(`${environment.apiUrl}/TripDetails/revenue`, { params })
      .subscribe({
        next: (trips) => {
          this.trips = trips;
          this.calculateSummary();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading trips:', error);
          this.snackBar.open('Failed to load trip data', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  calculateSummary(): void {
    this.periodSummary = {
      totalTrips: this.trips.length,
      totalRevenue: this.trips.reduce((sum, trip) => sum + trip.totalFare, 0),
      totalVehicleEarnings: this.trips.reduce((sum, trip) => sum + trip.vehicleEarnings, 0),
      totalDriverEarnings: this.trips.reduce((sum, trip) => sum + trip.driverEarnings, 0),
      totalPassengers: this.trips.reduce((sum, trip) => sum + trip.passengerCount, 0)
    };
  }

  formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  onFilter(): void {
    this.loadTrips();
  }

  exportToCSV(): void {
    if (this.trips.length === 0) {
      this.snackBar.open('No data to export', 'Close', { duration: 3000 });
      return;
    }

    const headers = [
      'Trip Date',
      'Vehicle',
      'Route',
      'Driver',
      'Departure',
      'Passengers',
      'Total Fare',
      'Vehicle Earnings',
      'Driver Earnings'
    ];

    const csvData = this.trips.map(trip => [
      trip.tripDate,
      trip.vehicleRegistration,
      trip.routeName,
      trip.driverName,
      trip.departureTime,
      trip.passengerCount,
      trip.totalFare,
      trip.vehicleEarnings,
      trip.driverEarnings
    ]);

    const csv = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trip-revenue-${this.formatDate(new Date())}.csv`;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
