import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatChipsModule } from '@angular/material/chips';
import { MatBadgeModule } from '@angular/material/badge';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface Tender {
  id: string;
  title: string;
  description: string;
  requirementDetails: string;
  budgetMin?: number;
  budgetMax?: number;
  transportType: string;
  requiredVehicles?: number;
  routeDetails: string;
  startDate: string;
  endDate: string;
  applicationDeadline?: string;
  pickupLocation: string;
  dropoffLocation: string;
  serviceArea: string;
  tenderPublisherId: string;
  publisherName: string;
  publisherEmail: string;
  status: string;
  awardedToOwnerId?: string;
  awardedToOwnerName?: string;
  createdAt: string;
  updatedAt: string;
  applicationCount: number;
}

@Component({
  selector: 'app-tender-list',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatFormFieldModule,
    MatSelectModule,
    MatChipsModule,
    MatBadgeModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="tender-list-container">
      <!-- Header -->
      <div class="header-section">
        <h1>
          <mat-icon>description</mat-icon>
          Available Transport Tenders
        </h1>
        <p class="subtitle">Browse and apply to transport work opportunities</p>
        <button mat-raised-button color="primary" (click)="navigateToPostTender()">
          <mat-icon>add</mat-icon>
          Post New Tender
        </button>
      </div>

      <!-- Filters -->
      <mat-card class="filter-card">
        <div class="filters">
          <mat-form-field appearance="outline">
            <mat-label>Search</mat-label>
            <input matInput [(ngModel)]="searchQuery" (ngModelChange)="applyFilters()" 
                   placeholder="Search by title, location...">
            <mat-icon matPrefix>search</mat-icon>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Status</mat-label>
            <mat-select [(ngModel)]="selectedStatus" (ngModelChange)="loadTenders()">
              <mat-option value="">All</mat-option>
              <mat-option value="Open">Open</mat-option>
              <mat-option value="Awarded">Awarded</mat-option>
              <mat-option value="Closed">Closed</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Transport Type</mat-label>
            <mat-select [(ngModel)]="selectedTransportType" (ngModelChange)="loadTenders()">
              <mat-option value="">All</mat-option>
              <mat-option value="Passenger">Passenger</mat-option>
              <mat-option value="Goods">Goods</mat-option>
              <mat-option value="Mixed">Mixed</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Location</mat-label>
            <input matInput [(ngModel)]="selectedLocation" (ngModelChange)="loadTenders()" 
                   placeholder="Filter by location">
            <mat-icon matPrefix>location_on</mat-icon>
          </mat-form-field>
        </div>
      </mat-card>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <mat-spinner></mat-spinner>
        <p>Loading tenders...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && filteredTenders.length === 0" class="empty-state">
        <mat-icon>work_off</mat-icon>
        <h2>No Tenders Found</h2>
        <p>There are no tenders matching your criteria at the moment.</p>
        <button mat-raised-button color="primary" (click)="navigateToPostTender()">
          Post a Tender
        </button>
      </div>

      <!-- Tender Cards -->
      <div class="tenders-grid" *ngIf="!loading && filteredTenders.length > 0">
        <mat-card *ngFor="let tender of filteredTenders" class="tender-card">
          <mat-card-header>
            <div mat-card-avatar class="tender-avatar">
              <mat-icon>local_shipping</mat-icon>
            </div>
            <mat-card-title>{{ tender.title }}</mat-card-title>
            <mat-card-subtitle>
              <mat-icon>person</mat-icon>
              {{ tender.publisherName }}
            </mat-card-subtitle>
            <div class="status-badge" [class]="tender.status.toLowerCase()">
              {{ tender.status }}
            </div>
          </mat-card-header>

          <mat-card-content>
            <p class="description">{{ tender.description }}</p>

            <div class="tender-details">
              <div class="detail-item">
                <mat-icon>calendar_today</mat-icon>
                <div>
                  <strong>Period:</strong>
                  <span>{{ tender.startDate | date:'mediumDate' }} - {{ tender.endDate | date:'mediumDate' }}</span>
                </div>
              </div>

              <div class="detail-item" *ngIf="tender.applicationDeadline">
                <mat-icon>event</mat-icon>
                <div>
                  <strong>Application Deadline:</strong>
                  <span>{{ tender.applicationDeadline | date:'mediumDate' }}</span>
                </div>
              </div>

              <div class="detail-item">
                <mat-icon>route</mat-icon>
                <div>
                  <strong>Route:</strong>
                  <span>{{ tender.pickupLocation }} → {{ tender.dropoffLocation }}</span>
                </div>
              </div>

              <div class="detail-item" *ngIf="tender.transportType">
                <mat-icon>category</mat-icon>
                <div>
                  <strong>Type:</strong>
                  <span>{{ tender.transportType }}</span>
                </div>
              </div>

              <div class="detail-item" *ngIf="tender.requiredVehicles">
                <mat-icon>directions_car</mat-icon>
                <div>
                  <strong>Required Vehicles:</strong>
                  <span>{{ tender.requiredVehicles }}</span>
                </div>
              </div>

              <div class="detail-item" *ngIf="tender.budgetMin || tender.budgetMax">
                <mat-icon>attach_money</mat-icon>
                <div>
                  <strong>Budget Range:</strong>
                  <span>
                    R{{ tender.budgetMin | number:'1.2-2' }} - R{{ tender.budgetMax | number:'1.2-2' }}
                  </span>
                </div>
              </div>
            </div>

            <div class="application-count">
              <mat-icon [matBadge]="tender.applicationCount" matBadgeColor="accent">people</mat-icon>
              <span>{{ tender.applicationCount }} application(s)</span>
            </div>
          </mat-card-content>

          <mat-card-actions>
            <button mat-button color="primary" (click)="viewTenderDetails(tender.id)">
              <mat-icon>visibility</mat-icon>
              View Details
            </button>
            <button mat-raised-button color="accent" 
                    (click)="applyToTender(tender.id)"
                    [disabled]="tender.status !== 'Open' || hasApplied(tender.id)">
              <mat-icon>send</mat-icon>
              {{ hasApplied(tender.id) ? 'Applied' : 'Apply Now' }}
            </button>
          </mat-card-actions>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .tender-list-container {
      padding: 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header-section {
      text-align: center;
      margin-bottom: 32px;
    }

    .header-section h1 {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      font-size: 32px;
      margin: 0 0 8px 0;
      color: #2c3e50;
    }

    .header-section h1 mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
    }

    .subtitle {
      color: #666;
      font-size: 16px;
      margin-bottom: 20px;
    }

    .filter-card {
      margin-bottom: 24px;
      padding: 20px;
    }

    .filters {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .loading-container {
      text-align: center;
      padding: 60px 20px;
    }

    .loading-container p {
      margin-top: 16px;
      color: #666;
    }

    .empty-state {
      text-align: center;
      padding: 60px 20px;
    }

    .empty-state mat-icon {
      font-size: 80px;
      width: 80px;
      height: 80px;
      color: #ccc;
      margin-bottom: 16px;
    }

    .empty-state h2 {
      color: #666;
      margin-bottom: 8px;
    }

    .empty-state p {
      color: #999;
      margin-bottom: 24px;
    }

    .tenders-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
      gap: 24px;
    }

    .tender-card {
      transition: all 0.3s;
      position: relative;
    }

    .tender-card:hover {
      box-shadow: 0 6px 20px rgba(0,0,0,0.15);
      transform: translateY(-4px);
    }

    .tender-card mat-card-header {
      position: relative;
      padding-bottom: 16px;
      border-bottom: 2px solid #f5f7fa;
      margin-bottom: 16px;
    }

    .tender-avatar {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .tender-avatar mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    mat-card-subtitle {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #666;
    }

    mat-card-subtitle mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .status-badge {
      position: absolute;
      top: 16px;
      right: 16px;
      padding: 6px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-badge.open {
      background: #d4edda;
      color: #155724;
    }

    .status-badge.awarded {
      background: #fff3cd;
      color: #856404;
    }

    .status-badge.closed {
      background: #f8d7da;
      color: #721c24;
    }

    .description {
      color: #444;
      line-height: 1.6;
      margin-bottom: 16px;
    }

    .tender-details {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin: 16px 0;
    }

    .detail-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 8px;
      background: #f5f7fa;
      border-radius: 8px;
    }

    .detail-item mat-icon {
      color: #667eea;
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-top: 2px;
    }

    .detail-item strong {
      display: block;
      font-size: 13px;
      color: #666;
      margin-bottom: 2px;
    }

    .detail-item span {
      display: block;
      font-size: 14px;
      color: #333;
    }

    .application-count {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #f5f7fa;
      color: #666;
    }

    .application-count mat-icon {
      color: #667eea;
    }

    mat-card-actions {
      display: flex;
      justify-content: space-between;
      padding: 16px;
      border-top: 1px solid #f5f7fa;
    }

    mat-card-actions button {
      flex: 1;
      margin: 0 4px;
    }

    mat-card-actions button mat-icon {
      margin-right: 4px;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }
  `]
})
export class TenderListComponent implements OnInit {
  private apiUrl = 'http://localhost:5000/api';
  
  tenders: Tender[] = [];
  filteredTenders: Tender[] = [];
  loading = false;
  
  searchQuery = '';
  selectedStatus = '';
  selectedTransportType = '';
  selectedLocation = '';
  
  appliedTenderIds: string[] = [];

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadTenders();
    this.loadMyApplications();
  }

  loadTenders(): void {
    this.loading = true;
    
    let url = `${this.apiUrl}/Tender?`;
    if (this.selectedStatus) url += `status=${this.selectedStatus}&`;
    if (this.selectedTransportType) url += `transportType=${this.selectedTransportType}&`;
    if (this.selectedLocation) url += `location=${this.selectedLocation}&`;

    this.http.get<Tender[]>(url).subscribe({
      next: (data) => {
        this.tenders = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading tenders:', error);
        this.loading = false;
      }
    });
  }

  loadMyApplications(): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http.get<any[]>(`${this.apiUrl}/Tender/my-applications`, { headers }).subscribe({
      next: (applications) => {
        this.appliedTenderIds = applications.map(app => app.tenderId);
      },
      error: (error) => {
        console.error('Error loading applications:', error);
      }
    });
  }

  applyFilters(): void {
    let filtered = [...this.tenders];

    if (this.searchQuery) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(tender =>
        tender.title.toLowerCase().includes(query) ||
        tender.description.toLowerCase().includes(query) ||
        tender.pickupLocation.toLowerCase().includes(query) ||
        tender.dropoffLocation.toLowerCase().includes(query) ||
        tender.serviceArea.toLowerCase().includes(query)
      );
    }

    this.filteredTenders = filtered;
  }

  hasApplied(tenderId: string): boolean {
    return this.appliedTenderIds.includes(tenderId);
  }

  viewTenderDetails(tenderId: string): void {
    // Check if we're in a dashboard context
    const currentUrl = this.router.url;
    if (currentUrl.includes('/owner-dashboard')) {
      this.router.navigate(['/owner-dashboard/tenders', tenderId]);
    } else if (currentUrl.includes('/user-dashboard')) {
      this.router.navigate(['/user-dashboard/tenders', tenderId]);
    } else {
      this.router.navigate(['/tenders', tenderId]);
    }
  }

  applyToTender(tenderId: string): void {
    this.router.navigate(['/owner-dashboard/tenders', tenderId, 'apply']);
  }

  navigateToPostTender(): void {
    // Check if we're in a dashboard context
    const currentUrl = this.router.url;
    if (currentUrl.includes('/owner-dashboard')) {
      this.router.navigate(['/owner-dashboard/tenders/post']);
    } else if (currentUrl.includes('/user-dashboard')) {
      this.router.navigate(['/user-dashboard/tenders/post']);
    } else {
      this.router.navigate(['/tenders/post']);
    }
  }
}
