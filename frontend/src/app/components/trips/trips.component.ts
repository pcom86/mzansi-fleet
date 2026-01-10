import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TripService } from '../../services';
import { TripRequest } from '../../models';

@Component({
  selector: 'app-trips',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="trips">
      <div class="flex-between mb-2">
        <h1>Trips</h1>
        <button class="btn btn-primary" (click)="showForm = !showForm">
          {{ showForm ? 'Cancel' : 'New Trip' }}
        </button>
      </div>

      <div class="error" *ngIf="error">{{ error }}</div>

      <div class="card" *ngIf="showForm">
        <h2>{{ editingTrip ? 'Edit Trip' : 'New Trip' }}</h2>
        <form (ngSubmit)="saveTrip()">
          <div class="form-group">
            <label>Pickup Location</label>
            <input type="text" [(ngModel)]="currentTrip.pickupLocation" name="pickupLocation" required>
          </div>
          
          <div class="form-group">
            <label>Dropoff Location</label>
            <input type="text" [(ngModel)]="currentTrip.dropoffLocation" name="dropoffLocation" required>
          </div>
          
          <div class="form-group">
            <label>Requested Time</label>
            <input type="datetime-local" [(ngModel)]="currentTrip.requestedTime" name="requestedTime" required>
          </div>
          
          <div class="form-group">
            <label>Passenger Count</label>
            <input type="number" [(ngModel)]="currentTrip.passengerCount" name="passengerCount" min="1" required>
          </div>
          
          <div class="form-group">
            <label>Notes</label>
            <textarea [(ngModel)]="currentTrip.notes" name="notes" rows="3"></textarea>
          </div>
          
          <div class="form-group">
            <label>
              <input type="checkbox" [(ngModel)]="currentTrip.isPooling" name="isPooling">
              Allow Pooling
            </label>
          </div>
          
          <div class="form-group">
            <label>Status</label>
            <select [(ngModel)]="currentTrip.state" name="state">
              <option value="Requested">Requested</option>
              <option value="Confirmed">Confirmed</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
          
          <div class="flex gap-1">
            <button type="submit" class="btn btn-success">Save</button>
            <button type="button" class="btn btn-secondary" (click)="cancelEdit()">Cancel</button>
          </div>
        </form>
      </div>

      <div class="card">
        <div class="loading" *ngIf="loading">Loading trips...</div>
        
        <table *ngIf="!loading && trips.length > 0">
          <thead>
            <tr>
              <th>Pickup</th>
              <th>Dropoff</th>
              <th>Time</th>
              <th>Passengers</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let trip of trips">
              <td>{{ trip.pickupLocation || 'N/A' }}</td>
              <td>{{ trip.dropoffLocation || 'N/A' }}</td>
              <td>{{ trip.requestedTime | date:'short' }}</td>
              <td>{{ trip.passengerCount }}</td>
              <td>{{ trip.state || 'Requested' }}</td>
              <td>
                <button class="btn btn-secondary" (click)="editTrip(trip)">Edit</button>
                <button class="btn btn-danger" (click)="deleteTrip(trip.id)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
        
        <p *ngIf="!loading && trips.length === 0">No trips found.</p>
      </div>
    </div>
  `,
  styles: [`
    table button {
      margin-right: 0.5rem;
      padding: 0.25rem 0.75rem;
    }
  `]
})
export class TripsComponent implements OnInit {
  trips: TripRequest[] = [];
  currentTrip: Partial<TripRequest> = this.getEmptyTrip();
  editingTrip = false;
  showForm = false;
  loading = false;
  error = '';

  constructor(private tripService: TripService) {}

  ngOnInit() {
    this.loadTrips();
  }

  loadTrips() {
    this.loading = true;
    this.error = '';
    this.tripService.getAll().subscribe({
      next: (data) => {
        this.trips = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load trips: ' + err.message;
        this.loading = false;
      }
    });
  }

  saveTrip() {
    if (this.editingTrip && this.currentTrip.id) {
      this.tripService.update(this.currentTrip.id, this.currentTrip as TripRequest).subscribe({
        next: () => {
          this.loadTrips();
          this.cancelEdit();
        },
        error: (err) => this.error = 'Failed to update trip: ' + err.message
      });
    } else {
      this.tripService.create(this.currentTrip as TripRequest).subscribe({
        next: () => {
          this.loadTrips();
          this.cancelEdit();
        },
        error: (err) => this.error = 'Failed to create trip: ' + err.message
      });
    }
  }

  editTrip(trip: TripRequest) {
    this.currentTrip = { ...trip };
    this.editingTrip = true;
    this.showForm = true;
  }

  deleteTrip(id: string) {
    if (confirm('Are you sure you want to delete this trip?')) {
      this.tripService.delete(id).subscribe({
        next: () => this.loadTrips(),
        error: (err) => this.error = 'Failed to delete trip: ' + err.message
      });
    }
  }

  cancelEdit() {
    this.currentTrip = this.getEmptyTrip();
    this.editingTrip = false;
    this.showForm = false;
  }

  private getEmptyTrip(): Partial<TripRequest> {
    return {
      passengerId: '00000000-0000-0000-0000-000000000000',
      tenantId: '00000000-0000-0000-0000-000000000000',
      pickupLocation: '',
      dropoffLocation: '',
      requestedTime: new Date(),
      passengerCount: 1,
      notes: '',
      isPooling: false,
      state: 'Requested'
    };
  }
}
