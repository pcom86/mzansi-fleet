import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { environment } from '../../../../environments/environment';

interface Association {
  id: string;
  name: string;
  code: string;
  contactEmail: string;
  contactPhone: string;
  tenantType: string;
  // Backend returns PascalCase
  Name?: string;
  Code?: string;
  ContactEmail?: string;
  ContactPhone?: string;
  TenantType?: string;
}

interface TaxiRank {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  city: string;
  address: string;
  capacity: number;
  status: string;
  routes?: Route[];
}

interface Route {
  id: string;
  tenantId: string;
  taxiRankId?: string;
  code: string;
  name: string;
  origin: string;
  destination: string;
  stops: string[];
  distance: number;
  estimatedDuration: number;
  fareAmount: number;
  status: string;
  vehicles?: Vehicle[];
}

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  capacity: number;
  status: string;
  isActive: boolean;
}

@Component({
  selector: 'app-rank-overview',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatSelectModule,
    MatFormFieldModule,
    MatProgressSpinnerModule,
    MatChipsModule,
    MatTabsModule
  ],
  templateUrl: './rank-overview.component.html',
  styleUrls: ['./rank-overview.component.scss']
})
export class RankOverviewComponent implements OnInit {
  loading = false;
  adminId: string | null = null;
  tenantId: string | null = null;
  
  // Association and hierarchy
  association: Association | null = null;
  taxiRanks: TaxiRank[] = [];
  expandedRanks = new Set<string>();
  expandedRoutes = new Set<string>();
  
  vehicleColumns = ['registrationNumber', 'make', 'model', 'year', 'capacity', 'status'];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadAdminProfile();
  }

  loadAdminProfile(): void {
    const user = localStorage.getItem('user');
    if (user) {
      const userData = JSON.parse(user);
      console.log('Current user data:', userData);
      this.adminId = userData.userId;
      this.tenantId = userData.tenantId;
      
      console.log('Admin ID:', this.adminId);
      console.log('Tenant ID:', this.tenantId);
      
      if (this.tenantId) {
        this.loadAssociationData();
      }
    }
  }

  loadAssociationData(): void {
    this.loading = true;
    console.log('Loading association for tenantId:', this.tenantId);
    
    // Load association/tenant details
    this.http.get<Association>(`${environment.apiUrl}/Tenants/${this.tenantId}`)
      .subscribe({
        next: (association) => {
          console.log('Raw association data:', association);
          console.log('Association keys:', Object.keys(association));
          console.log('Association name (PascalCase):', (association as any).Name);
          console.log('Association name (camelCase):', association.name);
          this.association = association;
          console.log('Association assigned, calling loadTaxiRanks');
          this.loadTaxiRanks();
        },
        error: (error) => {
          console.error('Error loading association:', error);
          this.loading = false;
        }
      });
  }

  loadTaxiRanks(): void {
    console.log('Loading taxi ranks for tenant:', this.tenantId);
    
    this.http.get<TaxiRank[]>(`${environment.apiUrl}/TaxiRanks?tenantId=${this.tenantId}`)
      .subscribe({
        next: (ranks) => {
          console.log('Received ranks:', ranks);
          console.log('Ranks as JSON:', JSON.stringify(ranks, null, 2));
          console.log('Ranks array length:', ranks?.length || 0);
          console.log('Ranks is array:', Array.isArray(ranks));
          this.taxiRanks = ranks;
          
          // Load routes for each rank
          this.taxiRanks.forEach(rank => {
            this.loadRoutesForRank(rank);
          });
          
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading taxi ranks:', error);
          this.loading = false;
        }
      });
  }

  loadRoutesForRank(rank: TaxiRank): void {
    // Load all routes and filter by taxi rank
    this.http.get<Route[]>(`${environment.apiUrl}/Routes`)
      .subscribe({
        next: (routes) => {
          // Filter routes for this taxi rank
          rank.routes = routes.filter(r => r.taxiRankId === rank.id);
          console.log(`Loaded ${rank.routes.length} routes for rank ${rank.name} (taxiRankId: ${rank.id})`);
          console.log('All routes:', routes);
          console.log('Filtered routes:', rank.routes);
        },
        error: (error) => {
          console.error(`Error loading routes for rank ${rank.name}:`, error);
          rank.routes = [];
        }
      });
  }

  loadVehiclesForRoute(route: Route): void {
    // Load vehicles assigned to this route via VehicleRouteAssignments
    this.http.get<any[]>(`${environment.apiUrl}/VehicleRouteAssignments`)
      .subscribe({
        next: (assignments) => {
          console.log('All VehicleRouteAssignments:', assignments);
          
          // Filter assignments for this specific route
          const routeAssignments = assignments.filter(a => 
            a.routeId === route.id && 
            a.status === 'Active' && 
            a.vehicle
          );
          
          console.log(`Filtered assignments for route ${route.name} (${route.id}):`, routeAssignments);
          
          // Map to vehicle objects
          route.vehicles = routeAssignments.map(a => ({
            id: a.vehicle.id,
            registrationNumber: a.vehicle.registration || a.vehicle.registrationNumber || 'N/A',
            make: a.vehicle.make || 'N/A',
            model: a.vehicle.model || 'N/A',
            year: a.vehicle.year || 0,
            capacity: a.vehicle.capacity || 0,
            status: a.vehicle.status || 'Active',
            isActive: a.status === 'Active'
          }));
          
          console.log(`Loaded ${route.vehicles?.length || 0} vehicles for route ${route.name}`);
        },
        error: (error) => {
          console.error(`Error loading vehicles for route ${route.name}:`, error);
          route.vehicles = [];
        }
      });
  }

  toggleRank(rankId: string): void {
    if (this.expandedRanks.has(rankId)) {
      this.expandedRanks.delete(rankId);
    } else {
      this.expandedRanks.add(rankId);
    }
  }

  toggleRoute(routeId: string, route: Route): void {
    if (this.expandedRoutes.has(routeId)) {
      this.expandedRoutes.delete(routeId);
    } else {
      this.expandedRoutes.add(routeId);
      // Load vehicles when expanding route
      if (!route.vehicles) {
        this.loadVehiclesForRoute(route);
      }
    }
  }

  isRankExpanded(rankId: string): boolean {
    return this.expandedRanks.has(rankId);
  }

  isRouteExpanded(routeId: string): boolean {
    return this.expandedRoutes.has(routeId);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-ZA', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('en-ZA', {
      style: 'currency',
      currency: 'ZAR'
    }).format(amount);
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'departed':
        return 'primary';
      case 'intransit':
        return 'accent';
      case 'arrived':
      case 'completed':
        return 'warn';
      default:
        return '';
    }
  }
}
