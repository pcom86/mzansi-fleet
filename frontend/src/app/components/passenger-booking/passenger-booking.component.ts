import { Component, OnInit, Inject, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, FormArray, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatStepperModule } from '@angular/material/stepper';
import { MatRadioModule } from '@angular/material/radio';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule, MatTabGroup } from '@angular/material/tabs';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { environment } from '../../../environments/environment';

interface PassengerCartItem {
  passengerName: string;
  passengerPhone: string;
  departureStation: string;
  arrivalStation: string;
  seatNumber?: number;
  amount: number;
}

interface TaxiRank {
  id: string;
  name: string;
  location: string;
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

interface AvailableTrip {
  id: string;
  departureTime: string;
  departureDate: string;
  vehicleRegistration: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  vehicleType: string;
  vehicleStatus: string;
  driverName: string;
  driverPhone: string;
  driverExperience: string;
  driverCategory: string;
  driverIsActive: boolean;
  driverIsAvailable: boolean;
  availableSeats: number;
  maxPassengers: number;
  fareAmount: number;
}

interface BookingRequest {
  tripId: string;
  passengerName: string;
  passengerPhone: string;
  departureStation: string;
  arrivalStation: string;
  amount: number;
  seatNumber?: number;
  paymentMethod: string;
  notes?: string;
}

interface BookedTrip {
  id: string;
  departureTime: string;
  departureDate: string;
  vehicleRegistration: string;
  vehicleMake: string;
  vehicleModel: string;
  driverName: string;
  driverPhone: string;
  departureStation: string;
  destinationStation: string;
  status: string;
  bookingDate: string;
  amount: number;
  seatNumber?: number;
  notes: string;
}

@Component({
  selector: 'app-passenger-booking',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSelectModule,
    MatStepperModule,
    MatRadioModule,
    MatSnackBarModule,
    MatTabsModule
  ],
  templateUrl: './passenger-booking.component.html',
  styleUrls: ['./passenger-booking.component.scss']
})
export class PassengerBookingComponent implements OnInit {
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;
  
  searchForm!: FormGroup;
  bookingForm!: FormGroup;
  taxiRanks: TaxiRank[] = [];
  routes: Route[] = [];
  availableTrips: AvailableTrip[] = [];
  filteredTrips: AvailableTrip[] = [];
  selectedTrip: AvailableTrip | null = null;
  loading = false;
  step = 0; // 0: Search, 1: Select Trip, 2: Booking Details, 3: Payment, 4: Confirmation

  // My Bookings
  bookedTrips: BookedTrip[] = [];
  bookingColumns: string[] = ['bookingDate', 'departureDateTime', 'route', 'vehicle', 'driver', 'amount', 'status'];

  // Search and filter properties
  tripSearchTerm = '';
  vehicleTypeFilter = '';
  driverStatusFilter = '';

  // Multi-passenger booking
  passengerCart: PassengerCartItem[] = [];
  selectedTabIndex = 0;

