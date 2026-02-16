import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDividerModule } from '@angular/material/divider';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface ServiceRequest {
  id: string;
  type: 'roadside' | 'mechanical' | 'tracking' | 'stuff';
  title: string;
  description: string;
  status: string;
  priority: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  vehicleInfo?: string;
  location?: string;
  requestedAt: string;
  serviceType?: string;
}

@Component({
  selector: 'app-service-requests',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatTabsModule,
    MatBadgeModule,
    MatTooltipModule,
    MatDialogModule,
    MatListModule,
    MatMenuModule,
    MatSidenavModule,
    MatToolbarModule,
    MatDividerModule,
    MatCheckboxModule
  ],
  template: `
    <div class="service-requests-container">
      <div class="header">
        <h2>Service Requests</h2>
        <p>View and manage all service requests from customers</p>
      </div>

      <mat-card class="requests-card">
        <mat-card-content>
          <!-- Selection Controls -->
          <div class="selection-controls" *ngIf="filteredRequests.length > 0">
            <mat-checkbox 
              [(ngModel)]="selectAll" 
              (change)="toggleSelectAll()"
              color="primary">
              Select All ({{ selectedRequests.length }} selected)
            </mat-checkbox>
            <div class="selection-actions" *ngIf="selectedRequests.length > 0">
              <button mat-raised-button color="primary" (click)="viewSelectedRequests()">
                <mat-icon>visibility</mat-icon>
                View Selected ({{ selectedRequests.length }})
              </button>
              <button mat-button (click)="clearSelection()">
                <mat-icon>clear</mat-icon>
                Clear Selection
              </button>
            </div>
          </div>

          <div class="filters">
            <mat-button-toggle-group [(ngModel)]="selectedFilter" (change)="filterRequests()">
              <mat-button-toggle value="all">All ({{ allRequests.length }})</mat-button-toggle>
              <mat-button-toggle value="pending">Pending ({{ pendingRequests.length }})</mat-button-toggle>
              <mat-button-toggle value="assigned">Assigned ({{ assignedRequests.length }})</mat-button-toggle>
              <mat-button-toggle value="completed">Completed ({{ completedRequests.length }})</mat-button-toggle>
            </mat-button-toggle-group>
          </div>

          <div class="requests-list" *ngIf="filteredRequests.length > 0; else noRequests">
            <mat-card *ngFor="let request of filteredRequests" class="request-card" [class.selected]="isRequestSelected(request)">
              <mat-card-header>
                <div class="request-header">
                  <mat-checkbox 
                    [checked]="isRequestSelected(request)"
                    (change)="toggleRequestSelection(request)"
                    color="primary"
                    class="request-checkbox">
                  </mat-checkbox>
                  <div class="request-type">
                    <mat-icon [class]="getTypeIconClass(request.type)">{{ getTypeIcon(request.type) }}</mat-icon>
                    <span class="type-label">{{ getTypeLabel(request.type) }}</span>
                  </div>
                  <mat-chip [class]="getStatusClass(request.status)">
                    {{ request.status }}
                  </mat-chip>
                </div>
              </mat-card-header>

              <mat-card-content>
                <div class="request-content">
                  <h3>{{ request.title }}</h3>
                  <p class="description">{{ request.description }}</p>

                  <div class="request-details">
                    <div class="detail-item">
                      <mat-icon>person</mat-icon>
                      <span>{{ request.customerName }}</span>
                    </div>
                    <div class="detail-item" *ngIf="request.customerPhone">
                      <mat-icon>phone</mat-icon>
                      <span>{{ request.customerPhone }}</span>
                    </div>
                    <div class="detail-item" *ngIf="request.vehicleInfo">
                      <mat-icon>directions_car</mat-icon>
                      <span>{{ request.vehicleInfo }}</span>
                    </div>
                    <div class="detail-item" *ngIf="request.location">
                      <mat-icon>location_on</mat-icon>
                      <span>{{ request.location }}</span>
                    </div>
                    <div class="detail-item">
                      <mat-icon>schedule</mat-icon>
                      <span>{{ formatDate(request.requestedAt) }}</span>
                    </div>
                  </div>
                </div>
              </mat-card-content>

              <mat-card-actions>
                <button mat-button color="primary" (click)="viewRequest(request)">
                  <mat-icon>visibility</mat-icon>
                  View Details
                </button>
                <button mat-button *ngIf="request.status === 'Pending'" color="accent" (click)="respondToRequest(request)">
                  <mat-icon>reply</mat-icon>
                  Respond
                </button>
              </mat-card-actions>
            </mat-card>
          </div>

          <ng-template #noRequests>
            <div class="no-requests">
              <mat-icon>assignment</mat-icon>
              <h3>No service requests found</h3>
              <p>When customers submit service requests, they will appear here.</p>
            </div>
          </ng-template>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .service-requests-container {
      padding: 20px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      margin-bottom: 24px;
    }

    .header h2 {
      margin: 0 0 8px 0;
      color: #333;
      font-weight: 500;
    }

    .header p {
      margin: 0;
      color: #666;
    }

    .requests-card {
      margin-bottom: 20px;
    }

    .filters {
      margin-bottom: 24px;
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }

    .requests-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .request-card {
      margin-bottom: 0;
    }

    .request-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .request-type {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .type-label {
      font-weight: 500;
      text-transform: uppercase;
      font-size: 12px;
    }

    .request-content h3 {
      margin: 0 0 8px 0;
      color: #333;
    }

    .description {
      color: #666;
      margin-bottom: 16px;
      line-height: 1.4;
    }

    .request-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 12px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #666;
      font-size: 14px;
    }

    .detail-item mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .no-requests {
      text-align: center;
      padding: 48px 20px;
      color: #999;
    }

    .no-requests mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
    }

    .no-requests h3 {
      margin: 0 0 8px 0;
      color: #666;
    }

    /* Status chip colors */
    .status-pending {
      background-color: #fff3cd;
      color: #856404;
    }

    .status-assigned {
      background-color: #cce5ff;
      color: #004085;
    }

    .status-in-progress {
      background-color: #d1ecf1;
      color: #0c5460;
    }

    .status-completed {
      background-color: #d4edda;
      color: #155724;
    }

    .status-cancelled {
      background-color: #f8d7da;
      color: #721c24;
    }

    /* Type icon colors */
    .type-roadside {
      color: #dc3545;
    }

    .type-mechanical {
      color: #28a745;
    }

    .type-tracking {
      color: #007bff;
    }

    .type-stuff {
      color: #ffc107;
    }

    /* Selection styles */
    .selection-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      padding: 12px;
      background-color: #f8f9fa;
      border-radius: 4px;
    }

    .selection-actions {
      display: flex;
      gap: 8px;
    }

    .request-checkbox {
      margin-right: 8px;
    }

    .request-card.selected {
      border: 2px solid #007bff;
      background-color: #f8f9ff;
    }

    @media (max-width: 768px) {
      .service-requests-container {
        padding: 16px;
      }

      .request-details {
        grid-template-columns: 1fr;
      }

      .filters {
        justify-content: center;
      }

      .selection-controls {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
    }
  `]
})
export class ServiceRequestsComponent implements OnInit {
  allRequests: ServiceRequest[] = [];
  filteredRequests: ServiceRequest[] = [];
  selectedFilter: string = 'all';

