import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { ConfirmDialogComponent } from '../shared/confirm-dialog.component';

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
  selector: 'app-tender-details',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  template: `
    <div class="tender-details-container">
      <!-- Breadcrumbs -->
      <div class="breadcrumb" *ngIf="!loading">
        <button mat-button (click)="goToDashboard()">
          <mat-icon>home</mat-icon>
          Dashboard
        </button>
        <mat-icon class="breadcrumb-separator">chevron_right</mat-icon>
        <button mat-button (click)="goToMarketplace()">
          Tenders
        </button>
        <mat-icon class="breadcrumb-separator">chevron_right</mat-icon>
        <span class="current">Tender Details</span>
      </div>

      <div class="loading-spinner" *ngIf="loading">
        <mat-spinner></mat-spinner>
        <p>Loading tender details...</p>
      </div>

      <div *ngIf="!loading && tender" class="content">
        <!-- Header Actions -->
        <div class="header-actions">
          <button mat-button (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
            Back
          </button>
          <div class="action-buttons">
            <button mat-raised-button color="accent" (click)="viewApplications()" *ngIf="isMyTender && tender.applicationCount > 0">
              <mat-icon>inbox</mat-icon>
              View {{ tender.applicationCount }} Application(s)
            </button>
            <button mat-raised-button color="primary" (click)="applyToTender()" *ngIf="!isMyTender && tender.status === 'Open'">
              <mat-icon>send</mat-icon>
              Apply Now
            </button>
          </div>
        </div>

        <!-- Main Card -->
        <mat-card class="details-card">
          <mat-card-header>
            <div class="header-content">
              <div class="title-section">
                <h1>{{ tender.title }}</h1>
                <mat-chip [ngClass]="{
                  'status-open': tender.status === 'Open',
                  'status-awarded': tender.status === 'Awarded',
                  'status-closed': tender.status === 'Closed'
                }">{{ tender.status }}</mat-chip>
              </div>
              <p class="publisher-info">
                <mat-icon>business</mat-icon>
                Published by {{ tender.publisherName }}
              </p>
            </div>
          </mat-card-header>

          <mat-card-content>
            <!-- Description -->
            <div class="section">
              <h2><mat-icon>info</mat-icon> Description</h2>
              <p>{{ tender.description }}</p>
            </div>

            <mat-divider></mat-divider>

            <!-- Requirements -->
            <div class="section">
              <h2><mat-icon>checklist</mat-icon> Detailed Requirements</h2>
              <p class="requirements">{{ tender.requirementDetails }}</p>
            </div>

            <mat-divider></mat-divider>

            <!-- Transport Details -->
            <div class="section">
              <h2><mat-icon>local_shipping</mat-icon> Transport Details</h2>
              <div class="details-grid">
                <div class="detail-item">
                  <span class="label">Transport Type:</span>
                  <span class="value">{{ tender.transportType }}</span>
                </div>
                <div class="detail-item" *ngIf="tender.requiredVehicles">
                  <span class="label">Required Vehicles:</span>
                  <span class="value">{{ tender.requiredVehicles }}</span>
                </div>
                <div class="detail-item full-width" *ngIf="tender.routeDetails">
                  <span class="label">Route Details:</span>
                  <span class="value">{{ tender.routeDetails }}</span>
                </div>
              </div>
            </div>

            <mat-divider></mat-divider>

            <!-- Location Details -->
            <div class="section">
              <h2><mat-icon>location_on</mat-icon> Location Details</h2>
              <div class="details-grid">
                <div class="detail-item">
                  <span class="label">Pickup Location:</span>
                  <span class="value">
                    <mat-icon class="inline-icon">place</mat-icon>
                    {{ tender.pickupLocation }}
                  </span>
                </div>
                <div class="detail-item">
                  <span class="label">Dropoff Location:</span>
                  <span class="value">
                    <mat-icon class="inline-icon">flag</mat-icon>
                    {{ tender.dropoffLocation }}
                  </span>
                </div>
                <div class="detail-item full-width">
                  <span class="label">Service Area:</span>
                  <span class="value">{{ tender.serviceArea }}</span>
                </div>
              </div>
            </div>

            <mat-divider></mat-divider>

            <!-- Budget & Timeline -->
            <div class="section">
              <h2><mat-icon>attach_money</mat-icon> Budget & Timeline</h2>
              <div class="details-grid">
                <div class="detail-item" *ngIf="tender.budgetMin && tender.budgetMax">
                  <span class="label">Budget Range:</span>
                  <span class="value budget">R{{ tender.budgetMin | number }} - R{{ tender.budgetMax | number }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Start Date:</span>
                  <span class="value">{{ tender.startDate | date:'medium' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">End Date:</span>
                  <span class="value">{{ tender.endDate | date:'medium' }}</span>
                </div>
                <div class="detail-item" *ngIf="tender.applicationDeadline">
                  <span class="label">Application Deadline:</span>
                  <span class="value deadline">{{ tender.applicationDeadline | date:'medium' }}</span>
                </div>
              </div>
            </div>

            <mat-divider></mat-divider>

            <!-- Additional Info -->
            <div class="section">
              <h2><mat-icon>more_horiz</mat-icon> Additional Information</h2>
              <div class="details-grid">
                <div class="detail-item">
                  <span class="label">Posted On:</span>
                  <span class="value">{{ tender.createdAt | date:'medium' }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Total Applications:</span>
                  <span class="value">{{ tender.applicationCount }}</span>
                </div>
                <div class="detail-item" *ngIf="tender.awardedToOwnerName">
                  <span class="label">Awarded To:</span>
                  <span class="value">{{ tender.awardedToOwnerName }}</span>
                </div>
                <div class="detail-item">
                  <span class="label">Contact:</span>
                  <span class="value">{{ tender.publisherEmail }}</span>
                </div>
              </div>
            </div>
          </mat-card-content>

          <mat-card-actions>
            <button mat-button (click)="goBack()">
              <mat-icon>cancel</mat-icon>
              Close
            </button>
            <button mat-raised-button color="accent" (click)="viewApplications()" *ngIf="isMyTender && tender.applicationCount > 0">
              <mat-icon>inbox</mat-icon>
              View Applications
            </button>
            <button mat-raised-button color="primary" (click)="applyToTender()" *ngIf="!isMyTender && tender.status === 'Open'">
              <mat-icon>send</mat-icon>
              Apply to This Tender
            </button>
          </mat-card-actions>
        </mat-card>
      </div>

      <div *ngIf="!loading && !tender" class="error-state">
        <mat-icon>error_outline</mat-icon>
        <h2>Tender Not Found</h2>
        <p>The tender you're looking for doesn't exist or has been removed.</p>
        <button mat-raised-button color="primary" (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
          Go Back
        </button>
      </div>
    </div>
  `,
  styles: [`
    .tender-details-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      padding: 8px 0;
      margin-bottom: 16px;
      color: #64748b;
      font-size: 14px;

      button {
        color: #3b82f6;
        font-size: 14px;
        padding: 4px 8px;
        min-width: auto;
        line-height: 20px;

        mat-icon {
          font-size: 18px;
          width: 18px;
          height: 18px;
          margin-right: 4px;
        }
      }

      .breadcrumb-separator {
        font-size: 18px;
        width: 18px;
        height: 18px;
        color: #cbd5e1;
        margin: 0 4px;
      }

      .current {
        color: #64748b;
        font-weight: 500;
      }
    }

    .loading-spinner {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      gap: 20px;
    }

    .loading-spinner p {
      color: #64748b;
      font-size: 16px;
    }

    .header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .action-buttons {
      display: flex;
      gap: 12px;
    }

    .details-card {
      border-radius: 12px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
    }

    .header-content {
      width: 100%;
    }

    .title-section {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .title-section h1 {
      margin: 0;
      font-size: 28px;
      color: #2c3e50;
      font-weight: 600;
    }

    .publisher-info {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #64748b;
      margin: 0;
      font-size: 14px;
    }

    .publisher-info mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    mat-card-content {
      padding: 24px;
    }

    .section {
      padding: 24px 0;
    }

    .section:first-child {
      padding-top: 0;
    }

    .section h2 {
      display: flex;
      align-items: center;
      gap: 12px;
      font-size: 20px;
      color: #2c3e50;
      margin: 0 0 16px 0;
      font-weight: 600;
    }

    .section h2 mat-icon {
      color: #667eea;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .section p {
      color: #475569;
      line-height: 1.6;
      margin: 0;
    }

    .requirements {
      white-space: pre-line;
    }

    .details-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 20px;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .detail-item.full-width {
      grid-column: 1 / -1;
    }

    .detail-item .label {
      font-weight: 600;
      color: #64748b;
      font-size: 14px;
    }

    .detail-item .value {
      color: #2c3e50;
      font-size: 16px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .detail-item .value.budget {
      color: #10b981;
      font-weight: 600;
      font-size: 18px;
    }

    .detail-item .value.deadline {
      color: #f59e0b;
      font-weight: 500;
    }

    .inline-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #94a3b8;
    }

    mat-divider {
      margin: 24px 0;
    }

    mat-card-actions {
      padding: 16px 24px;
      display: flex;
      justify-content: space-between;
      border-top: 1px solid #e5e7eb;
    }

    .status-open {
      background: #10b981 !important;
      color: white !important;
      font-weight: 600;
    }

    .status-awarded {
      background: #3b82f6 !important;
      color: white !important;
      font-weight: 600;
    }

    .status-closed {
      background: #6b7280 !important;
      color: white !important;
      font-weight: 600;
    }

    .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      gap: 16px;
      text-align: center;
    }

    .error-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ef4444;
    }

    .error-state h2 {
      color: #2c3e50;
      margin: 0;
    }

    .error-state p {
      color: #64748b;
      margin: 0;
    }

    @media (max-width: 768px) {
      .tender-details-container {
        padding: 16px;
      }

      .header-actions {
        flex-direction: column;
        align-items: flex-start;
        gap: 16px;
      }

      .action-buttons {
        width: 100%;
        flex-direction: column;
      }

      .action-buttons button {
        width: 100%;
      }

      .title-section {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }

      .details-grid {
        grid-template-columns: 1fr;
      }

      mat-card-actions {
        flex-direction: column;
        gap: 12px;
      }

      mat-card-actions button {
        width: 100%;
      }
    }
  `]
})
export class TenderDetailsComponent implements OnInit {
  private apiUrl = 'http://localhost:5000/api';
  tender: Tender | null = null;
  loading = false;
  isMyTender = false;
  currentUserId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    const tenderId = this.route.snapshot.paramMap.get('id');
    if (tenderId) {
      this.loadTenderDetails(tenderId);
    }
    
