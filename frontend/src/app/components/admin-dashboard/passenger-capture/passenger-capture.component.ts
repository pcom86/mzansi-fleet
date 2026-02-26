import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../services/auth.service';
import { environment } from '../../../../environments/environment';

interface TripSchedule {
  id: string;
  departureTime: string;
  departureStation: string;
  destinationStation: string;
  vehicle?: {
    registration: string;
  };
  driver?: {
    name: string;
  };
  marshal?: {
    fullName: string;
  };
  passengerCount: number;
  status: string;
  route?: {
    fareAmount: number;
    destinationFares?: { [destination: string]: number };
  };
}

interface PrebookedPassenger {
  id: string;
  passengerName: string;
  phoneNumber: string;
  email: string;
  numberOfSeats: number;
  fareAmount: number;
  bookingTime: string;
  status: string;
}

interface TripPassenger {
  id: string;
  passengerName: string;
  passengerPhone: string;
  seatNumber: string;
  amount: number;
  boardedAt: string;
  notes?: string;
  userId?: string;
}

@Component({
  selector: 'app-passenger-capture',
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
    MatListModule,
    MatDividerModule,
    MatSnackBarModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './passenger-capture.component.html',
  styleUrl: './passenger-capture.component.css'
})
export class PassengerCaptureComponent implements OnInit {
  availableSchedules: TripSchedule[] = [];
  selectedSchedule: TripSchedule | null = null;
  passengers: TripPassenger[] = [];
  prebookedPassengers: PrebookedPassenger[] = [];
  passengerForm: FormGroup;
  loading = false;
  loadingSchedules = false;
  loadingPassengers = false;
  loadingPrebooked = false;
  showAddForm = false;
  userInfo: any;
  availableDestinations: string[] = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private authService: AuthService
  ) {
    this.passengerForm = this.fb.group({
      passengerName: ['', Validators.required],
      passengerPhone: ['', [Validators.required, Validators.pattern(/^[\+]?[0-9\-\(\)\s]+$/)]],
      destination: ['', Validators.required],
      seatNumber: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadUserInfo();
    this.loadAvailableSchedules();
    this.setupDestinationFareLogic();
  }

  setupDestinationFareLogic(): void {
    this.passengerForm.get('destination')?.valueChanges.subscribe(destination => {
      if (destination && this.selectedSchedule) {
        // Auto-populate fare based on destination
        let fareAmount = 0;

        // Try to get fare from destinationFares first, fallback to route fareAmount
        if (this.selectedSchedule.route && (this.selectedSchedule.route as any).destinationFares) {
          const destinationFares = (this.selectedSchedule.route as any).destinationFares as { [key: string]: number };
          fareAmount = destinationFares[destination] || 0;
        } else if (this.selectedSchedule.route?.fareAmount) {
          fareAmount = this.selectedSchedule.route.fareAmount;
        }

        this.passengerForm.patchValue({ amount: fareAmount });
      }
    });
  }

  loadUserInfo(): void {
    this.userInfo = this.authService.getCurrentUserInfo();
  }

  loadAvailableSchedules(): void {
    this.loadingSchedules = true;
    let url = `${environment.apiUrl}/TaxiRankTrips`;
    if (this.userInfo?.tenantId) {
      url += `?tenantId=${this.userInfo.tenantId}`;
    }

    this.http.get<TripSchedule[]>(url)
      .subscribe({
        next: (schedules) => {
          // Filter for schedules scheduled for today (not completed/cancelled)
          const today = new Date();
          this.availableSchedules = schedules.filter(schedule => {
            const depDate = new Date(schedule.departureTime);
            return (
              depDate.getFullYear() === today.getFullYear() &&
              depDate.getMonth() === today.getMonth() &&
              depDate.getDate() === today.getDate() &&
              schedule.status === 'Scheduled'
            );
          });
          this.loadingSchedules = false;
        },
        error: (error) => {
          console.error('Error loading schedules:', error);
          this.snackBar.open('Failed to load available schedules', 'Close', { duration: 3000 });
          this.loadingSchedules = false;
        }
      });
  }

  selectSchedule(schedule: TripSchedule): void {
    this.selectedSchedule = schedule;
    this.populateAvailableDestinations();
    this.loadPrebookedPassengers();
    this.loadPassengers();
  }

  populateAvailableDestinations(): void {
    if (!this.selectedSchedule) return;

    // For now, include the main destination and any stops
    // This can be enhanced to load destinations from a separate API endpoint
    this.availableDestinations = [this.selectedSchedule.destinationStation];

    // If the schedule has route information with stops, add them too
    // This assumes the route data includes stops
    if (this.selectedSchedule.route && (this.selectedSchedule.route as any).stops) {
      const stops = (this.selectedSchedule.route as any).stops as string[];
      this.availableDestinations = [...this.availableDestinations, ...stops];
    }
  }

  loadPrebookedPassengers(): void {
    if (!this.selectedSchedule) return;

    this.loadingPrebooked = true;
    // Load bookings for this schedule - assuming there's an endpoint for this
    this.http.get<PrebookedPassenger[]>(`${environment.apiUrl}/TaxiRankTrips/${this.selectedSchedule.id}/bookings`)
      .subscribe({
        next: (prebooked) => {
          this.prebookedPassengers = prebooked.filter(booking => booking.status === 'Confirmed');
          this.loadingPrebooked = false;
        },
        error: (error) => {
          console.error('Error loading prebooked passengers:', error);
          // If the endpoint doesn't exist yet, just set empty array
          this.prebookedPassengers = [];
          this.loadingPrebooked = false;
        }
      });
  }

  loadPassengers(): void {
    if (!this.selectedSchedule) return;

    this.loadingPassengers = true;
    this.http.get<TripPassenger[]>(`${environment.apiUrl}/TaxiRankTrips/${this.selectedSchedule.id}/passengers`)
      .subscribe({
        next: (passengers) => {
          this.passengers = passengers;
          this.loadingPassengers = false;
        },
        error: (error) => {
          console.error('Error loading passengers:', error);
          this.snackBar.open('Failed to load passengers', 'Close', { duration: 3000 });
          this.loadingPassengers = false;
        }
      });
  }

  addPassenger(): void {
    if (!this.selectedSchedule) {
      this.snackBar.open('Please select a schedule first', 'Close', { duration: 3000 });
      return;
    }

    if (this.passengerForm.valid) {
      this.loading = true;
      const passengerData = {
        passengerName: this.passengerForm.value.passengerName,
        passengerPhone: this.passengerForm.value.passengerPhone,
        departureStation: this.selectedSchedule.departureStation,
        arrivalStation: this.passengerForm.value.destination,
        amount: parseFloat(this.passengerForm.value.amount),
        seatNumber: parseInt(this.passengerForm.value.seatNumber),
        notes: this.passengerForm.value.notes || ''
      };

      this.http.post(`${environment.apiUrl}/TaxiRankTrips/${this.selectedSchedule.id}/passengers`, passengerData)
        .subscribe({
          next: () => {
            this.snackBar.open('Passenger added successfully!', 'Close', { duration: 3000 });
            this.passengerForm.reset();
            this.loadPassengers();
            this.loadAvailableSchedules(); // Refresh schedule counts
          },
          error: (error) => {
            console.error('Error adding passenger:', error);
            this.snackBar.open('Failed to add passenger', 'Close', { duration: 3000 });
            this.loading = false;
          },
          complete: () => {
            this.loading = false;
            this.showAddForm = false;
          }
        });
    } else {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
    }
  }

  removePassenger(passengerId: string): void {
    if (!this.selectedSchedule) return;

    if (confirm('Are you sure you want to remove this passenger?')) {
      this.http.delete(`${environment.apiUrl}/TaxiRankTrips/${this.selectedSchedule.id}/passengers/${passengerId}`)
        .subscribe({
          next: () => {
            this.snackBar.open('Passenger removed successfully!', 'Close', { duration: 3000 });
            this.loadPassengers();
            this.loadAvailableSchedules(); // Refresh schedule counts
          },
          error: (error) => {
            console.error('Error removing passenger:', error);
            this.snackBar.open('Failed to remove passenger', 'Close', { duration: 3000 });
          }
        });
    }
  }

  toggleAddForm(): void {
    this.showAddForm = !this.showAddForm;
    if (!this.showAddForm) {
      this.passengerForm.reset();
    }
  }

  cancelAdd(): void {
    this.showAddForm = false;
    this.passengerForm.reset();
  }

  clearSelection(): void {
    this.selectedSchedule = null;
    this.passengers = [];
    this.prebookedPassengers = [];
    this.passengerForm.reset();
    this.showAddForm = false;
  }

  addPrebookedToTrip(prebookedPassenger: PrebookedPassenger): void {
    if (!this.selectedSchedule) return;

    // Convert prebooked passenger to trip passenger
    const passengerData = {
      passengerName: prebookedPassenger.passengerName,
      passengerPhone: prebookedPassenger.phoneNumber,
      departureStation: this.selectedSchedule.departureStation,
      arrivalStation: this.selectedSchedule.destinationStation,
      amount: prebookedPassenger.fareAmount,
      seatNumber: 0, // Will be assigned when added
      notes: `Prebooked online - ${prebookedPassenger.email}`
    };

    this.http.post(`${environment.apiUrl}/TaxiRankTrips/${this.selectedSchedule.id}/passengers`, passengerData)
      .subscribe({
        next: () => {
          this.snackBar.open('Prebooked passenger added to trip!', 'Close', { duration: 3000 });
          this.loadPassengers();
          // Remove from prebooked list
          this.prebookedPassengers = this.prebookedPassengers.filter(p => p.id !== prebookedPassenger.id);
        },
        error: (error) => {
          console.error('Error adding prebooked passenger:', error);
          this.snackBar.open('Failed to add prebooked passenger', 'Close', { duration: 3000 });
        }
      });
  }

  getScheduleDisplayName(schedule: TripSchedule): string {
    return `${schedule.departureStation} → ${schedule.destinationStation} (${new Date(schedule.departureTime).toLocaleString()})`;
  }
}
