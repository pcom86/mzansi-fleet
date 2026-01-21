import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTabsModule } from '@angular/material/tabs';
import { MatBadgeModule } from '@angular/material/badge';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { forkJoin } from 'rxjs';
import { RentalMarketplaceService, RentalRequestDto, RentalOfferDto, CreateRentalOfferDto } from '../../services/rental-marketplace.service';

@Component({
  selector: 'app-rental-marketplace',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatChipsModule, MatIconModule, 
            MatDialogModule, MatSnackBarModule, MatTabsModule, MatBadgeModule],
  template: `
    <div class="marketplace-container">
      <div class="header-section">
        <div class="header-content">
          <div class="title-row">
            <mat-icon class="header-icon">directions_car</mat-icon>
            <div class="title-text">
              <h1>Rentals</h1>
              <p class="subtitle">Browse requests and manage your offers</p>
            </div>
          </div>
        </div>
      </div>

      <mat-tab-group class="marketplace-tabs" [(selectedIndex)]="selectedTabIndex"
                     animationDuration="300ms">
        <!-- Browse Requests Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">search</mat-icon>
            Browse Requests
            <span class="badge" *ngIf="requests.length > 0">{{ requests.length }}</span>
          </ng-template>
          
          <div class="tab-content">
            <div class="loading-state" *ngIf="isLoadingRequests">
              <mat-icon>hourglass_empty</mat-icon>
              <p>Loading rental requests...</p>
            </div>

            <div class="requests-grid" *ngIf="requests.length > 0 && !isLoadingRequests">
              <mat-card *ngFor="let request of requests" class="request-card">
                <mat-card-header>
                  <div class="card-header-content">
                    <h3>{{ request.vehicleType }}</h3>
                    <mat-chip-set>
                      <mat-chip class="duration-chip">{{ request.durationDays }} Days</mat-chip>
                      <mat-chip *ngIf="request.hasMyOffer" class="my-offer-chip">
                        <mat-icon>check_circle</mat-icon> Offer Submitted
                      </mat-chip>
                    </mat-chip-set>
                  </div>
                </mat-card-header>
                <mat-card-content>
                  <div class="info-section">
                    <div class="info-row">
                      <mat-icon>person</mat-icon>
                      <span class="label">Requester:</span>
                      <span class="value">{{ request.userEmail }}</span>
                    </div>
                    <div class="info-row">
                      <mat-icon>location_on</mat-icon>
                      <span class="label">Pickup:</span>
                      <span class="value">{{ request.pickupLocation }}</span>
                    </div>
                    <div class="info-row">
                      <mat-icon>location_off</mat-icon>
                      <span class="label">Drop-off:</span>
                      <span class="value">{{ request.dropoffLocation }}</span>
                    </div>
                    <div class="info-row">
                      <mat-icon>date_range</mat-icon>
                      <span class="label">Dates:</span>
                      <span class="value">{{ request.startDate | date:'mediumDate' }} - {{ request.endDate | date:'mediumDate' }}</span>
                    </div>
                    <div class="info-row" *ngIf="request.seatingCapacity">
                      <mat-icon>airline_seat_recline_normal</mat-icon>
                      <span class="label">Seats:</span>
                      <span class="value">{{ request.seatingCapacity }}</span>
                    </div>
                    <div class="info-row" *ngIf="request.budgetMin || request.budgetMax">
                      <mat-icon>account_balance_wallet</mat-icon>
                      <span class="label">Budget:</span>
                      <span class="value">R{{ request.budgetMin || 0 }} - R{{ request.budgetMax || '∞' }}</span>
                    </div>
                    <div class="info-row" *ngIf="request.tripPurpose">
                      <mat-icon>info</mat-icon>
                      <span class="label">Purpose:</span>
                      <span class="value">{{ request.tripPurpose }}</span>
                    </div>
                    <div class="info-row offers-row">
                      <mat-icon>local_offer</mat-icon>
                      <span class="label">Offers:</span>
                      <span class="value offers-count">{{ request.offerCount }}</span>
                    </div>
                  </div>
                </mat-card-content>
                <mat-card-actions>
                  <button mat-raised-button color="primary" (click)="submitOffer(request)" 
                          [disabled]="request.hasMyOffer">
                    <mat-icon>{{ request.hasMyOffer ? 'check' : 'send' }}</mat-icon>
                    {{ request.hasMyOffer ? 'Offer Submitted' : 'Submit Offer' }}
                  </button>
                </mat-card-actions>
              </mat-card>
            </div>

            <div class="empty-state" *ngIf="requests.length === 0 && !isLoadingRequests">
              <mat-icon>search_off</mat-icon>
              <h2>No Active Rental Requests</h2>
              <p>Check back later for new rental opportunities</p>
            </div>
          </div>
        </mat-tab>

        <!-- My Offers Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon class="tab-icon">local_offer</mat-icon>
            My Offers
            <span class="badge" *ngIf="myOffers.length > 0">{{ myOffers.length }}</span>
          </ng-template>
          
          <div class="tab-content">
            <div class="loading-state" *ngIf="isLoadingOffers">
              <mat-icon>hourglass_empty</mat-icon>
              <p>Loading your offers...</p>
            </div>

            <div class="offers-grid" *ngIf="myOffers.length > 0 && !isLoadingOffers">
              <mat-card *ngFor="let offer of myOffers" class="offer-card">
                <mat-card-header>
                  <div class="card-header-content">
                    <div class="vehicle-info">
                      <h3>{{ offer.vehicleMake }} {{ offer.vehicleModel }}</h3>
                      <p class="registration">{{ offer.vehicleRegistration }}</p>
                    </div>
                    <mat-chip [ngClass]="getStatusClass(offer.status)">
                      <mat-icon>{{ getStatusIcon(offer.status) }}</mat-icon>
                      {{ offer.status }}
                    </mat-chip>
                  </div>
                </mat-card-header>
                
                <div class="vehicle-photo" *ngIf="offer.vehiclePhotoUrls && offer.vehiclePhotoUrls.length > 0">
                  <img [src]="getPhotoUrl(offer.vehiclePhotoUrls[0])" 
                       [alt]="offer.vehicleMake + ' ' + offer.vehicleModel"
                       onerror="this.src='assets/placeholder-car.jpg'">
                </div>
                
                <mat-card-content>
                  <div class="offer-details">
                    <h4>Offer Details</h4>
                    <div class="detail-grid">
                      <div class="detail-item">
                        <mat-icon>attach_money</mat-icon>
                        <div>
                          <span class="detail-label">Price Per Day</span>
                          <span class="detail-value">R{{ offer.pricePerDay }}</span>
                        </div>
                      </div>
                      <div class="detail-item" *ngIf="offer.includesDriver">
                        <mat-icon>person</mat-icon>
                        <div>
                          <span class="detail-label">Driver Fee</span>
                          <span class="detail-value">R{{ offer.driverFee || 0 }}/day</span>
                        </div>
                      </div>
                      <div class="detail-item">
                        <mat-icon>security</mat-icon>
                        <div>
                          <span class="detail-label">Security Deposit</span>
                          <span class="detail-value">R{{ offer.securityDeposit || 0 }}</span>
                        </div>
                      </div>
                      <div class="detail-item" *ngIf="offer.includesInsurance">
                        <mat-icon>verified_user</mat-icon>
                        <div>
                          <span class="detail-label">Insurance</span>
                          <span class="detail-value">Included</span>
                        </div>
                      </div>
                      <div class="detail-item total-amount">
                        <mat-icon>payments</mat-icon>
                        <div>
                          <span class="detail-label">Total Trip Amount</span>
                          <span class="detail-value highlight">R{{ calculateTotalAmount(offer).toLocaleString('en-ZA', {minimumFractionDigits: 2}) }}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div class="request-info">
                      <h4>Request Information</h4>
                      <div class="info-row">
                        <mat-icon>directions_car</mat-icon>
                        <span class="label">Vehicle Type:</span>
                        <span class="value">{{ offer.requestVehicleType }}</span>
                      </div>
                      <div class="info-row">
                        <mat-icon>location_on</mat-icon>
                        <span class="label">Route:</span>
                        <span class="value">{{ offer.requestPickupLocation }} → {{ offer.requestDropoffLocation }}</span>
                      </div>
                      <div class="info-row">
                        <mat-icon>date_range</mat-icon>
                        <span class="label">Duration:</span>
                        <span class="value">{{ offer.requestStartDate | date:'mediumDate' }} - {{ offer.requestEndDate | date:'mediumDate' }}</span>
                      </div>
                      <div class="info-row">
                        <mat-icon>schedule</mat-icon>
                        <span class="label">Submitted:</span>
                        <span class="value">{{ offer.submittedAt | date:'medium' }}</span>
                      </div>
                    </div>
                    
                    <div class="message-section" *ngIf="offer.offerMessage">
                      <h4>Your Message</h4>
                      <p class="offer-message">{{ offer.offerMessage }}</p>
                    </div>
                  </div>
                </mat-card-content>
                
                <mat-card-actions>
                  <button mat-button *ngIf="offer.status === 'Pending'">
                    <mat-icon>edit</mat-icon>
                    Edit Offer
                  </button>
                  <button mat-raised-button color="accent" 
                          *ngIf="offer.status === 'Accepted'" 
                          (click)="completeTrip(offer)"
                          [disabled]="isTripCompleted(offer.id)">
                    <mat-icon>{{ isTripCompleted(offer.id) ? 'task_alt' : 'check_circle' }}</mat-icon>
                    {{ isTripCompleted(offer.id) ? 'Trip Completed' : 'Complete Trip' }}
                  </button>
                </mat-card-actions>
              </mat-card>
            </div>

            <div class="empty-state" *ngIf="myOffers.length === 0 && !isLoadingOffers">
              <mat-icon>local_offer_outlined</mat-icon>
              <h2>No Offers Submitted</h2>
              <p>You haven't submitted any rental offers yet. Browse available rental requests and submit competitive offers.</p>
              <button mat-raised-button color="primary" (click)="selectedTabIndex = 0">
                <mat-icon>search</mat-icon>
                Browse Rental Requests
              </button>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .marketplace-container { 
      padding: 1.5rem; 
      max-width: 1400px; 
      margin: 0 auto; 
      background: #f8f9fa;
      min-height: 100vh;
    }
    
    .header-section {
      background: white;
      border-radius: 12px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .title-row {
      display: flex;
      align-items: center;
      gap: 1rem;
    }
    
    .header-icon {
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
      color: #667eea;
    }
    
    .title-text h1 {
      font-size: 1.5rem;
      margin: 0;
      color: #2c3e50;
      font-weight: 600;
    }
    
    .subtitle { 
      font-size: 0.875rem;
      margin: 0.25rem 0 0;
      color: #6c757d;
    }
    
    .marketplace-tabs {
      background: white;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    .tab-icon {
      margin-right: 0.5rem;
    }
    
    .badge {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px;
      padding: 0.2rem 0.6rem;
      margin-left: 0.5rem;
      font-size: 0.75rem;
      font-weight: bold;
    }
    
    .tab-content {
      padding: 2rem;
      min-height: 400px;
      background: #fafbfc;
    }
    
    .loading-state {
      text-align: center;
      padding: 4rem;
      color: #666;
    }
    
    .loading-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      animation: spin 2s linear infinite;
    }
    
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    
    .requests-grid { 
      display: grid; 
      grid-template-columns: repeat(auto-fill, minmax(380px, 1fr)); 
      gap: 1.5rem; 
    }
    
    .request-card {
      transition: all 0.3s ease;
      border: 2px solid transparent;
    }
    
    .request-card:hover { 
      transform: translateY(-4px); 
      box-shadow: 0 8px 20px rgba(0,0,0,0.2);
      border-color: #667eea;
    }
    
    .card-header-content {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .card-header-content h3 {
      margin: 0;
      color: #2c3e50;
      font-size: 1.3rem;
    }
    
    .duration-chip {
      background-color: #2196F3;
      color: white;
    }
    
    .my-offer-chip {
      background-color: #4caf50;
      color: white;
      display: flex;
      align-items: center;
      gap: 0.3rem;
    }
    
    .info-section {
      margin-top: 1rem;
    }
    
    .info-row { 
      display: flex; 
      align-items: center; 
      gap: 0.5rem; 
      margin: 0.75rem 0;
      padding: 0.5rem;
      background: #f8f9fa;
      border-radius: 4px;
    }
    
    .info-row mat-icon {
      color: #667eea;
      font-size: 20px;
    }
    
    .info-row .label {
      font-weight: 600;
      color: #666;
      min-width: 80px;
    }
    
    .info-row .value {
      color: #2c3e50;
      flex: 1;
    }
    
    .offers-row {
      background: #e8f5e9;
    }
    
    .offers-count {
      font-weight: 700;
      color: #4caf50;
      font-size: 1.1rem;
    }
    
    mat-card-actions {
      padding: 1rem;
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
    }
    
    mat-card-actions button {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    
    /* My Offers Tab Styles */
    .offers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 1.5rem;
    }
    
    .offer-card {
      transition: all 0.3s ease;
      border: 2px solid transparent;
    }
    
    .offer-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 20px rgba(0,0,0,0.2);
      border-color: #764ba2;
    }
    
    .vehicle-info {
      flex: 1;
    }
    
    .vehicle-info h3 {
      margin: 0;
      color: #2c3e50;
      font-size: 1.3rem;
    }
    
    .registration {
      margin: 0.3rem 0 0;
      color: #666;
      font-size: 0.9rem;
      font-weight: 500;
    }
    
    .vehicle-photo {
      width: 100%;
      height: 200px;
      overflow: hidden;
      background: #f5f5f5;
    }
    
    .vehicle-photo img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    
    .offer-details {
      padding: 1rem 0;
    }
    
    .offer-details h4 {
      margin: 1rem 0 0.5rem;
      color: #2c3e50;
      font-size: 1.1rem;
    }
    
    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin: 1rem 0;
    }
    
    .detail-item {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 8px;
    }
    
    .detail-item mat-icon {
      color: #667eea;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }
    
    .detail-label {
      display: block;
      font-size: 0.75rem;
      color: #666;
      font-weight: 500;
    }
    
    .detail-value {
      display: block;
      font-size: 1.1rem;
      color: #2c3e50;
      font-weight: 700;
    }
    
    .detail-value.highlight {
      color: #4caf50;
      font-size: 1.25rem;
      font-weight: 800;
    }
    
    .detail-item.total-amount {
      background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
      border: 2px solid #4caf50;
      margin-top: 0.5rem;
    }
    
    .detail-item.total-amount mat-icon {
      color: #4caf50;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }
    
    .request-info {
      background: #f0f4ff;
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem 0;
    }
    
    .message-section {
      margin-top: 1rem;
      padding: 1rem;
      background: #fff9e6;
      border-left: 4px solid #ffc107;
      border-radius: 4px;
    }
    
    .offer-message {
      margin: 0.5rem 0 0;
      color: #666;
      line-height: 1.6;
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
      padding: 4rem; 
      color: #666; 
    }
    
    .empty-state mat-icon { 
      font-size: 64px; 
      width: 64px; 
      height: 64px; 
      color: #ccc; 
    }
    
    .empty-state h2 {
      margin: 1rem 0 0.5rem;
      color: #2c3e50;
    }
    
    .empty-state p {
      color: #888;
      margin-bottom: 1.5rem;
    }
    
    @media (max-width: 768px) {
      .marketplace-container {
        padding: 1rem;
      }
      
      .header-section h1 {
        font-size: 1.8rem;
      }
      
      .requests-grid, .offers-grid {
        grid-template-columns: 1fr;
      }
      
      .detail-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class RentalMarketplaceComponent implements OnInit {
  requests: RentalRequestDto[] = [];
  myOffers: RentalOfferDto[] = [];
  isLoadingRequests = false;
  isLoadingOffers = false;
  selectedTabIndex = 0;
  completedTrips = new Set<string>();

  constructor(
    private rentalService: RentalMarketplaceService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadRequests();
    this.loadMyOffers();
  }

  loadRequests() {
    this.isLoadingRequests = true;
    this.rentalService.getMarketplaceRequests().subscribe({
      next: (data) => {
        this.requests = data;
        this.isLoadingRequests = false;
      },
      error: (error) => {
        this.snackBar.open('Error loading requests', 'Close', { duration: 3000 });
        this.isLoadingRequests = false;
      }
    });
  }

  loadMyOffers() {
    this.isLoadingOffers = true;
    this.rentalService.getMyOffers().subscribe({
      next: (data) => {
        this.myOffers = data;
        this.isLoadingOffers = false;
      },
      error: (error) => {
        console.error('Error loading offers:', error);
        this.snackBar.open('Error loading your offers', 'Close', { duration: 3000 });
        this.isLoadingOffers = false;
      }
    });
  }

  submitOffer(request: RentalRequestDto) {
    const dialogRef = this.dialog.open(SubmitOfferDialogComponent, {
      width: '600px',
      data: { request }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadRequests();
        this.loadMyOffers();
      }
    });
  }

  completeTrip(offer: any) {
    console.log('Complete trip for offer:', offer);
    const totalAmount = this.calculateTotalAmount(offer);
    const dialogRef = this.dialog.open(CompleteTripDialogComponent, {
      width: '600px',
      data: { offer, totalAmount }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Marking trip as completed:', offer.id);
        this.completedTrips.add(offer.id);
        console.log('Completed trips:', Array.from(this.completedTrips));
        this.snackBar.open('Trip completed successfully!', 'Close', { duration: 3000 });
        this.loadMyOffers();
      }
    });
  }

  getPhotoUrl(photo: string): string {
    // If photo already starts with data: or http, return as-is
    if (photo.startsWith('data:') || photo.startsWith('http://') || photo.startsWith('https://')) {
      return photo;
    }
    // Otherwise, assume it's a base64 string and prepend the data URL prefix
    return `data:image/jpeg;base64,${photo}`;
  }

  calculateTotalAmount(offer: any): number {
    const startDate = new Date(offer.requestStartDate);
    const endDate = new Date(offer.requestEndDate);
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const numberOfDays = daysDiff > 0 ? daysDiff : 1;
    
    const pricePerDay = offer.pricePerDay || 0;
    const driverFee = offer.includesDriver ? (offer.driverFee || 0) : 0;
    
    return (pricePerDay + driverFee) * numberOfDays;
  }

  isTripCompleted(offerId: string): boolean {
    console.log('Checking if trip completed:', offerId, 'Result:', this.completedTrips.has(offerId));
    return this.completedTrips.has(offerId);
  }

  getStatusClass(status: string): string {
    return `status-${status.toLowerCase()}`;
  }

  getStatusIcon(status: string): string {
    switch (status.toLowerCase()) {
      case 'pending': return 'schedule';
      case 'accepted': return 'check_circle';
      case 'rejected': return 'cancel';
      default: return 'help';
    }
  }
}

@Component({
  selector: 'complete-trip-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, 
            MatButtonModule, MatSnackBarModule, HttpClientModule, MatIconModule],
  template: `
    <h2 mat-dialog-title>Complete Trip</h2>
    <mat-dialog-content>
      <div class="trip-summary">
        <h3>Trip Summary</h3>
        <div class="summary-item">
          <span class="label">Vehicle:</span>
          <span class="value">{{ data.offer.vehicleMake }} {{ data.offer.vehicleModel }}</span>
        </div>
        <div class="summary-item">
          <span class="label">Total Amount:</span>
          <span class="value total">R{{ data.totalAmount.toLocaleString('en-ZA', {minimumFractionDigits: 2}) }}</span>
        </div>
      </div>

      <form [formGroup]="costsForm" class="costs-form">
        <h3>Trip Costs</h3>
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Fuel Cost (R)</mat-label>
          <input matInput type="number" formControlName="fuelCost" min="0" step="0.01">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Maintenance Cost (R)</mat-label>
          <input matInput type="number" formControlName="maintenanceCost" min="0" step="0.01">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Toll Fees (R)</mat-label>
          <input matInput type="number" formControlName="tollFees" min="0" step="0.01">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Other Costs (R)</mat-label>
          <input matInput type="number" formControlName="otherCosts" min="0" step="0.01">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Cost Description</mat-label>
          <textarea matInput formControlName="costDescription" rows="3" placeholder="Describe other costs..."></textarea>
        </mat-form-field>

        <div class="earnings-summary">
          <div class="summary-row">
            <span>Trip Earnings (Gross):</span>
            <span class="earnings">R{{ data.totalAmount.toLocaleString('en-ZA', {minimumFractionDigits: 2}) }}</span>
          </div>
          <div class="summary-row">
            <span>Trip Expenses:</span>
            <span class="cost">R{{ getTotalCosts().toLocaleString('en-ZA', {minimumFractionDigits: 2}) }}</span>
          </div>
          <div class="summary-row total-earnings">
            <span>Net Profit:</span>
            <span class="earnings">R{{ getNetEarnings().toLocaleString('en-ZA', {minimumFractionDigits: 2}) }}</span>
          </div>
          <div class="info-note">
            <mat-icon>info</mat-icon>
            <span>Earnings and expenses will be recorded separately</span>
          </div>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onSubmit()" [disabled]="loading">
        {{ loading ? 'Processing...' : 'Complete Trip' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .trip-summary {
      background: #f0f4ff;
      padding: 1rem;
      border-radius: 8px;
      margin-bottom: 1.5rem;
    }

    .trip-summary h3 {
      margin: 0 0 1rem 0;
      color: #2c3e50;
      font-size: 1.1rem;
    }

    .summary-item {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #e0e0e0;
    }

    .summary-item:last-child {
      border-bottom: none;
    }

    .summary-item .label {
      font-weight: 500;
      color: #666;
    }

    .summary-item .value {
      color: #2c3e50;
      font-weight: 600;
    }

    .summary-item .value.total {
      color: #4caf50;
      font-size: 1.2rem;
    }

    .costs-form h3 {
      margin: 1rem 0;
      color: #2c3e50;
      font-size: 1.1rem;
    }

    .full-width {
      width: 100%;
      margin-bottom: 1rem;
    }

    .earnings-summary {
      background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
      padding: 1rem;
      border-radius: 8px;
      margin-top: 1.5rem;
      border: 2px solid #4caf50;
    }

    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      font-size: 1rem;
    }

    .summary-row.total-earnings {
      border-top: 2px solid #4caf50;
      margin-top: 0.5rem;
      padding-top: 1rem;
      font-size: 1.1rem;
      font-weight: 700;
    }

    .summary-row .cost {
      color: #f44336;
    }

    .summary-row .earnings {
      color: #2e7d32;
      font-size: 1.3rem;
      font-weight: 800;
    }

    .info-note {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-top: 1rem;
      padding: 0.75rem;
      background: rgba(255, 255, 255, 0.7);
      border-radius: 4px;
      font-size: 0.9rem;
      color: #2e7d32;
    }

    .info-note mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #2e7d32;
    }
  `]
})
export class CompleteTripDialogComponent implements OnInit {
  costsForm!: FormGroup;
  loading = false;

  constructor(
    private dialogRef: MatDialogRef<CompleteTripDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any,
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.costsForm = this.fb.group({
      fuelCost: [0],
      maintenanceCost: [0],
      tollFees: [0],
      otherCosts: [0],
      costDescription: ['']
    });
  }

  getTotalCosts(): number {
    const values = this.costsForm.value;
    return (values.fuelCost || 0) + 
           (values.maintenanceCost || 0) + 
           (values.tollFees || 0) + 
           (values.otherCosts || 0);
  }

  getNetEarnings(): number {
    return this.data.totalAmount - this.getTotalCosts();
  }

  onSubmit() {
    this.loading = true;
    const costs = this.costsForm.value;
    const totalCosts = this.getTotalCosts();
    const currentDate = new Date().toISOString();

    // 1. Create trip record for TripDetails table
    // RouteId and DriverId are now nullable for rental trips
    const tripData = {
      vehicleId: this.data.offer.vehicleId,
      routeId: null,
      driverId: null,
      tripDate: this.data.offer.requestStartDate,
      departureTime: '00:00',
      arrivalTime: '23:59',
      passengers: [],
      passengerCount: 0,
      totalFare: this.data.totalAmount,
      status: 'Completed',
      notes: `Rental: ${this.data.offer.requestPickupLocation} to ${this.data.offer.requestDropoffLocation} | ${this.data.offer.vehicleMake} ${this.data.offer.vehicleModel} | Dates: ${this.data.offer.requestStartDate} - ${this.data.offer.requestEndDate}`
    };

    // Save full trip amount as earnings (gross amount)
    const earningsData = {
      vehicleId: this.data.offer.vehicleId,
      amount: this.data.totalAmount,
      date: currentDate,
      description: `Rental Trip Earnings - ${this.data.offer.vehicleMake} ${this.data.offer.vehicleModel}`
    };

    // Prepare expenses array
    const expenses: any[] = [];
    
    if (costs.fuelCost > 0) {
      expenses.push({
        vehicleId: this.data.offer.vehicleId,
        amount: costs.fuelCost,
        category: 'Fuel',
        description: 'Rental trip fuel cost',
        date: currentDate,
        vendor: ''
      });
    }
    
    if (costs.maintenanceCost > 0) {
      expenses.push({
        vehicleId: this.data.offer.vehicleId,
        amount: costs.maintenanceCost,
        category: 'Maintenance',
        description: 'Rental trip maintenance cost',
        date: currentDate,
        vendor: ''
      });
    }
    
    if (costs.tollFees > 0) {
      expenses.push({
        vehicleId: this.data.offer.vehicleId,
        amount: costs.tollFees,
        category: 'Toll Fees',
        description: 'Rental trip toll fees',
        date: currentDate,
        vendor: ''
      });
    }
    
    if (costs.otherCosts > 0) {
      expenses.push({
        vehicleId: this.data.offer.vehicleId,
        amount: costs.otherCosts,
        category: 'Other',
        description: costs.costDescription || 'Rental trip other costs',
        date: currentDate,
        vendor: ''
      });
    }

    // Post trip first, then earnings, then expenses
    this.http.post('http://localhost:5000/api/TripDetails', tripData).subscribe({
      next: () => {
        // Post earnings
        this.http.post('http://localhost:5000/api/VehicleEarnings', earningsData).subscribe({
          next: () => {
            // If there are expenses, post them
            if (expenses.length > 0) {
              const expenseRequests = expenses.map(expense => 
                this.http.post('http://localhost:5000/api/VehicleExpenses', expense)
              );
              
              forkJoin(expenseRequests).subscribe({
                next: () => {
                  this.loading = false;
                  this.dialogRef.close(true);
                },
                error: (error) => {
                  console.error('Error recording expenses:', error);
                  this.snackBar.open('Trip and earnings saved, but error recording expenses', 'Close', { duration: 3000 });
                  this.loading = false;
                  this.dialogRef.close(true);
                }
              });
            } else {
              this.loading = false;
              this.dialogRef.close(true);
            }
          },
          error: (error) => {
            console.error('Error recording earnings:', error);
            this.snackBar.open('Trip saved, but error recording earnings', 'Close', { duration: 3000 });
            this.loading = false;
          }
        });
      },
      error: (error) => {
        console.error('Error creating trip:', error);
        this.snackBar.open('Error creating trip record', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  onCancel() {
    this.dialogRef.close();
  }
}

@Component({
  selector: 'submit-offer-dialog',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, MatDialogModule, MatFormFieldModule, MatInputModule, 
            MatSelectModule, MatButtonModule, MatCheckboxModule, MatSnackBarModule],
  template: `
    <h2 mat-dialog-title>Submit Offer</h2>
    <mat-dialog-content>
      <form [formGroup]="offerForm">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Select Vehicle</mat-label>
          <mat-select formControlName="vehicleId">
            <mat-option *ngFor="let vehicle of vehicles" [value]="vehicle.id">
              {{ vehicle.registration }} - {{ vehicle.make }} {{ vehicle.model }}
            </mat-option>
          </mat-select>
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Price Per Day (R)</mat-label>
          <input matInput type="number" formControlName="pricePerDay" min="0">
        </mat-form-field>
        
        <mat-checkbox formControlName="includesDriver">Include Driver</mat-checkbox>
        <mat-form-field appearance="outline" class="full-width" *ngIf="offerForm.get('includesDriver')?.value">
          <mat-label>Driver Fee Per Day (R)</mat-label>
          <input matInput type="number" formControlName="driverFee">
        </mat-form-field>
        
        <mat-checkbox formControlName="includesInsurance">Include Insurance</mat-checkbox>
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Security Deposit (R)</mat-label>
          <input matInput type="number" formControlName="securityDeposit">
        </mat-form-field>
        
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Message</mat-label>
          <textarea matInput formControlName="offerMessage" rows="3"></textarea>
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="cancel()">Cancel</button>
      <button mat-raised-button color="primary" (click)="submit()" [disabled]="!offerForm.valid">Submit Offer</button>
    </mat-dialog-actions>
  `,
  styles: [`.full-width { width: 100%; margin-bottom: 1rem; }`]
})
export class SubmitOfferDialogComponent implements OnInit {
  offerForm!: FormGroup;
  vehicles: any[] = [];

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private rentalService: RentalMarketplaceService,
    private dialogRef: MatDialogRef<SubmitOfferDialogComponent>,
    private snackBar: MatSnackBar,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  ngOnInit() {
    this.offerForm = this.fb.group({
      vehicleId: ['', Validators.required],
      pricePerDay: [null, [Validators.required, Validators.min(1)]],
      includesDriver: [false],
      driverFee: [null],
      includesInsurance: [false],
      securityDeposit: [null],
      offerMessage: ['', Validators.required],
      termsAndConditions: ['']
    });

    this.http.get<any[]>('http://localhost:5000/api/Vehicles').subscribe(data => {
      this.vehicles = data;
    });
  }

  submit() {
    if (this.offerForm.valid) {
      const offer: CreateRentalOfferDto = {
        rentalRequestId: this.data.request.id,
        ...this.offerForm.value
      };

      this.rentalService.submitOffer(offer).subscribe({
        next: () => {
          this.snackBar.open('Offer submitted successfully!', 'Close', { duration: 3000 });
          this.dialogRef.close(true);
        },
        error: (error) => {
          this.snackBar.open(error.error?.message || 'Error submitting offer', 'Close', { duration: 3000 });
        }
      });
    }
  }

  cancel() {
    this.dialogRef.close();
  }
}
