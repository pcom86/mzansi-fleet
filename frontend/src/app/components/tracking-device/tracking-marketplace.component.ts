import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { TrackingDeviceService } from '../../services/tracking-device.service';
import { TrackingDeviceRequest, TrackingDeviceOffer, CreateTrackingDeviceOffer } from '../../models/tracking-device.model';

@Component({
  selector: 'app-tracking-marketplace',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule,
    MatExpansionModule,
    MatDividerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
    <div class="marketplace-container">
      <div class="page-header">
        <h1><mat-icon>gps_fixed</mat-icon> Tracking Device</h1>
        <p>Browse installation requests and submit competitive offers</p>
      </div>

      <mat-tab-group>
        <mat-tab label="Available Requests">
          <div class="tab-content">
            <div *ngIf="loadingRequests" class="loading">
              <mat-icon class="spinning">refresh</mat-icon>
              <p>Loading requests...</p>
            </div>

            <div *ngIf="!loadingRequests && marketplaceRequests.length === 0" class="empty-state">
              <mat-icon>inbox</mat-icon>
              <h2>No installation requests available</h2>
              <p>Check back later for new opportunities</p>
            </div>

            <div class="requests-grid" *ngIf="!loadingRequests && marketplaceRequests.length > 0">
              <mat-card *ngFor="let request of marketplaceRequests" class="request-card">
                <mat-card-header>
                  <mat-card-title>
                    <div class="vehicle-title">
                      <mat-icon>directions_car</mat-icon>
                      {{ request.vehicleRegistration }}
                      <mat-chip class="vehicle-chip">{{ request.vehicleMake }} {{ request.vehicleModel }}</mat-chip>
                    </div>
                  </mat-card-title>
                  <mat-chip *ngIf="request.hasMyOffer" color="accent">
                    <mat-icon>check_circle</mat-icon> Offer Submitted
                  </mat-chip>
                </mat-card-header>

                <mat-card-content>
                  <div class="request-info">
                    <div class="info-row">
                      <mat-icon>location_on</mat-icon>
                      <span><strong>Location:</strong> {{ request.installationLocation }}</span>
                    </div>
                    <div class="info-row">
                      <mat-icon>calendar_today</mat-icon>
                      <span><strong>Preferred Date:</strong> {{ request.preferredInstallationDate }}</span>
                    </div>
                    <div class="info-row">
                      <mat-icon>business</mat-icon>
                      <span><strong>Owner:</strong> {{ request.ownerName }}</span>
                    </div>
                  </div>

                  <mat-divider class="divider"></mat-divider>

                  <div class="features-section">
                    <h4><mat-icon>settings</mat-icon> Required Features</h4>
                    <p class="features-text">{{ request.deviceFeatures }}</p>
                  </div>

                  <div *ngIf="request.specialRequirements" class="requirements-section">
                    <h4><mat-icon>notes</mat-icon> Special Requirements</h4>
                    <p>{{ request.specialRequirements }}</p>
                  </div>

                  <div *ngIf="request.budgetMin || request.budgetMax" class="budget-section">
                    <mat-icon>attach_money</mat-icon>
                    <span>
                      <strong>Budget Range:</strong>
                      R {{ request.budgetMin || 0 }} - R {{ request.budgetMax || 'Open' }}
                    </span>
                  </div>

                  <div class="meta-info">
                    <span class="date">Posted {{ formatDate(request.createdAt) }}</span>
                    <span class="offers-count">
                      <mat-icon>local_offer</mat-icon>
                      {{ request.offerCount }} offer(s)
                    </span>
                  </div>
                </mat-card-content>

                <mat-card-actions>
                  <button mat-raised-button color="primary" 
                          (click)="openOfferDialog(request)"
                          [disabled]="request.hasMyOffer">
                    <mat-icon>add_circle</mat-icon>
                    {{ request.hasMyOffer ? 'Offer Already Submitted' : 'Submit Offer' }}
                  </button>
                  <button mat-button (click)="viewRequestDetails(request)">
                    <mat-icon>visibility</mat-icon>
                    View Details
                  </button>
                </mat-card-actions>
              </mat-card>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="My Offers">
          <div class="tab-content">
            <div *ngIf="loadingOffers" class="loading">
              <mat-icon class="spinning">refresh</mat-icon>
              <p>Loading offers...</p>
            </div>

            <div *ngIf="!loadingOffers && myOffers.length === 0" class="empty-state">
              <mat-icon>inbox</mat-icon>
              <h2>No offers submitted yet</h2>
              <p>Browse available requests and submit your first offer</p>
            </div>

            <div class="offers-list" *ngIf="!loadingOffers && myOffers.length > 0">
              <mat-expansion-panel *ngFor="let offer of myOffers">
                <mat-expansion-panel-header>
                  <mat-panel-title>
                    <div class="offer-title">
                      <span>{{ offer.deviceBrand }} {{ offer.deviceModel }}</span>
                      <mat-chip [class]="'status-' + offer.status.toLowerCase()">
                        {{ offer.status }}
                      </mat-chip>
                    </div>
                  </mat-panel-title>
                  <mat-panel-description>
                    R {{ offer.totalUpfrontCost.toFixed(2) }} + R {{ offer.monthlySubscriptionFee.toFixed(2) }}/month
                  </mat-panel-description>
                </mat-expansion-panel-header>

                <div class="offer-details">
                  <div class="detail-section">
                    <h4>Device Details</h4>
                    <p><strong>Features:</strong> {{ offer.deviceFeatures }}</p>
                    <p><strong>Installation:</strong> {{ offer.installationDetails }}</p>
                    <p><strong>Time:</strong> {{ offer.estimatedInstallationTime }}</p>
                  </div>

                  <div class="detail-section">
                    <h4>Pricing Breakdown</h4>
                    <div class="pricing-table">
                      <div class="price-row">
                        <span>Device Cost:</span>
                        <strong>R {{ offer.deviceCost.toFixed(2) }}</strong>
                      </div>
                      <div class="price-row">
                        <span>Installation:</span>
                        <strong>R {{ offer.installationCost.toFixed(2) }}</strong>
                      </div>
                      <div class="price-row total">
                        <span>Total Upfront:</span>
                        <strong>R {{ offer.totalUpfrontCost.toFixed(2) }}</strong>
                      </div>
                      <div class="price-row subscription">
                        <span>Monthly Fee:</span>
                        <strong>R {{ offer.monthlySubscriptionFee.toFixed(2) }}</strong>
                      </div>
                    </div>
                  </div>

                  <div class="detail-section">
                    <h4>Service Details</h4>
                    <p><strong>Warranty:</strong> {{ offer.warrantyPeriod }}</p>
                    <p><strong>Support:</strong> {{ offer.supportDetails }}</p>
                    <p><strong>Available From:</strong> {{ formatDate(offer.availableFrom) }}</p>
                  </div>

                  <div *ngIf="offer.additionalNotes" class="detail-section">
                    <h4>Additional Notes</h4>
                    <p>{{ offer.additionalNotes }}</p>
                  </div>

                  <div class="offer-footer">
                    <span class="submitted-date">Submitted {{ formatDate(offer.submittedAt) }}</span>
                  </div>
                </div>
              </mat-expansion-panel>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>

    <!-- Offer Submission Dialog -->
    <ng-template #offerDialog>
      <h2 mat-dialog-title>Submit Installation Offer</h2>
      <mat-dialog-content>
        <form #offerForm="ngForm">
          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Device Brand</mat-label>
            <input matInput [(ngModel)]="newOffer.deviceBrand" name="brand" 
                   placeholder="e.g., Tracker, Cartrack, Netstar" required>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Device Model</mat-label>
            <input matInput [(ngModel)]="newOffer.deviceModel" name="model" 
                   placeholder="e.g., Pro 5, Advanced GPS" required>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Device Features</mat-label>
            <textarea matInput [(ngModel)]="newOffer.deviceFeatures" name="features" rows="3"
                      placeholder="GPS tracking, Geofencing, Speed alerts, etc." required></textarea>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Installation Details</mat-label>
            <textarea matInput [(ngModel)]="newOffer.installationDetails" name="installation" rows="2"
                      placeholder="Professional installation at your location" required></textarea>
          </mat-form-field>

          <div class="pricing-fields">
            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Device Cost (R)</mat-label>
              <input matInput type="number" [(ngModel)]="newOffer.deviceCost" name="deviceCost" 
                     min="0" step="0.01" required>
            </mat-form-field>

            <mat-form-field appearance="outline" class="half-width">
              <mat-label>Installation Cost (R)</mat-label>
              <input matInput type="number" [(ngModel)]="newOffer.installationCost" name="installCost" 
                     min="0" step="0.01" required>
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Monthly Subscription Fee (R)</mat-label>
            <input matInput type="number" [(ngModel)]="newOffer.monthlySubscriptionFee" name="monthly" 
                   min="0" step="0.01" required>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Warranty Period</mat-label>
            <input matInput [(ngModel)]="newOffer.warrantyPeriod" name="warranty" 
                   placeholder="e.g., 12 months, 2 years" required>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Support Details</mat-label>
            <input matInput [(ngModel)]="newOffer.supportDetails" name="support" 
                   placeholder="e.g., 24/7 phone support" required>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Available From</mat-label>
            <input matInput [matDatepicker]="availablePicker" [(ngModel)]="newOffer.availableFrom" name="available" required>
            <mat-datepicker-toggle matIconSuffix [for]="availablePicker"></mat-datepicker-toggle>
            <mat-datepicker #availablePicker></mat-datepicker>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Estimated Installation Time</mat-label>
            <input matInput [(ngModel)]="newOffer.estimatedInstallationTime" name="time" 
                   placeholder="e.g., 1-2 hours" required>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Additional Notes (Optional)</mat-label>
            <textarea matInput [(ngModel)]="newOffer.additionalNotes" name="notes" rows="2"
                      placeholder="Any additional information"></textarea>
          </mat-form-field>

          <div class="total-cost">
            <strong>Total Upfront Cost:</strong>
            <span class="amount">R {{ calculateTotalUpfront() }}</span>
          </div>
        </form>
      </mat-dialog-content>
      <mat-dialog-actions>
        <button mat-button mat-dialog-close>Cancel</button>
        <button mat-raised-button color="primary" 
                [disabled]="!offerForm.valid || submittingOffer"
                (click)="submitOffer()">
          {{ submittingOffer ? 'Submitting...' : 'Submit Offer' }}
        </button>
      </mat-dialog-actions>
    </ng-template>
  `,
  styles: [`
    .marketplace-container {
      padding: 2rem;
      max-width: 1600px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 0 0.5rem 0;
      color: #1976d2;
    }

    .page-header p {
      margin: 0;
      color: #666;
    }

    .tab-content {
      padding: 2rem 0;
    }

    .loading, .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: #999;
    }

    .loading mat-icon, .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 1rem;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    .requests-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 1.5rem;
    }

    @media (max-width: 768px) {
      .requests-grid {
        grid-template-columns: 1fr;
      }
    }

    .request-card {
      height: fit-content;
      transition: all 0.3s;
    }

    .request-card:hover {
      box-shadow: 0 6px 12px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .vehicle-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .vehicle-chip {
      font-size: 0.75rem;
      min-height: 24px;
    }

    .request-info {
      margin: 1rem 0;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0.5rem 0;
      color: #555;
    }

    .info-row mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #1976d2;
    }

    .divider {
      margin: 1rem 0;
    }

    .features-section,
    .requirements-section {
      margin: 1rem 0;
    }

    .features-section h4,
    .requirements-section h4 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
      margin: 0.5rem 0;
      color: #333;
    }

    .features-text {
      color: #666;
      font-style: italic;
      margin: 0.5rem 0;
    }

    .budget-section {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: #e3f2fd;
      border-radius: 4px;
      margin: 1rem 0;
    }

    .budget-section mat-icon {
      color: #1976d2;
    }

    .meta-info {
      display: flex;
      justify-content: space-between;
      margin-top: 1rem;
      padding-top: 0.75rem;
      border-top: 1px solid #f0f0f0;
      font-size: 0.85rem;
      color: #999;
    }

    .offers-count {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .offers-count mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .offers-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .offer-title {
      display: flex;
      align-items: center;
      gap: 1rem;
      width: 100%;
    }

    .offer-details {
      padding: 1rem;
    }

    .detail-section {
      margin-bottom: 1.5rem;
    }

    .detail-section h4 {
      margin: 0 0 0.75rem 0;
      color: #1976d2;
    }

    .detail-section p {
      margin: 0.5rem 0;
      color: #555;
    }

    .pricing-table {
      background: #f5f5f5;
      padding: 1rem;
      border-radius: 4px;
    }

    .price-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
    }

    .price-row.total {
      border-top: 2px solid #1976d2;
      margin-top: 0.5rem;
      padding-top: 0.75rem;
    }

    .price-row.subscription {
      background: #e3f2fd;
      padding: 0.75rem;
      margin-top: 0.5rem;
      border-radius: 4px;
    }

    .offer-footer {
      text-align: right;
      color: #999;
      font-size: 0.85rem;
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid #e0e0e0;
    }

    mat-chip {
      font-size: 0.75rem;
      min-height: 24px;
    }

    .status-pending {
      background: #fff3e0;
      color: #f57c00;
    }

    .status-accepted {
      background: #e8f5e9;
      color: #388e3c;
    }

    .status-rejected {
      background: #ffebee;
      color: #c62828;
    }

    /* Dialog Styles */
    mat-dialog-content {
      min-width: 500px;
      max-height: 70vh;
    }

    .full-width {
      width: 100%;
      margin-bottom: 1rem;
    }

    .pricing-fields {
      display: flex;
      gap: 1rem;
    }

    .half-width {
      flex: 1;
    }

    .total-cost {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1rem;
      background: #e3f2fd;
      border-radius: 4px;
      margin-top: 1rem;
    }

    .total-cost .amount {
      font-size: 1.5rem;
      color: #1976d2;
      font-weight: bold;
    }
  `]
})
export class TrackingMarketplaceComponent implements OnInit {
  @ViewChild('offerDialog') offerDialogTemplate!: TemplateRef<any>;
  
  marketplaceRequests: TrackingDeviceRequest[] = [];
  myOffers: TrackingDeviceOffer[] = [];
  selectedRequest?: TrackingDeviceRequest;
  
  loadingRequests = false;
  loadingOffers = false;
  submittingOffer = false;

  newOffer: CreateTrackingDeviceOffer = {
    trackingDeviceRequestId: '',
    deviceBrand: '',
    deviceModel: '',
    deviceFeatures: '',
    installationDetails: '',
    deviceCost: 0,
    installationCost: 0,
    monthlySubscriptionFee: 0,
    warrantyPeriod: '',
    supportDetails: '',
    availableFrom: '',
    estimatedInstallationTime: '',
    additionalNotes: ''
  };

  constructor(
    private trackingService: TrackingDeviceService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadMarketplaceRequests();
    this.loadMyOffers();
  }

  loadMarketplaceRequests() {
    this.loadingRequests = true;
    this.trackingService.getMarketplaceRequests().subscribe({
      next: (requests) => {
        this.marketplaceRequests = requests;
        this.loadingRequests = false;
      },
      error: (error) => {
        console.error('Error loading requests:', error);
        this.loadingRequests = false;
        this.snackBar.open('Failed to load requests', 'Close', { duration: 3000 });
      }
    });
  }

  loadMyOffers() {
    this.loadingOffers = true;
    this.trackingService.getMyOffers().subscribe({
      next: (offers) => {
        this.myOffers = offers;
        this.loadingOffers = false;
      },
      error: (error) => {
        console.error('Error loading offers:', error);
        this.loadingOffers = false;
        this.snackBar.open('Failed to load offers', 'Close', { duration: 3000 });
      }
    });
  }

  openOfferDialog(request: TrackingDeviceRequest) {
    this.selectedRequest = request;
    this.resetOfferForm();
    
    const dialogRef = this.dialog.open(this.offerDialogTemplate, {
      width: '600px',
      maxHeight: '90vh',
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'submitted') {
        this.loadMarketplaceRequests();
        this.loadMyOffers();
      }
    });
  }

  resetOfferForm() {
    this.newOffer = {
      trackingDeviceRequestId: this.selectedRequest?.id || '',
      deviceBrand: '',
      deviceModel: '',
      deviceFeatures: '',
      installationDetails: '',
      deviceCost: 0,
      installationCost: 0,
      monthlySubscriptionFee: 0,
      warrantyPeriod: '',
      supportDetails: '',
      availableFrom: '',
      estimatedInstallationTime: '',
      additionalNotes: ''
    };
  }

  calculateTotalUpfront(): string {
    const total = (this.newOffer.deviceCost || 0) + (this.newOffer.installationCost || 0);
    return total.toFixed(2);
  }

  submitOffer() {
    if (this.submittingOffer) return;

    this.submittingOffer = true;

    this.trackingService.submitOffer(this.newOffer).subscribe({
      next: () => {
        this.snackBar.open('Offer submitted successfully!', 'Close', { 
          duration: 3000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        this.submittingOffer = false;
        this.dialog.closeAll();
        this.loadMarketplaceRequests();
        this.loadMyOffers();
      },
      error: (error) => {
        console.error('Error submitting offer:', error);
        this.snackBar.open(error.error?.message || 'Failed to submit offer. Please try again.', 'Close', { 
          duration: 5000,
          horizontalPosition: 'center',
          verticalPosition: 'top'
        });
        this.submittingOffer = false;
      }
    });
  }

  viewRequestDetails(request: TrackingDeviceRequest) {
    // Could navigate to a detailed view or show a dialog
    console.log('View request details:', request);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  }
}