  pendingRequests: ServiceRequest[] = [];
  assignedRequests: ServiceRequest[] = [];
  completedRequests: ServiceRequest[] = [];

  selectedRequests: ServiceRequest[] = [];
  selectAll: boolean = false;

  loading: boolean = true;

  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadServiceRequests();
  }

  loadServiceRequests(): void {
    this.loading = true;

    // Load all types of service requests
    Promise.all([
      this.loadRoadsideAssistanceRequests(),
      this.loadMechanicalRequests(),
      this.loadTrackingDeviceRequests(),
      this.loadStuffRequests()
    ]).then((results) => {
      // Flatten all request arrays into one
      this.allRequests = results.flat();
      this.categorizeRequests();
      this.filterRequests();
      this.loading = false;
    }).catch(error => {
      console.error('Error loading service requests:', error);
      this.snackBar.open('Failed to load service requests', 'Close', { duration: 3000 });
      this.loading = false;
    });
  }

  private loadRoadsideAssistanceRequests(): Promise<ServiceRequest[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/RoadsideAssistance/pending`)
      .toPromise()
      .then(requests => {
        return (requests || []).map(r => ({
          id: r.id,
          type: 'roadside' as const,
          title: `Roadside Assistance: ${r.assistanceType}`,
          description: r.issueDescription,
          status: r.status,
          priority: r.priority || 'Normal',
          customerName: r.userName,
          customerPhone: r.userPhone,
          customerEmail: r.userRole,
          vehicleInfo: r.vehicleRegistration ? `${r.vehicleMake} ${r.vehicleModel} (${r.vehicleRegistration})` : undefined,
          location: r.location,
          requestedAt: r.requestedAt,
          serviceType: r.assistanceType
        }));
      })
      .catch(error => {
        console.warn('Could not load roadside assistance requests:', error);
        return []; // Return empty array if endpoint fails
      });
  }

  private loadMechanicalRequests(): Promise<ServiceRequest[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/MechanicalRequests`)
      .toPromise()
      .then(requests => {
        return (requests || [])
          .filter(r => r.state !== 'Completed') // Only show active requests
          .map(r => ({
            id: r.id,
            type: 'mechanical' as const,
            title: `Mechanical Service: ${r.serviceType}`,
            description: r.description || 'Mechanical service request',
            status: r.state,
            priority: r.priority || 'Normal',
            customerName: r.customerName || 'Unknown',
            customerPhone: r.customerPhone || '',
            customerEmail: r.customerEmail || '',
            vehicleInfo: r.vehicleRegistration ? `${r.vehicleMake} ${r.vehicleModel} (${r.vehicleRegistration})` : undefined,
            location: r.location || '',
            requestedAt: r.createdAt,
            serviceType: r.serviceType
          }));
      })
      .catch(() => []);
  }

  private loadTrackingDeviceRequests(): Promise<ServiceRequest[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/TrackingDevice/marketplace-requests`)
      .toPromise()
      .then(requests => {
        return (requests || [])
          .filter(r => r.status === 'Pending' || r.status === 'Quoted')
          .map(r => ({
            id: r.id,
            type: 'tracking' as const,
            title: 'Tracking Device Installation',
            description: r.deviceFeatures || 'GPS tracking device installation request',
            status: r.status,
            priority: 'Normal',
            customerName: r.ownerName,
            customerPhone: r.ownerPhone,
            customerEmail: r.ownerEmail,
            vehicleInfo: r.vehicleRegistration ? `${r.vehicleMake} ${r.vehicleModel} (${r.vehicleRegistration})` : undefined,
            location: r.installationLocation,
            requestedAt: r.createdAt,
            serviceType: 'Tracking Device'
          }));
      })
      .catch(error => {
        console.warn('Could not load tracking device requests:', error);
        return []; // Return empty array if endpoint fails
      });
  }

  private loadStuffRequests(): Promise<ServiceRequest[]> {
    return this.http.get<any[]>(`${environment.apiUrl}/StuffRequests`)
      .toPromise()
      .then(requests => {
        return (requests || [])
          .filter(r => r.status !== 'Completed')
          .map(r => ({
            id: r.id,
            type: 'stuff' as const,
            title: `Stuff Request: ${r.itemType}`,
            description: r.description || 'Passenger stuff request',
            status: r.status,
            priority: r.priority || 'Normal',
            customerName: r.passengerName,
            customerPhone: r.passengerPhone,
            customerEmail: r.passengerEmail,
            location: r.pickupLocation,
            requestedAt: r.createdAt,
            serviceType: r.itemType
          }));
      })
      .catch(() => []);
  }

  private categorizeRequests(): void {
    this.pendingRequests = this.allRequests.filter(r => r.status === 'Pending');
    this.assignedRequests = this.allRequests.filter(r => r.status === 'Assigned' || r.status === 'In Progress');
    this.completedRequests = this.allRequests.filter(r => r.status === 'Completed');
  }

  filterRequests(): void {
    switch (this.selectedFilter) {
      case 'pending':
        this.filteredRequests = this.pendingRequests;
        break;
      case 'assigned':
        this.filteredRequests = this.assignedRequests;
        break;
      case 'completed':
        this.filteredRequests = this.completedRequests;
        break;
      default:
        this.filteredRequests = this.allRequests;
        break;
    }
    this.updateSelectAllState();
  }

  getTypeIcon(type: string): string {
    switch (type) {
      case 'roadside': return 'local_shipping';
      case 'mechanical': return 'build';
      case 'tracking': return 'gps_fixed';
      case 'stuff': return 'shopping_bag';
      default: return 'assignment';
    }
  }

  getTypeIconClass(type: string): string {
    return `type-${type}`;
  }

  getTypeLabel(type: string): string {
    switch (type) {
      case 'roadside': return 'Roadside';
      case 'mechanical': return 'Mechanical';
      case 'tracking': return 'Tracking';
      case 'stuff': return 'Stuff';
      default: return 'Service';
    }
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase().replace(' ', '-')}`;
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString() + ' ' + new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  viewRequest(request: ServiceRequest): void {
    // Navigate to appropriate detail view based on request type
    switch (request.type) {
      case 'roadside':
        this.router.navigate(['/service-provider-dashboard/roadside-assistance'], {
          queryParams: { requestId: request.id }
        });
        break;
      case 'tracking':
        this.router.navigate(['/service-provider-dashboard/marketplace'], {
          queryParams: { requestId: request.id }
        });
        break;
      case 'mechanical':
        this.router.navigate(['/service-provider-dashboard/mechanical-request', request.id]);
        break;
      case 'stuff':
        this.router.navigate(['/service-provider-dashboard/stuff-request', request.id]);
        break;
    }
  }

  respondToRequest(request: ServiceRequest): void {
    // Navigate to response/quote form based on request type
    this.viewRequest(request);
  }

  toggleRequestSelection(request: ServiceRequest): void {
    const index = this.selectedRequests.findIndex(r => r.id === request.id);
    if (index > -1) {
      this.selectedRequests.splice(index, 1);
    } else {
      this.selectedRequests.push(request);
    }
    this.updateSelectAllState();
  }

  toggleSelectAll(): void {
    if (this.selectAll) {
      this.selectedRequests = [];
    } else {
      this.selectedRequests = [...this.filteredRequests];
    }
    this.selectAll = !this.selectAll;
  }

  updateSelectAllState(): void {
    this.selectAll = this.filteredRequests.length > 0 && 
                     this.selectedRequests.length === this.filteredRequests.length;
  }

  isRequestSelected(request: ServiceRequest): boolean {
    return this.selectedRequests.some(r => r.id === request.id);
  }

  viewSelectedRequests(): void {
    if (this.selectedRequests.length === 0) {
      this.snackBar.open('Please select at least one request to view', 'Close', { duration: 3000 });
      return;
    }

    if (this.selectedRequests.length === 1) {
      // If only one request selected, view its details
      this.viewRequest(this.selectedRequests[0]);
    } else {
      // If multiple requests selected, show a dialog or navigate to a summary view
      this.showSelectedRequestsDialog();
    }
  }

  showSelectedRequestsDialog(): void {
    // For now, just show the first selected request
    // In a real implementation, you might want to create a dialog component
    // that shows all selected requests
    this.snackBar.open(`Viewing ${this.selectedRequests.length} selected requests`, 'Close', { duration: 3000 });
    this.viewRequest(this.selectedRequests[0]);
  }

  clearSelection(): void {
    this.selectedRequests = [];
    this.selectAll = false;
  }
}