  displayedColumns: string[] = ['departureDateTime', 'vehicle', 'driver', 'availableSeats', 'fareAmount', 'actions'];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private router: Router,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    this.initializeForms();
    this.loadTaxiRanks();
    this.loadUserBookings();
  }

  onTabChange(event: any): void {
    if (event.index === 1) { // My Bookings tab
      this.loadUserBookings();
    }
  }

  initializeForms(): void {
    this.searchForm = this.fb.group({
      taxiRankId: ['', Validators.required],
      routeId: ['', Validators.required]
    });

    this.bookingForm = this.fb.group({
      passengerName: ['', Validators.required],
      passengerPhone: ['', [Validators.required, Validators.pattern(/^(\+27|0)[6-8][0-9]{8}$/)]],
      departureStation: ['', Validators.required],
      arrivalStation: ['', Validators.required],
      seatNumber: [''],
      paymentMethod: ['eft', Validators.required],
      notes: ['']
    });

    // Set up cascading dropdowns
    this.searchForm.get('taxiRankId')?.valueChanges.subscribe(value => {
      if (value) {
        this.loadRoutesForTaxiRank(value);
        this.searchForm.patchValue({ routeId: '' });
        this.availableTrips = [];
        this.selectedTrip = null;
        this.step = 0;
      }
    });
  }

  loadTaxiRanks(): void {
    this.http.get<TaxiRank[]>(`${environment.apiUrl}/TaxiRanks`)
      .subscribe({
        next: (ranks) => this.taxiRanks = ranks,
        error: (error) => {
          console.error('Error loading taxi ranks:', error);
          this.snackBar.open('Failed to load taxi ranks', 'Close', { duration: 3000 });
        }
      });
  }

  loadUserBookings(): void {
    const userInfo = this.authService.getCurrentUserInfo();
    console.log('Current user info:', userInfo);
    console.log('Is user logged in:', this.authService.isLoggedIn());

    if (userInfo?.userId) {
      console.log('Loading bookings for user:', userInfo.userId);
      this.http.get<BookedTrip[]>(`${environment.apiUrl}/TaxiRankTrips/user/${userInfo.userId}`)
        .subscribe({
          next: (bookings) => {
            console.log('Loaded bookings:', bookings);
            this.bookedTrips = bookings;
          },
          error: (error) => {
            console.error('Error loading user bookings:', error);
            this.snackBar.open('Failed to load your bookings', 'Close', { duration: 3000 });
          }
        });
    } else {
      console.log('No user ID found, user not logged in or userInfo is null');
    }
  }

  loadRoutesForTaxiRank(taxiRankId: string): void {
    this.http.get<Route[]>(`${environment.apiUrl}/Routes?taxiRankId=${taxiRankId}`)
      .subscribe({
        next: (routes) => this.routes = routes,
        error: (error) => {
          console.error('Error loading routes:', error);
          this.snackBar.open('Failed to load routes', 'Close', { duration: 3000 });
        }
      });
  }

  searchTrips(): void {
    if (this.searchForm.invalid) {
      this.snackBar.open('Please select both taxi rank and route', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    const { taxiRankId, routeId } = this.searchForm.value;

    // Get route details for fallback
    const selectedRoute = this.routes.find(r => r.id === routeId);
    const origin = selectedRoute?.origin || '';
    const destination = selectedRoute?.destination || '';

    this.http.get<AvailableTrip[]>(`${environment.apiUrl}/TaxiRankTrips/available?taxiRankId=${taxiRankId}&routeId=${routeId}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}`)
      .subscribe({
        next: (trips) => {
          this.availableTrips = trips;
          this.filteredTrips = [...trips]; // Initialize filtered trips
          this.loading = false;
          this.step = 1;
        },
        error: (error) => {
          console.error('Error loading available trips:', error);
          this.snackBar.open('Failed to load available trips', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  selectTrip(trip: AvailableTrip): void {
    this.selectedTrip = trip;
    this.passengerCart = []; // Clear cart when selecting new trip
    this.step = 2;

    // Pre-populate booking form with route stations
    const selectedRoute = this.routes.find(r => r.id === this.searchForm.value.routeId);
    if (selectedRoute) {
      this.bookingForm.patchValue({
        departureStation: selectedRoute.origin,
        arrivalStation: selectedRoute.destination
      });
    }
  }

  // Multi-passenger cart methods
  addPassengerToCart(): void {
    if (this.bookingForm.invalid) {
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    if (!this.selectedTrip) return;

    // Check if there are enough available seats
    if (this.passengerCart.length >= this.selectedTrip.availableSeats) {
      this.snackBar.open('No more seats available on this trip', 'Close', { duration: 3000 });
      return;
    }

    const passenger: PassengerCartItem = {
      passengerName: this.bookingForm.value.passengerName,
      passengerPhone: this.bookingForm.value.passengerPhone,
      departureStation: this.bookingForm.value.departureStation,
      arrivalStation: this.bookingForm.value.arrivalStation,
      seatNumber: this.bookingForm.value.seatNumber || undefined,
      amount: this.selectedTrip.fareAmount
    };

    this.passengerCart.push(passenger);
    this.snackBar.open(`${passenger.passengerName} added to booking`, 'Close', { duration: 2000 });
    
    // Reset form for next passenger keeping the stations
    const stations = {
      departureStation: this.bookingForm.value.departureStation,
      arrivalStation: this.bookingForm.value.arrivalStation,
      paymentMethod: this.bookingForm.value.paymentMethod
    };
    this.bookingForm.reset();
    this.bookingForm.patchValue(stations);
  }

  removePassengerFromCart(index: number): void {
    const removed = this.passengerCart.splice(index, 1);
    if (removed.length) {
      this.snackBar.open(`${removed[0].passengerName} removed from booking`, 'Close', { duration: 2000 });
    }
  }

  getCartTotal(): number {
    return this.passengerCart.reduce((sum, p) => sum + p.amount, 0);
  }

  proceedToPayment(): void {
    if (this.passengerCart.length === 0) {
      this.snackBar.open('Please add at least one passenger to the booking', 'Close', { duration: 3000 });
      return;
    }
    this.step = 3;
  }

  confirmBooking(): void {
    if (!this.selectedTrip || this.passengerCart.length === 0) return;

    this.loading = true;
    const paymentMethod = this.bookingForm.value.paymentMethod || 'cash';
    const notes = this.bookingForm.value.notes || '';

    // Book all passengers
    const bookingPromises = this.passengerCart.map(passenger => 
      this.http.post(`${environment.apiUrl}/TaxiRankTrips/${this.selectedTrip!.id}/passengers`, {
        passengerName: passenger.passengerName,
        passengerPhone: passenger.passengerPhone,
        departureStation: passenger.departureStation,
        arrivalStation: passenger.arrivalStation,
        amount: passenger.amount,
        seatNumber: passenger.seatNumber,
        notes: `Payment Method: ${paymentMethod}. ${notes}`
      }).toPromise()
    );

    Promise.all(bookingPromises)
      .then(() => {
        const passengerCount = this.passengerCart.length;
        const totalAmount = this.getCartTotal();
        this.snackBar.open(`${passengerCount} passenger(s) booked successfully! Total: R${totalAmount}`, 'Close', { duration: 4000 });
        this.loading = false;
        this.step = 4;
        // Reload user bookings after successful booking
        this.loadUserBookings();
        // Switch to My Bookings tab after delay to show confirmation
        setTimeout(() => {
          this.selectedTabIndex = 1;
          this.resetBooking();
        }, 2000);
      })
      .catch((error) => {
        console.error('Error creating booking:', error);
        this.snackBar.open('Failed to confirm booking', 'Close', { duration: 3000 });
        this.loading = false;
      });
  }

  resetBooking(): void {
    this.selectedTrip = null;
    this.bookingForm.reset();
    this.passengerCart = [];
    this.step = 0;
  }

  goBack(): void {
    if (this.step > 0) {
      this.step--;
    }
  }

  // Filter and search methods
  filterTrips(): void {
    let filtered = [...this.availableTrips];

    // Text search
    if (this.tripSearchTerm.trim()) {
      const searchTerm = this.tripSearchTerm.toLowerCase();
      filtered = filtered.filter(trip =>
        trip.vehicleRegistration.toLowerCase().includes(searchTerm) ||
        trip.vehicleMake.toLowerCase().includes(searchTerm) ||
        trip.vehicleModel.toLowerCase().includes(searchTerm) ||
        trip.driverName.toLowerCase().includes(searchTerm) ||
        trip.driverPhone.includes(searchTerm) ||
        trip.departureTime.includes(searchTerm) ||
        trip.departureDate.includes(searchTerm)
      );
    }

    // Vehicle type filter
    if (this.vehicleTypeFilter) {
      filtered = filtered.filter(trip => trip.vehicleType === this.vehicleTypeFilter);
    }

    // Driver status filter
    if (this.driverStatusFilter) {
      if (this.driverStatusFilter === 'available') {
        filtered = filtered.filter(trip => trip.driverIsAvailable);
      } else if (this.driverStatusFilter === 'active') {
        filtered = filtered.filter(trip => trip.driverIsActive);
      }
    }

    this.filteredTrips = filtered;
  }

  clearFilters(): void {
    this.tripSearchTerm = '';
    this.vehicleTypeFilter = '';
    this.driverStatusFilter = '';
    this.filteredTrips = [...this.availableTrips];
  }

  getUniqueVehicleTypes(): string[] {
    const types = this.availableTrips.map(trip => trip.vehicleType).filter(type => type);
    return Array.from(new Set(types));
  }

  getSelectedRoute(): Route | undefined {
    return this.routes.find(r => r.id === this.searchForm.value.routeId);
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active':
      case 'available':
        return 'status-active';
      case 'maintenance':
      case 'out of service':
        return 'status-maintenance';
      case 'departed':
        return 'status-departed';
      case 'intransit':
        return 'status-intransit';
      case 'arrived':
        return 'status-arrived';
      case 'completed':
        return 'status-completed';
      default:
        return 'status-unknown';
    }
  }
}