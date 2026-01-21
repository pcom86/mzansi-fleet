import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { TrackingDeviceService } from '../../services/tracking-device.service';
import { TrackingDeviceOffer } from '../../models/tracking-device.model';

@Component({
  selector: 'app-tracking-device-offers',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="offers-container">
      <div class="page-header">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1><mat-icon>local_offer</mat-icon> Tracking Device Offers</h1>
      </div>

      <div *ngIf="loading" class="loading">
        <mat-icon class="spinning">refresh</mat-icon>
        <p>Loading offers...</p>
      </div>

      <div *ngIf="!loading && offers.length === 0" class="empty-state">
        <mat-icon>inbox</mat-icon>
        <h2>No offers yet</h2>
        <p>Tracking companies haven't submitted offers for this request yet.</p>
        <button mat-raised-button color="primary" (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
          Back to Requests
        </button>
      </div>

      <div class="offers-grid" *ngIf="!loading && offers.length > 0">
        <mat-card *ngFor="let offer of offers" class="offer-card" [class.accepted]="offer.status === 'Accepted'">
          <mat-card-header>
            <mat-card-title class="provider-name">
              <mat-icon>business</mat-icon>
              {{ offer.serviceProviderName }}
            </mat-card-title>
            <mat-chip [class]="'status-' + offer.status.toLowerCase()">
              {{ offer.status }}
            </mat-chip>
          </mat-card-header>

          <mat-card-content>
            <div class="provider-info">
              <div class="info-row">
                <mat-icon>phone</mat-icon>
                <span>{{ offer.serviceProviderPhone }}</span>
              </div>
              <div class="info-row">
                <mat-icon>email</mat-icon>
                <span>{{ offer.serviceProviderEmail }}</span>
              </div>
              <div class="info-row">
                <mat-icon>location_on</mat-icon>
                <span>{{ offer.serviceProviderAddress }}</span>
              </div>
              <div class="info-row" *ngIf="offer.serviceProviderRating">
                <mat-icon>star</mat-icon>
                <span>{{ offer.serviceProviderRating.toFixed(1) }} ({{ offer.serviceProviderReviews }} reviews)</span>
              </div>
            </div>

            <mat-divider class="section-divider"></mat-divider>

            <div class="device-details">
              <h3><mat-icon>gps_fixed</mat-icon> Device Details</h3>
              <div class="detail-item">
                <strong>Brand & Model:</strong>
                <span>{{ offer.deviceBrand }} {{ offer.deviceModel }}</span>
              </div>
              <div class="detail-item">
                <strong>Features:</strong>
                <span>{{ offer.deviceFeatures }}</span>
              </div>
              <div class="detail-item">
                <strong>Installation:</strong>
                <span>{{ offer.installationDetails }}</span>
              </div>
              <div class="detail-item">
                <strong>Estimated Time:</strong>
                <span>{{ offer.estimatedInstallationTime }}</span>
              </div>
            </div>

            <mat-divider class="section-divider"></mat-divider>

            <div class="pricing">
              <h3><mat-icon>attach_money</mat-icon> Pricing</h3>
              <div class="price-row">
                <span>Device Cost:</span>
                <strong>R {{ offer.deviceCost.toFixed(2) }}</strong>
              </div>
              <div class="price-row">
                <span>Installation Cost:</span>
                <strong>R {{ offer.installationCost.toFixed(2) }}</strong>
              </div>
              <div class="price-row total">
                <span>Total Upfront Cost:</span>
                <strong>R {{ offer.totalUpfrontCost.toFixed(2) }}</strong>
              </div>
              <div class="price-row subscription">
                <span>Monthly Subscription:</span>
                <strong>R {{ offer.monthlySubscriptionFee.toFixed(2) }}/month</strong>
              </div>
            </div>

            <mat-divider class="section-divider"></mat-divider>

            <div class="additional-info">
              <div class="info-item">
                <mat-icon>verified_user</mat-icon>
                <div>
                  <strong>Warranty</strong>
                  <p>{{ offer.warrantyPeriod }}</p>
                </div>
              </div>
              <div class="info-item">
                <mat-icon>support_agent</mat-icon>
                <div>
                  <strong>Support</strong>
                  <p>{{ offer.supportDetails }}</p>
                </div>
              </div>
              <div class="info-item">
                <mat-icon>schedule</mat-icon>
                <div>
                  <strong>Available From</strong>
                  <p>{{ formatDate(offer.availableFrom) }}</p>
                </div>
              </div>
            </div>

            <div *ngIf="offer.additionalNotes" class="notes">
              <mat-icon>notes</mat-icon>
              <div>
                <strong>Additional Notes</strong>
                <p>{{ offer.additionalNotes }}</p>
              </div>
            </div>
          </mat-card-content>

          <mat-card-actions *ngIf="offer.status === 'Pending'">
            <button mat-raised-button color="primary" (click)="acceptOffer(offer.id)">
              <mat-icon>check_circle</mat-icon>
              Accept Offer
            </button>
            <button mat-button (click)="contactProvider(offer)">
              <mat-icon>phone</mat-icon>
              Contact Provider
            </button>
          </mat-card-actions>

          <mat-card-footer *ngIf="offer.status === 'Accepted'" class="accepted-footer">
            <mat-icon>check_circle</mat-icon>
            <span>You accepted this offer on {{ formatDate(offer.submittedAt) }}</span>
          </mat-card-footer>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .offers-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0;
      color: #1976d2;
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

    .empty-state h2 {
      margin: 1rem 0;
      color: #666;
    }

    .offers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(450px, 1fr));
      gap: 2rem;
    }

    @media (max-width: 768px) {
      .offers-grid {
        grid-template-columns: 1fr;
      }
    }

    .offer-card {
      border: 2px solid #e0e0e0;
      transition: all 0.3s;
    }

    .offer-card:hover {
      box-shadow: 0 8px 16px rgba(0,0,0,0.15);
      transform: translateY(-2px);
    }

    .offer-card.accepted {
      border-color: #4caf50;
      background: #f1f8f4;
    }

    mat-card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .provider-name {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #1976d2;
    }

    .provider-info {
      margin-bottom: 1rem;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0.5rem 0;
      font-size: 0.9rem;
      color: #555;
    }

    .info-row mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #1976d2;
    }

    .section-divider {
      margin: 1.5rem 0;
    }

    .device-details h3,
    .pricing h3,
    .additional-info h3 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1rem;
      margin: 0 0 1rem 0;
      color: #333;
    }

    .detail-item {
      display: flex;
      flex-direction: column;
      margin: 0.75rem 0;
      font-size: 0.9rem;
    }

    .detail-item strong {
      color: #666;
      margin-bottom: 0.25rem;
    }

    .pricing {
      background: #f5f5f5;
      padding: 1rem;
      border-radius: 8px;
    }

    .price-row {
      display: flex;
      justify-content: space-between;
      margin: 0.5rem 0;
      padding: 0.5rem 0;
    }

    .price-row.total {
      border-top: 2px solid #1976d2;
      border-bottom: 2px solid #1976d2;
      padding: 0.75rem 0;
      margin: 0.75rem 0;
    }

    .price-row.total strong {
      font-size: 1.25rem;
      color: #1976d2;
    }

    .price-row.subscription {
      background: #e3f2fd;
      padding: 0.75rem;
      border-radius: 4px;
      margin-top: 0.75rem;
    }

    .additional-info,
    .notes {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .info-item,
    .notes {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
    }

    .info-item mat-icon,
    .notes mat-icon {
      color: #1976d2;
      margin-top: 0.25rem;
    }

    .info-item strong,
    .notes strong {
      display: block;
      margin-bottom: 0.25rem;
      color: #333;
    }

    .info-item p,
    .notes p {
      margin: 0;
      font-size: 0.9rem;
      color: #666;
    }

    .notes {
      background: #fff3e0;
      padding: 1rem;
      border-radius: 4px;
      margin-top: 1rem;
    }

    mat-card-actions {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      border-top: 1px solid #e0e0e0;
    }

    .accepted-footer {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      background: #4caf50;
      color: white;
      font-weight: 500;
    }

    mat-chip {
      font-size: 0.75rem;
      min-height: 24px;
      padding: 0 8px;
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
  `]
})
export class TrackingDeviceOffersComponent implements OnInit {
  requestId: string = '';
  offers: TrackingDeviceOffer[] = [];
  loading = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private trackingService: TrackingDeviceService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.requestId = this.route.snapshot.params['requestId'];
    this.loadOffers();
  }

  loadOffers() {
    this.loading = true;
    this.trackingService.getOffersForRequest(this.requestId).subscribe({
      next: (offers) => {
        this.offers = offers;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading offers:', error);
        this.loading = false;
        this.snackBar.open('Failed to load offers', 'Close', { duration: 3000 });
      }
    });
  }

  acceptOffer(offerId: string) {
    if (confirm('Are you sure you want to accept this offer? Other pending offers will be rejected.')) {
      this.trackingService.acceptOffer(offerId).subscribe({
        next: () => {
          this.snackBar.open('Offer accepted successfully!', 'Close', { duration: 3000 });
          this.loadOffers();
        },
        error: (error) => {
          console.error('Error accepting offer:', error);
          this.snackBar.open('Failed to accept offer', 'Close', { duration: 3000 });
        }
      });
    }
  }

  contactProvider(offer: TrackingDeviceOffer) {
    window.open(`tel:${offer.serviceProviderPhone}`, '_self');
  }

  goBack() {
    this.router.navigate(['/owner-dashboard/tracking-device']);
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric'
    });
  }
}
