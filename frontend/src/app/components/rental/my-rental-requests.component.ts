import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { Router } from '@angular/router';
import { RentalMarketplaceService, RentalRequestDto, RentalOfferDto } from '../../services/rental-marketplace.service';

@Component({
  selector: 'app-my-rental-requests',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatChipsModule, MatIconModule, MatDialogModule, MatSnackBarModule],
  template: `
    <div class="requests-container">
      <div class="header">
        <div class="header-content">
          <div class="title-section">
            <mat-icon class="page-icon">assignment</mat-icon>
            <div>
              <h1>My Rental Requests</h1>
              <p class="subtitle">Manage your vehicle rental requests and view offers</p>
            </div>
          </div>
          <button mat-raised-button color="primary" (click)="createNew()">
            <mat-icon>add</mat-icon>
            New Request
          </button>
        </div>
      </div>

      <div class="requests-grid" *ngIf="requests.length > 0">
        <mat-card *ngFor="let request of requests" class="request-card">
          <div class="card-header">
            <div class="request-title">
              <mat-icon class="vehicle-icon">directions_car</mat-icon>
              <div>
                <h3>{{ request.vehicleType }}</h3>
                <span class="duration">{{ request.durationDays }} Days</span>
              </div>
            </div>
            <div class="status-section">
              <mat-chip [ngClass]="'status-' + request.status.toLowerCase()">
                {{ request.status }}
              </mat-chip>
            </div>
          </div>
          
          <mat-card-content>
            <div class="info-grid">
              <div class="info-item">
                <mat-icon>location_on</mat-icon>
                <div class="info-details">
                  <span class="label">Pickup</span>
                  <span class="value">{{ request.pickupLocation }}</span>
                </div>
              </div>
              
              <div class="info-item">
                <mat-icon>location_off</mat-icon>
                <div class="info-details">
                  <span class="label">Drop-off</span>
                  <span class="value">{{ request.dropoffLocation }}</span>
                </div>
              </div>
            </div>
            
            <div class="info-grid">
              <div class="info-item">
                <mat-icon>date_range</mat-icon>
                <div class="info-details">
                  <span class="label">Start Date</span>
                  <span class="value">{{ request.startDate | date:'mediumDate' }}</span>
                </div>
              </div>
              
              <div class="info-item">
                <mat-icon>event</mat-icon>
                <div class="info-details">
                  <span class="label">End Date</span>
                  <span class="value">{{ request.endDate | date:'mediumDate' }}</span>
                </div>
              </div>
            </div>
            
            <div class="info-grid" *ngIf="request.seatingCapacity || request.budgetMin || request.budgetMax">
              <div class="info-item" *ngIf="request.seatingCapacity">
                <mat-icon>airline_seat_recline_normal</mat-icon>
                <div class="info-details">
                  <span class="label">Seats</span>
                  <span class="value">{{ request.seatingCapacity }}+ passengers</span>
                </div>
              </div>
              
              <div class="info-item" *ngIf="request.budgetMin || request.budgetMax">
                <mat-icon>account_balance_wallet</mat-icon>
                <div class="info-details">
                  <span class="label">Budget Range</span>
                  <span class="value">R{{ request.budgetMin || 0 }} - R{{ request.budgetMax || '∞' }}</span>
                </div>
              </div>
            </div>

            <div class="offers-banner" [ngClass]="request.offerCount > 0 ? 'has-offers' : 'no-offers'">
              <mat-icon>{{ request.offerCount > 0 ? 'local_offer' : 'hourglass_empty' }}</mat-icon>
              <span>{{ request.offerCount }} {{ request.offerCount === 1 ? 'Offer' : 'Offers' }} Received</span>
            </div>

            <div class="meta-info">
              <mat-icon>schedule</mat-icon>
              <span>Posted {{ request.createdAt | date:'medium' }}</span>
            </div>
          </mat-card-content>
          
          <mat-card-actions>
            <button mat-raised-button color="primary" (click)="viewOffers(request)" 
                    [disabled]="request.offerCount === 0">
              <mat-icon>visibility</mat-icon>
              View Offers
            </button>
            <button mat-button>
              <mat-icon>edit</mat-icon>
              Edit
            </button>
          </mat-card-actions>
        </mat-card>
      </div>

      <div class="empty-state" *ngIf="requests.length === 0 && !isLoading">
        <div class="empty-icon">
          <mat-icon>inbox</mat-icon>
        </div>
        <h2>No Rental Requests Yet</h2>
        <p>Create your first rental request to start receiving competitive offers from vehicle owners</p>
        <button mat-raised-button color="primary" (click)="createNew()">
          <mat-icon>add</mat-icon>
          Create Your First Request
        </button>
      </div>

      <div class="loading" *ngIf="isLoading">
        <mat-icon class="spinner">hourglass_empty</mat-icon>
        <p>Loading your rental requests...</p>
      </div>
    </div>
  `,
  styles: [`
    .requests-container {
      padding: 1.5rem;
      max-width: 1400px;
      margin: 0 auto;
      background: #f8f9fa;
      min-height: 100vh;
    }

    .header {
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

    .title-section {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .page-icon {
      font-size: 2.5rem;
      width: 2.5rem;
      height: 2.5rem;
      color: #667eea;
    }

    .header h1 {
      margin: 0;
      font-size: 1.5rem;
      color: #2c3e50;
      font-weight: 600;
    }

    .subtitle {
      margin: 0.25rem 0 0;
      font-size: 0.875rem;
      color: #6c757d;
    }

    .requests-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 1.5rem;
    }

    .request-card {
      transition: all 0.3s ease;
      border-radius: 12px;
      overflow: hidden;
      border: 2px solid transparent;
    }

    .request-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
      border-color: #667eea;
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 1.25rem 1.25rem 0;
      background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
    }

    .request-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .vehicle-icon {
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
      color: #667eea;
    }

    .request-title h3 {
      margin: 0;
      font-size: 1.1rem;
      color: #2c3e50;
      font-weight: 600;
    }

    .duration {
      font-size: 0.875rem;
      color: #6c757d;
    }

    .status-section {
      display: flex;
      gap: 0.5rem;
    }

    mat-card-content {
      padding: 1.25rem !important;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .info-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem;
      background: #f8f9fa;
      border-radius: 8px;
    }

    .info-item mat-icon {
      color: #667eea;
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-top: 2px;
    }

    .info-details {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
      flex: 1;
    }

    .label {
      font-size: 0.75rem;
      color: #6c757d;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .value {
      font-size: 0.875rem;
      color: #2c3e50;
      font-weight: 500;
    }

    .offers-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem;
      border-radius: 8px;
      margin: 1rem 0;
      font-weight: 500;
    }

    .has-offers {
      background: #d4edda;
      color: #155724;
    }

    .has-offers mat-icon {
      color: #28a745;
    }

    .no-offers {
      background: #fff3cd;
      color: #856404;
    }

    .no-offers mat-icon {
      color: #ffc107;
    }

    .meta-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.8rem;
      color: #6c757d;
      margin-top: 0.75rem;
    }

    .meta-info mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    mat-card-actions {
      padding: 0 1.25rem 1.25rem !important;
      display: flex;
      gap: 0.5rem;
    }

    mat-card-actions button {
      flex: 1;
    }

    .status-open {
      background-color: #28a745;
      color: white;
    }

    .status-accepted {
      background-color: #007bff;
      color: white;
    }

    .status-closed {
      background-color: #6c757d;
      color: white;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }

    .empty-icon {
      width: 120px;
      height: 120px;
      margin: 0 auto 1.5rem;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .empty-icon mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: white;
    }

    .empty-state h2 {
      margin: 0 0 0.5rem;
      color: #2c3e50;
      font-size: 1.5rem;
    }

    .empty-state p {
      color: #6c757d;
      margin-bottom: 1.5rem;
      max-width: 500px;
      margin-left: auto;
      margin-right: auto;
    }

    .loading {
      text-align: center;
      padding: 4rem 2rem;
      background: white;
      border-radius: 12px;
    }

    .loading .spinner {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #667eea;
      animation: spin 2s linear infinite;
      margin-bottom: 1rem;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }

    .loading p {
      color: #6c757d;
      margin: 0;
    }

    @media (max-width: 768px) {
      .requests-container {
        padding: 1rem;
      }

      .header-content {
        flex-direction: column;
        gap: 1rem;
        align-items: stretch;
      }

      .title-section {
        flex-direction: column;
        text-align: center;
      }

      .requests-grid {
        grid-template-columns: 1fr;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }

      mat-card-actions {
        flex-direction: column;
      }
    }
  `]
})
export class MyRentalRequestsComponent implements OnInit {
  requests: RentalRequestDto[] = [];
  isLoading = false;

  constructor(
    private rentalService: RentalMarketplaceService,
    private snackBar: MatSnackBar,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadRequests();
  }

  loadRequests() {
    this.isLoading = true;
    this.rentalService.getMyRequests().subscribe({
      next: (data) => {
        this.requests = data;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading requests:', error);
        this.snackBar.open('Error loading rental requests', 'Close', { duration: 3000 });
        this.isLoading = false;
      }
    });
  }

  createNew() {
    this.router.navigate(['/rental/request']);
  }

  viewOffers(request: RentalRequestDto) {
    this.router.navigate(['/rental/requests', request.id, 'offers']);
  }
}
