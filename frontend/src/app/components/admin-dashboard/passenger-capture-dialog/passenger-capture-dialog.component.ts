import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

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
}

@Component({
  selector: 'app-passenger-capture-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatDividerModule
  ],
  templateUrl: './passenger-capture-dialog.component.html',
  styleUrl: './passenger-capture-dialog.component.css'
})
export class PassengerCaptureDialogComponent implements OnInit {
  passengers: TripPassenger[] = [];
  passengerForm: FormGroup;
  loading = false;
  trip: TripSchedule;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private dialogRef: MatDialogRef<PassengerCaptureDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { trip: TripSchedule }
  ) {
    this.trip = data.trip;
    this.passengerForm = this.fb.group({
      passengerName: ['', Validators.required],
      passengerPhone: ['', [Validators.required, Validators.pattern(/^[\+]?[0-9\-\(\)\s]+$/)]],
      seatNumber: ['', Validators.required],
      amount: [0, [Validators.required, Validators.min(0)]],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadPassengers();
  }

  loadPassengers(): void {
    this.loading = true;
    this.http.get<TripPassenger[]>(`${environment.apiUrl}/TaxiRankTrips/${this.trip.id}/passengers`)
      .subscribe({
        next: (passengers) => {
          this.passengers = passengers;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading passengers:', error);
          this.snackBar.open('Failed to load passengers', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  addPassenger(): void {
    if (this.passengerForm.valid) {
      this.loading = true;
      const passengerData = {
        passengerName: this.passengerForm.value.passengerName,
        passengerPhone: this.passengerForm.value.passengerPhone,
        departureStation: this.trip.departureStation,
        arrivalStation: this.trip.destinationStation,
        amount: parseFloat(this.passengerForm.value.amount),
        seatNumber: parseInt(this.passengerForm.value.seatNumber),
        notes: this.passengerForm.value.notes || ''
      };

      this.http.post(`${environment.apiUrl}/TaxiRankTrips/${this.trip.id}/passengers`, passengerData)
        .subscribe({
          next: () => {
            this.snackBar.open('Passenger added successfully!', 'Close', { duration: 3000 });
            this.passengerForm.reset();
            this.loadPassengers();
          },
          error: (error) => {
            console.error('Error adding passenger:', error);
            this.snackBar.open('Failed to add passenger', 'Close', { duration: 3000 });
            this.loading = false;
          }
        });
    } else {
      this.snackBar.open('Please fill in all required fields', 'Close', { duration: 3000 });
    }
  }

  removePassenger(passengerId: string): void {
    if (confirm('Are you sure you want to remove this passenger?')) {
      this.http.delete(`${environment.apiUrl}/TaxiRankTrips/${this.trip.id}/passengers/${passengerId}`)
        .subscribe({
          next: () => {
            this.snackBar.open('Passenger removed successfully!', 'Close', { duration: 3000 });
            this.loadPassengers();
          },
          error: (error) => {
            console.error('Error removing passenger:', error);
            this.snackBar.open('Failed to remove passenger', 'Close', { duration: 3000 });
          }
        });
    }
  }

  close(): void {
    this.dialogRef.close();
  }
}
