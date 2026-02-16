import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { environment } from '../../../../environments/environment';

interface TripSchedule {
  id: string;
  vehicleRegistration: string;
  routeName: string;
  driverName: string;
  marshalName: string;
  scheduledDate: string;
  departureTime: string;
  status: string;
  passengerCount: number;
  totalFare: number;
}

@Component({
  selector: 'app-today-schedule',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatIconModule
  ],
  templateUrl: './today-schedule.component.html',
  styleUrls: ['./today-schedule.component.css']
})
export class TodayScheduleComponent implements OnInit {
  schedules: TripSchedule[] = [];
  displayedColumns: string[] = ['time', 'vehicle', 'route', 'driver', 'marshal', 'passengers', 'fare', 'status'];
  loading = true;
  today = new Date();

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadTodaysSchedules();
  }

  loadTodaysSchedules() {
    const todayStr = this.today.toISOString().split('T')[0];
    const user = localStorage.getItem('user');
    let tenantId = '';
    if (user) {
      const userData = JSON.parse(user);
      tenantId = userData.tenantId;
    }

    // Fetch actual trips captured today
    let url = `${environment.apiUrl}/TaxiRankTrips/today`;
    if (tenantId) {
      url += `?tenantId=${tenantId}`;
    }

    this.http.get<any[]>(url).subscribe({
      next: (trips) => {
        // Transform trips to schedule format
        this.schedules = trips.map(trip => ({
          id: trip.id,
          vehicleRegistration: trip.vehicle?.registration || 'N/A',
          routeName: `${trip.departureStation} → ${trip.destinationStation}`,
          driverName: trip.driver?.name || 'N/A',
          marshalName: trip.marshal?.fullName || 'N/A',
          scheduledDate: trip.departureTime.split('T')[0],
          departureTime: new Date(trip.departureTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
          status: trip.status,
          passengerCount: trip.passengerCount,
          totalFare: trip.totalAmount
        }));
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      }
    });
  }
}