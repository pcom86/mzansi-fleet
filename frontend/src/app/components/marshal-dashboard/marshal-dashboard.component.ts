import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-marshal-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule
  ],
  templateUrl: './marshal-dashboard.component.html',
  styleUrls: ['./marshal-dashboard.component.scss']
})
export class MarshalDashboardComponent implements OnInit {
  userData: any;
  marshalProfile: any;
  activeVehicles: any[] = [];
  loadingVehicles = false;

  constructor(
    private router: Router,
    private http: HttpClient
  ) {}

  ngOnInit(): void {
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
      this.loadMarshalProfile();
    }
  }

  loadMarshalProfile(): void {
    // Get marshals for this user's tenant and find the one matching this user
    const url = `${environment.apiUrl}/TaxiRankUsers/marshals?tenantId=${this.userData.tenantId}`;
    
    this.http.get<any[]>(url).subscribe({
      next: (marshals) => {
        // Find the marshal profile for this user
        this.marshalProfile = marshals.find(m => m.userId === this.userData.userId);
        if (this.marshalProfile) {
          // Load vehicles for this taxi rank
          if (this.marshalProfile.taxiRankId) {
            this.loadActiveVehicles(this.marshalProfile.taxiRankId);
          }
        }
      },
      error: (error) => {
        console.error('Error loading marshal profile:', error);
      }
    });
  }

  loadActiveVehicles(taxiRankId: string): void {
    this.loadingVehicles = true;
    
    console.log('Loading active vehicles for taxi rank:', taxiRankId);
    
    // Load routes, vehicles, and vehicle-route assignments in parallel
    Promise.all([
      this.http.get<any[]>(`${environment.apiUrl}/Routes`).toPromise(),
      this.http.get<any[]>(`${environment.apiUrl}/Vehicles`).toPromise(),
      this.http.get<any[]>(`${environment.apiUrl}/VehicleRouteAssignments`).toPromise()
    ]).then(([routes, vehicles, assignments]) => {
      console.log('All routes:', routes);
      console.log('All vehicles:', vehicles);
      console.log('All assignments:', assignments);
      
      // Filter routes that belong to this taxi rank
      const rankRoutes = (routes || []).filter(r => {
        console.log(`Comparing route ${r.id}: r.taxiRankId="${r.taxiRankId}" vs marshal taxiRankId="${taxiRankId}"`);
        return r.taxiRankId === taxiRankId;
      });
      const rankRouteIds = rankRoutes.map(r => r.id);
      
      console.log('Filtered rank routes:', rankRoutes);
      console.log('Rank route IDs:', rankRouteIds);
      
      // Filter vehicle-route assignments for routes in this taxi rank
      const rankAssignments = (assignments || []).filter(a => rankRouteIds.includes(a.routeId));
      const vehicleIds = [...new Set(rankAssignments.map(a => a.vehicleId))]; // Unique vehicle IDs
      
      console.log('Filtered rank assignments:', rankAssignments);
      console.log('Vehicle IDs from assignments:', vehicleIds);
      
      // Filter vehicles that are assigned to routes in this taxi rank
      this.activeVehicles = (vehicles || []).filter(v => vehicleIds.includes(v.id) && v.status === 'Active');
      
      console.log(`Found ${this.activeVehicles.length} active vehicles for taxi rank ${taxiRankId}`);
      console.log('Active vehicles:', this.activeVehicles);
      
      this.loadingVehicles = false;
    }).catch(error => {
      console.error('Error loading active vehicles:', error);
      this.activeVehicles = [];
      this.loadingVehicles = false;
    });
  }

  navigateToTripCapture(): void {
    this.router.navigate(['/marshal/trip-details']);
  }

  navigateToTripHistory(): void {
    this.router.navigate(['/marshal/trip-history']);
  }

  logout(): void {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    this.router.navigate(['/login']);
  }
}