    // Get current user ID from localStorage
    const userStr = localStorage.getItem('user');
    if (userStr) {
      const user = JSON.parse(userStr);
      this.currentUserId = user.id || user.userId;
    }
  }

  loadTenderDetails(tenderId: string): void {
    this.loading = true;
    const token = localStorage.getItem('token');
    const headers = token ? new HttpHeaders().set('Authorization', `Bearer ${token}`) : undefined;

    this.http.get<Tender>(`${this.apiUrl}/Tender/${tenderId}`, { headers }).subscribe({
      next: (tender) => {
        this.tender = tender;
        this.isMyTender = this.currentUserId === tender.tenderPublisherId;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading tender details:', error);
        this.snackBar.open('Failed to load tender details', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  applyToTender(): void {
    if (!this.tender) return;
    
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '450px',
      data: {
        title: 'Apply to Tender',
        message: `You are about to apply for "${this.tender.title}". Make sure you review all requirements before submitting your application.`,
        confirmText: 'Continue to Application',
        cancelText: 'Cancel',
        icon: 'send',
        color: 'primary'
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result && this.tender) {
        this.router.navigate(['/owner-dashboard/tenders', this.tender.id, 'apply']);
      }
    });
  }

  viewApplications(): void {
    if (!this.tender) return;
    this.router.navigate(['/tenders', this.tender.id, 'applications']);
  }

  goBack(): void {
    this.router.navigate(['/owner-dashboard']);
  }

  goToDashboard(): void {
    this.router.navigate(['/owner-dashboard']);
  }

  goToMarketplace(): void {
    this.router.navigate(['/owner-dashboard'], { fragment: 'marketplace' });
  }
}
