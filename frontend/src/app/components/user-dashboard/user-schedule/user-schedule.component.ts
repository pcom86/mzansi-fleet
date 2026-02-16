import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';

interface TripSchedule {
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
  selector: 'app-user-schedule',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="user-schedule-container">
      <mat-card class="schedule-card">
        <mat-card-header>
          <mat-card-title>Today's Schedule</mat-card-title>
          <mat-card-subtitle>Your booked trips for today</mat-card-subtitle>
        </mat-card-header>

        <mat-card-content>
          <div *ngIf="loading" class="loading-container">
            <mat-spinner diameter="40"></mat-spinner>
            <p>Loading your schedule...</p>
          </div>

          <div *ngIf="!loading && todaysSchedules.length === 0" class="no-schedule">
            <mat-icon class="no-schedule-icon">schedule</mat-icon>
            <h3>No trips booked for today</h3>
            <p>You don't have any trips scheduled for today. Book a trip to see it here.</p>
          </div>

          <div *ngIf="!loading && todaysSchedules.length > 0">
            <table mat-table [dataSource]="todaysSchedules" class="schedule-table">
              <ng-container matColumnDef="time">
                <th mat-header-cell *matHeaderCellDef>Time</th>
                <td mat-cell *matCellDef="let schedule">
                  {{ schedule.departureTime }}
                </td>
              </ng-container>

              <ng-container matColumnDef="route">
                <th mat-header-cell *matHeaderCellDef>Route</th>
                <td mat-cell *matCellDef="let schedule">
                  {{ schedule.departureStation }} → {{ schedule.destinationStation }}
                </td>
              </ng-container>

              <ng-container matColumnDef="vehicle">
                <th mat-header-cell *matHeaderCellDef>Vehicle</th>
                <td mat-cell *matCellDef="let schedule">
                  {{ schedule.vehicleRegistration }}
                </td>
              </ng-container>

              <ng-container matColumnDef="status">
                <th mat-header-cell *matHeaderCellDef>Status</th>
                <td mat-cell *matCellDef="let schedule">
                  <span class="status-badge" [class]="'status-' + schedule.status.toLowerCase()">
                    {{ schedule.status }}
                  </span>
                </td>
              </ng-container>

              <ng-container matColumnDef="passengers">
                <th mat-header-cell *matHeaderCellDef>Amount</th>
                <td mat-cell *matCellDef="let schedule">
                  R{{ schedule.amount }}
                </td>
              </ng-container>

              <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
              <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
            </table>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .user-schedule-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .schedule-card {
      margin-bottom: 20px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
      text-align: center;
    }

    .loading-container mat-spinner {
      margin-bottom: 16px;
    }

    .no-schedule {
      text-align: center;
      padding: 40px;
      color: #666;
    }

    .no-schedule-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      opacity: 0.5;
    }

    .schedule-table {
      width: 100%;
      margin-top: 16px;
    }

    .status-badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      text-transform: uppercase;
    }

    .status-scheduled {
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .status-active {
      background-color: #e8f5e8;
      color: #2e7d32;
    }

    .status-completed {
      background-color: #f3e5f5;
      color: #7b1fa2;
    }

    .status-cancelled {
      background-color: #ffebee;
      color: #d32f2f;
    }
  `]
})
export class UserScheduleComponent implements OnInit {
  todaysSchedules: TripSchedule[] = [];
  displayedColumns: string[] = ['time', 'route', 'vehicle', 'status', 'passengers'];
  loading = true;

  constructor(private http: HttpClient, private authService: AuthService) {}

  ngOnInit(): void {
    this.loadTodaysSchedule();
  }

  loadTodaysSchedule(): void {
    this.loading = true;

    // Get current user info
    const userInfo = this.authService.getCurrentUserInfo();
    
    if (!userInfo?.userId) {
      console.error('No user ID found');
      this.loading = false;
      return;
    }

    // Get today's date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Call the user bookings endpoint
    this.http.get<TripSchedule[]>(`${environment.apiUrl}/TaxiRankTrips/user/${userInfo.userId}`)
      .subscribe({
        next: (schedules) => {
          // Filter for today's trips
          this.todaysSchedules = schedules.filter(schedule => 
            schedule.departureDate === today
          );
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading today\'s schedule:', error);
          this.loading = false;
        }
      });
  }
}