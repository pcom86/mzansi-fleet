import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface StuffRequest {
  id: string;
  passengerId: string;
  passengerName: string;
  passengerEmail: string;
  passengerPhone: string;
  pickupLocation: string;
  dropoffLocation: string;
  itemDescription: string;
  itemCategory: string;
  itemValue?: number;
  specialInstructions?: string;
  preferredPickupTime?: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

@Component({
  selector: 'app-stuff-request-details',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
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
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
    <div class="stuff-request-details-container">
      <div class="header">
        <button mat-icon-button (click)="goBack()" class="back-button">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h2>Stuff Transport Request Details</h2>
      </div>

      <div *ngIf="loading" class="loading-container">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        <p>Loading request details...</p>
      </div>

      <div *ngIf="!loading && request" class="content">
        <mat-card class="request-card">
          <mat-card-header>
            <div class="request-header">
              <div class="request-type">
                <mat-icon class="type-stuff">shopping_bag</mat-icon>
                <span class="type-label">Stuff Transport</span>
              </div>
              <mat-chip [class]="getStatusClass(request.status)">
                {{ request.status }}
              </mat-chip>
            </div>
          </mat-card-header>

          <mat-card-content>
            <div class="request-content">
              <div class="main-info">
                <h3>{{ request.itemCategory }} Transport</h3>
                <p class="description">{{ request.itemDescription }}</p>
                <div class="item-value" *ngIf="request.itemValue">
                  <mat-icon>attach_money</mat-icon>
                  <span>Estimated Value: R{{ request.itemValue | number:'1.2-2' }}</span>
                </div>
              </div>

              <mat-divider></mat-divider>

              <div class="details-grid">
                <div class="detail-section">
                  <h4>Customer Information</h4>
                  <div class="detail-items">
                    <div class="detail-item">
                      <mat-icon>person</mat-icon>
                      <span>{{ request.passengerName }}</span>
                    </div>
                    <div class="detail-item">
                      <mat-icon>email</mat-icon>
                      <span>{{ request.passengerEmail }}</span>
                    </div>
                    <div class="detail-item">
                      <mat-icon>phone</mat-icon>
                      <span>{{ request.passengerPhone }}</span>
                    </div>
                  </div>
                </div>

                <div class="detail-section">
                  <h4>Transport Details</h4>
                  <div class="detail-items">
                    <div class="detail-item">
                      <mat-icon>location_on</mat-icon>
                      <span><strong>Pickup:</strong> {{ request.pickupLocation }}</span>
                    </div>
                    <div class="detail-item">
                      <mat-icon>flag</mat-icon>
                      <span><strong>Dropoff:</strong> {{ request.dropoffLocation }}</span>
                    </div>
                    <div class="detail-item" *ngIf="request.preferredPickupTime">
                      <mat-icon>schedule</mat-icon>
                      <span>Preferred Time: {{ formatDate(request.preferredPickupTime) }}</span>
                    </div>
                    <div class="detail-item">
                      <mat-icon>category</mat-icon>
                      <span>Category: {{ request.itemCategory }}</span>
                    </div>
                  </div>
                </div>

                <div class="detail-section" *ngIf="request.specialInstructions">
                  <h4>Special Instructions</h4>
                  <div class="special-instructions">
                    <mat-icon>info</mat-icon>
                    <p>{{ request.specialInstructions }}</p>
                  </div>
                </div>
              </div>

              <mat-divider></mat-divider>

              <div class="request-timeline">
                <h4>Request Timeline</h4>
                <div class="timeline-item">
                  <mat-icon>schedule</mat-icon>
                  <div class="timeline-content">
                    <span class="timeline-title">Request Created</span>
                    <span class="timeline-date">{{ formatDate(request.createdAt) }}</span>
                  </div>
                </div>
                <div class="timeline-item" *ngIf="request.updatedAt !== request.createdAt">
                  <mat-icon>update</mat-icon>
                  <div class="timeline-content">
                    <span class="timeline-title">Last Updated</span>
                    <span class="timeline-date">{{ formatDate(request.updatedAt) }}</span>
                  </div>
                </div>
              </div>
            </div>
          </mat-card-content>

          <mat-card-actions *ngIf="request.status === 'Pending'">
            <button mat-raised-button color="primary" (click)="acceptRequest()">
              <mat-icon>check_circle</mat-icon>
              Accept Request
            </button>
            <button mat-button (click)="declineRequest()">
              <mat-icon>cancel</mat-icon>
              Decline
            </button>
          </mat-card-actions>
        </mat-card>
      </div>

      <div *ngIf="!loading && !request" class="error-container">
        <mat-icon>error</mat-icon>
        <h3>Request Not Found</h3>
        <p>The requested stuff transport request could not be found.</p>
        <button mat-raised-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
          Back to Requests
        </button>
      </div>
    </div>
  `,
  styles: [`
    .stuff-request-details-container {
      padding: 20px;
      max-width: 1000px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-bottom: 24px;
    }

    .header h2 {
      margin: 0;
      color: #333;
      font-weight: 500;
    }

    .back-button {
      color: #666;
    }

    .loading-container, .error-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 60px 20px;
      text-align: center;
    }

    .loading-container mat-icon, .error-container mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 16px;
      color: #666;
    }

    .content {
      display: flex;
      flex-direction: column;
      gap: 20px;
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

    .type-stuff {
      color: #9c27b0;
    }

    .type-label {
      font-weight: 500;
      color: #666;
    }

    .request-content .main-info h3 {
      margin: 0 0 8px 0;
      color: #333;
    }

    .request-content .description {
      color: #666;
      margin-bottom: 12px;
    }

    .item-value {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #1976d2;
      font-weight: 500;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 24px;
      margin-top: 20px;
    }

    .detail-section h4 {
      margin: 0 0 12px 0;
      color: #333;
      font-weight: 500;
    }

    .detail-items {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .detail-item {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
    }

    .detail-item mat-icon {
      color: #666;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .detail-item span {
      color: #333;
    }

    .special-instructions {
      display: flex;
      gap: 8px;
      padding: 12px;
      background-color: #f5f5f5;
      border-radius: 4px;
    }

    .special-instructions mat-icon {
      color: #ff9800;
      flex-shrink: 0;
    }

    .special-instructions p {
      margin: 0;
      color: #333;
    }

    .request-timeline {
      margin-top: 24px;
    }

    .request-timeline h4 {
      margin: 0 0 16px 0;
      color: #333;
      font-weight: 500;
    }

    .timeline-item {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      padding: 8px 0;
    }

    .timeline-item mat-icon {
      color: #666;
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-top: 2px;
    }

    .timeline-content {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .timeline-title {
      font-weight: 500;
      color: #333;
    }

    .timeline-date {
      font-size: 14px;
      color: #666;
    }

    mat-card-actions {
      padding: 16px;
      display: flex;
      gap: 12px;
      justify-content: flex-end;
    }

    .status-pending {
      background-color: #fff3e0;
      color: #f57c00;
    }

    .status-accepted {
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .status-completed {
      background-color: #e8f5e8;
      color: #388e3c;
    }

    .status-cancelled {
      background-color: #ffebee;
      color: #d32f2f;
    }
  `]
})
export class StuffRequestDetailsComponent implements OnInit {
  request: StuffRequest | null = null;
  loading = true;
  requestId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.requestId = this.route.snapshot.queryParams['requestId'];
    if (this.requestId) {
      this.loadRequestDetails();
    } else {
      this.loading = false;
      this.snackBar.open('No request ID provided', 'Close', { duration: 3000 });
    }
  }

  loadRequestDetails() {
    if (!this.requestId) return;

    // Assuming stuff requests are stored in a StuffRequests table
    this.http.get<StuffRequest>(`${environment.apiUrl}/StuffRequests/${this.requestId}`)
      .subscribe({
        next: (request) => {
          this.request = request;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading stuff request:', error);
          this.loading = false;
          this.snackBar.open('Failed to load request details', 'Close', { duration: 3000 });
        }
      });
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending': return 'status-pending';
      case 'accepted': return 'status-accepted';
      case 'completed': return 'status-completed';
      case 'cancelled': return 'status-cancelled';
      default: return 'status-pending';
    }
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  acceptRequest() {
    // TODO: Implement request acceptance functionality
    this.snackBar.open('Request acceptance feature coming soon', 'Close', { duration: 3000 });
  }

  declineRequest() {
    // TODO: Implement request decline functionality
    this.snackBar.open('Request decline feature coming soon', 'Close', { duration: 3000 });
  }

  goBack() {
    this.router.navigate(['/service-provider-dashboard/service-requests']);
  }
}