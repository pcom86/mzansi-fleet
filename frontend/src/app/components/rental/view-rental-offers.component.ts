import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RentalMarketplaceService, RentalOfferDto } from '../../services/rental-marketplace.service';

@Component({
  selector: 'app-view-rental-offers',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatChipsModule, MatIconModule, MatSnackBarModule],
  template: `
    <div class="offers-container">
      <div class="header">
        <button mat-icon-button (click)="goBack()">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <h1>Offers Received</h1>
      </div>

      <div class="offers-list" *ngIf="offers.length > 0">
        <mat-card *ngFor="let offer of offers" class="offer-card">
          <mat-card-content>
            <div class="offer-header">
              <div class="owner-info">
                <div class="owner-badge">
                  <mat-icon>business</mat-icon>
                </div>
                <div class="owner-details">
                  <h3>{{ offer.ownerCompanyName }}</h3>
                  <div class="contact-info">
                    <div class="contact-item">
                      <mat-icon>person</mat-icon>
                      <span>{{ offer.ownerContactName }}</span>
                    </div>
                    <div class="contact-item">
                      <mat-icon>phone</mat-icon>
                      <span>{{ offer.ownerPhone }}</span>
                    </div>
                    <div class="contact-item">
                      <mat-icon>email</mat-icon>
                      <span>{{ offer.ownerEmail }}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div class="price-info">
                <div class="total-price">R{{ offer.totalPrice }}</div>
                <div class="per-day">R{{ offer.pricePerDay }}/day</div>
              </div>
            </div>

            <div class="vehicle-info" *ngIf="offer.vehicle">
              <img *ngIf="offer.vehicle.photos?.length" [src]="offer.vehicle.photos[0]" [alt]="offer.vehicle.registration">
              <div class="vehicle-placeholder" *ngIf="!offer.vehicle.photos?.length">
                <mat-icon>directions_car</mat-icon>
              </div>
              <div class="vehicle-details">
                <h4>{{ offer.vehicle.make }} {{ offer.vehicle.model }} ({{ offer.vehicle.year }})</h4>
                <p>{{ offer.vehicle.registration }} | {{ offer.vehicle.type }}</p>
                <p>{{ offer.vehicle.capacity }} seats</p>
              </div>
            </div>

            <div class="offer-details">
              <p><strong>Message:</strong> {{ offer.offerMessage }}</p>
              <div class="extras">
                <mat-chip *ngIf="offer.includesDriver" class="extra-chip">
                  <mat-icon>person</mat-icon>
                  Driver Included (+R{{ offer.driverFee }}/day)
                </mat-chip>
                <mat-chip *ngIf="offer.includesInsurance" class="extra-chip">
                  <mat-icon>verified_user</mat-icon>
                  Insurance Included
                </mat-chip>
                <mat-chip *ngIf="offer.securityDeposit" class="extra-chip">
                  <mat-icon>lock</mat-icon>
                  Deposit: R{{ offer.securityDeposit }}
                </mat-chip>
              </div>
              <p *ngIf="offer.termsAndConditions" class="terms"><small>{{ offer.termsAndConditions }}</small></p>
            </div>

            <mat-chip-set>
              <mat-chip [ngClass]="'status-' + offer.status.toLowerCase()">{{ offer.status }}</mat-chip>
            </mat-chip-set>
          </mat-card-content>

          <mat-card-actions>
            <button mat-raised-button color="primary" (click)="acceptOffer(offer)" 
                    [disabled]="offer.status !== 'Pending' || isProcessing">
              <mat-icon>check_circle</mat-icon>
              Accept Offer
            </button>
            <button mat-raised-button color="warn" (click)="rejectOffer(offer)" 
                    [disabled]="offer.status !== 'Pending' || isProcessing">
              <mat-icon>cancel</mat-icon>
              Reject Offer
            </button>
          </mat-card-actions>
        </mat-card>
      </div>

      <div class="empty-state" *ngIf="offers.length === 0 && !isLoading">
        <mat-icon>inbox</mat-icon>
        <h2>No Offers Yet</h2>
        <p>Vehicle owners will submit their offers soon</p>
      </div>

      <div class="loading" *ngIf="isLoading">
        <p>Loading offers...</p>
      </div>
    </div>
  `,
  styles: [`
    .offers-container {
      padding: 2rem;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .header h1 {
      margin: 0;
    }

    .offers-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .offer-card {
      border-left: 4px solid #2196f3;
    }

    .offer-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1.5rem;
      padding-bottom: 1.5rem;
      border-bottom: 2px solid #e0e0e0;
    }

    .owner-info {
      display: flex;
      gap: 1rem;
      flex: 1;
    }

    .owner-badge {
      width: 60px;
      height: 60px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .owner-badge mat-icon {
      color: white;
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .owner-details {
      flex: 1;
    }

    .owner-info h3 {
      margin: 0 0 0.75rem 0;
      color: #2c3e50;
      font-size: 1.3rem;
    }

    .contact-info {
      display: flex;
      flex-direction: column;
      gap: 0.4rem;
    }

    .contact-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #666;
      font-size: 0.9rem;
    }

    .contact-item mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #2196f3;
    }

    .price-info {
      text-align: right;
    }

    .total-price {
      font-size: 2rem;
      font-weight: bold;
      color: #4caf50;
    }

    .per-day {
      color: #666;
      font-size: 0.9rem;
    }

    .vehicle-info {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 8px;
      margin-bottom: 1rem;
    }

    .vehicle-info img {
      width: 120px;
      height: 90px;
      object-fit: cover;
      border-radius: 4px;
    }

    .vehicle-placeholder {
      width: 120px;
      height: 90px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #e0e0e0;
      border-radius: 4px;
    }

    .vehicle-placeholder mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #999;
    }

    .vehicle-details h4 {
      margin: 0 0 0.5rem 0;
    }

    .vehicle-details p {
      margin: 0.25rem 0;
      color: #666;
      font-size: 0.9rem;
    }

    .offer-details {
      margin: 1rem 0;
    }

    .extras {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
      margin: 1rem 0;
    }

    .extra-chip {
      background-color: #e3f2fd;
      color: #1976d2;
    }

    .extra-chip mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .terms {
      color: #666;
      font-style: italic;
      margin-top: 1rem;
    }

    .status-pending {
      background-color: #ff9800;
      color: white;
    }

    .status-accepted {
      background-color: #4caf50;
      color: white;
    }

    .status-rejected {
      background-color: #f44336;
      color: white;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: #666;
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #ccc;
    }

    .loading {
      text-align: center;
      padding: 3rem;
    }
  `]
})
export class ViewRentalOffersComponent implements OnInit {
  offers: RentalOfferDto[] = [];
  requestId!: string;
  isLoading = false;
  isProcessing = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private rentalService: RentalMarketplaceService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.requestId = this.route.snapshot.paramMap.get('id')!;
    this.loadOffers();
  }

  loadOffers() {
    this.isLoading = true;
    this.rentalService.getOffersForRequest(this.requestId).subscribe({
      next: (data) => {
        this.offers = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading offers:', error);
        this.snackBar.open('Error loading offers', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  acceptOffer(offer: RentalOfferDto) {
    if (confirm(`Accept offer from ${offer.ownerCompanyName} for R${offer.totalPrice}?`)) {
      this.isProcessing = true;
      this.rentalService.acceptOffer({
        rentalRequestId: this.requestId,
        offerId: offer.id
      }).subscribe({
        next: (booking) => {
          this.snackBar.open('Offer accepted! Booking confirmed.', 'Close', { duration: 5000 });
          this.router.navigate(['/rental/bookings']);
        },
        error: (error) => {
          console.error('Error accepting offer:', error);
          this.snackBar.open('Error accepting offer. Please try again.', 'Close', { duration: 3000 });
          this.isProcessing = false;
        }
      });
    }
  }

  rejectOffer(offer: RentalOfferDto) {
    if (confirm(`Reject offer from ${offer.ownerCompanyName}? This action cannot be undone.`)) {
      this.isProcessing = true;
      this.rentalService.rejectOffer({
        rentalRequestId: this.requestId,
        offerId: offer.id
      }).subscribe({
        next: () => {
          this.snackBar.open('Offer rejected successfully.', 'Close', { duration: 3000 });
          this.loadOffers(); // Reload to show updated status
          this.isProcessing = false;
        },
        error: (error) => {
          console.error('Error rejecting offer:', error);
          this.snackBar.open('Error rejecting offer. Please try again.', 'Close', { duration: 3000 });
          this.isProcessing = false;
        }
      });
    }
  }

  goBack() {
    this.router.navigate(['/rental/my-requests']);
  }
}
