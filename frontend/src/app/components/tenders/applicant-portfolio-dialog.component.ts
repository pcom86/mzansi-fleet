import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';

interface Vehicle {
  id: string;
  registrationNumber: string;
  make: string;
  model: string;
  year: number;
  vehicleType: string;
  capacity: number;
  status: string;
  mileage?: number;
  photos: string[];
}

interface FleetSummary {
  ownerId: string;
  companyName: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  address?: string;
  totalVehicles: number;
  activeVehicles: number;
  vehicles: Vehicle[];
  totalRevenue: number;
  completedJobs: number;
  averageRating?: number;
}

interface TenderApplication {
  ownerCompanyName: string;
  ownerContactName: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  applicationMessage: string;
  proposedBudget: number;
  proposalDetails: string;
  availableVehicles: number;
  vehicleTypes: string;
  experienceHighlights: string;
  fleetSummary?: FleetSummary;
}

@Component({
  selector: 'app-applicant-portfolio-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDividerModule,
    MatTabsModule,
    MatCardModule
  ],
  template: `
    <div class="portfolio-dialog">
      <div class="dialog-header">
        <div class="header-content">
          <mat-icon class="header-icon">business_center</mat-icon>
          <div>
            <h2>{{ application.ownerCompanyName }}</h2>
            <p class="subtitle">Fleet Owner Portfolio</p>
          </div>
        </div>
        <button mat-icon-button (click)="close()" class="close-button">
          <mat-icon>close</mat-icon>
        </button>
      </div>

      <mat-dialog-content>
        <mat-tab-group>
          <!-- Company Overview Tab -->
          <mat-tab label="Company Overview">
            <div class="tab-content">
              <!-- Company Details Card -->
              <mat-card class="info-card">
                <mat-card-header>
                  <mat-icon mat-card-avatar>business</mat-icon>
                  <mat-card-title>Company Information</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="info-grid">
                    <div class="info-row">
                      <mat-icon>account_circle</mat-icon>
                      <div>
                        <label>Contact Person</label>
                        <span>{{ application.contactPerson }}</span>
                      </div>
                    </div>
                    <div class="info-row">
                      <mat-icon>phone</mat-icon>
                      <div>
                        <label>Phone</label>
                        <span>{{ application.contactPhone }}</span>
                      </div>
                    </div>
                    <div class="info-row">
                      <mat-icon>email</mat-icon>
                      <div>
                        <label>Email</label>
                        <span>{{ application.contactEmail }}</span>
                      </div>
                    </div>
                    <div class="info-row" *ngIf="application.fleetSummary?.address">
                      <mat-icon>location_on</mat-icon>
                      <div>
                        <label>Address</label>
                        <span>{{ application.fleetSummary!.address }}</span>
                      </div>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>

              <!-- Key Metrics -->
              <div class="metrics-grid" *ngIf="application.fleetSummary">
                <mat-card class="metric-card">
                  <mat-icon>directions_car</mat-icon>
                  <div class="metric-value">{{ application.fleetSummary.totalVehicles }}</div>
                  <div class="metric-label">Total Vehicles</div>
                </mat-card>
                <mat-card class="metric-card active">
                  <mat-icon>check_circle</mat-icon>
                  <div class="metric-value">{{ application.fleetSummary.activeVehicles }}</div>
                  <div class="metric-label">Active Vehicles</div>
                </mat-card>
                <mat-card class="metric-card">
                  <mat-icon>monetization_on</mat-icon>
                  <div class="metric-value">R{{ application.fleetSummary.totalRevenue | number:'1.0-0' }}</div>
                  <div class="metric-label">Total Revenue</div>
                </mat-card>
                <mat-card class="metric-card">
                  <mat-icon>task_alt</mat-icon>
                  <div class="metric-value">{{ application.fleetSummary.completedJobs }}</div>
                  <div class="metric-label">Completed Jobs</div>
                </mat-card>
                <mat-card class="metric-card rating" *ngIf="application.fleetSummary.averageRating">
                  <mat-icon>star</mat-icon>
                  <div class="metric-value">{{ application.fleetSummary.averageRating | number:'1.1-1' }}</div>
                  <div class="metric-label">Average Rating</div>
                </mat-card>
              </div>

              <!-- Experience Highlights -->
              <mat-card class="info-card" *ngIf="application.experienceHighlights">
                <mat-card-header>
                  <mat-icon mat-card-avatar>work_history</mat-icon>
                  <mat-card-title>Experience Highlights</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <p class="experience-text">{{ application.experienceHighlights }}</p>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

          <!-- Fleet Details Tab -->
          <mat-tab label="Fleet Details">
            <div class="tab-content">
              <div class="fleet-capacity-card" *ngIf="application.fleetSummary">
                <h3>Available Fleet Capacity</h3>
                <div class="capacity-info">
                  <div class="capacity-item">
                    <mat-icon>local_shipping</mat-icon>
                    <div>
                      <strong>{{ application.availableVehicles }}</strong>
                      <span>Vehicles Available for Tender</span>
                    </div>
                  </div>
                  <div class="capacity-item">
                    <mat-icon>category</mat-icon>
                    <div>
                      <strong>{{ application.vehicleTypes }}</strong>
                      <span>Vehicle Types</span>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Vehicle Grid -->
              <div class="vehicles-section" *ngIf="application.fleetSummary?.vehicles?.length">
                <h3>Fleet Vehicles ({{ application.fleetSummary!.vehicles.length }})</h3>
                <div class="vehicles-grid">
                  <mat-card *ngFor="let vehicle of application.fleetSummary!.vehicles" class="vehicle-card">
                    <div class="vehicle-image-container">
                      <img *ngIf="vehicle.photos?.length" 
                           [src]="vehicle.photos[0]" 
                           [alt]="vehicle.registrationNumber"
                           class="vehicle-image">
                      <div *ngIf="!vehicle.photos?.length" class="vehicle-image-placeholder">
                        <mat-icon>directions_car</mat-icon>
                      </div>
                      <mat-chip class="status-chip" [ngClass]="{'active': vehicle.status === 'Active'}">
                        {{ vehicle.status }}
                      </mat-chip>
                    </div>
                    <mat-card-content>
                      <h4>{{ vehicle.registrationNumber }}</h4>
                      <p class="vehicle-name">{{ vehicle.make }} {{ vehicle.model }}</p>
                      <div class="vehicle-specs">
                        <div class="spec-item">
                          <mat-icon>calendar_today</mat-icon>
                          <span>{{ vehicle.year }}</span>
                        </div>
                        <div class="spec-item">
                          <mat-icon>airline_seat_recline_normal</mat-icon>
                          <span>{{ vehicle.capacity }} seats</span>
                        </div>
                        <div class="spec-item" *ngIf="vehicle.mileage">
                          <mat-icon>speed</mat-icon>
                          <span>{{ vehicle.mileage | number }} km</span>
                        </div>
                      </div>
                      <mat-chip class="type-chip">{{ vehicle.vehicleType }}</mat-chip>
                    </mat-card-content>
                  </mat-card>
                </div>
              </div>

              <div class="no-vehicles" *ngIf="!application.fleetSummary?.vehicles?.length">
                <mat-icon>info</mat-icon>
                <p>No detailed vehicle information available</p>
                <p class="debug-info" style="font-size: 12px; color: #999;">
                  Debug: FleetSummary={{ !!application.fleetSummary }}, 
                  Vehicles={{ application.fleetSummary?.vehicles ? 'exists' : 'null' }}, 
                  Count={{ application.fleetSummary?.vehicles?.length || 0 }}
                </p>
              </div>
            </div>
          </mat-tab>

          <!-- Proposal Tab -->
          <mat-tab label="Tender Proposal">
            <div class="tab-content">
              <!-- Proposed Budget -->
              <mat-card class="info-card budget-card">
                <mat-card-header>
                  <mat-icon mat-card-avatar>attach_money</mat-icon>
                  <mat-card-title>Proposed Budget</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="budget-amount">
                    R{{ application.proposedBudget | number:'1.2-2' }}
                  </div>
                </mat-card-content>
              </mat-card>

              <!-- Application Message -->
              <mat-card class="info-card">
                <mat-card-header>
                  <mat-icon mat-card-avatar>message</mat-icon>
                  <mat-card-title>Cover Letter</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <p class="message-text">{{ application.applicationMessage }}</p>
                </mat-card-content>
              </mat-card>

              <!-- Proposal Details -->
              <mat-card class="info-card">
                <mat-card-header>
                  <mat-icon mat-card-avatar>description</mat-icon>
                  <mat-card-title>Detailed Proposal</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <p class="proposal-text">{{ application.proposalDetails }}</p>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>
        </mat-tab-group>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button mat-button (click)="close()">Close</button>
        <button mat-raised-button color="primary" (click)="contactApplicant()">
          <mat-icon>email</mat-icon>
          Contact Applicant
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .portfolio-dialog {
      width: 900px;
      max-width: 95vw;
      max-height: 90vh;
      display: flex;
      flex-direction: column;
    }

    .dialog-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      padding: 24px 24px 0;
      border-bottom: 1px solid #e0e0e0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .header-content {
      display: flex;
      gap: 16px;
      align-items: flex-start;
    }

    .header-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #FFD700;
    }

    .dialog-header h2 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }

    .subtitle {
      margin: 4px 0 16px;
      opacity: 0.9;
      font-size: 14px;
    }

    .close-button {
      color: white;
    }

    mat-dialog-content {
      flex: 1;
      overflow: hidden;
      padding: 0 !important;
    }

    .tab-content {
      padding: 24px;
      overflow-y: auto;
      max-height: calc(90vh - 240px);
    }

    .info-card {
      margin-bottom: 16px;
    }

    .info-grid {
      display: grid;
      gap: 16px;
    }

    .info-row {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      padding: 12px;
      background: #f9fafb;
      border-radius: 8px;
    }

    .info-row mat-icon {
      color: #667eea;
      flex-shrink: 0;
    }

    .info-row > div {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .info-row label {
      font-size: 12px;
      color: #64748b;
      font-weight: 500;
      text-transform: uppercase;
    }

    .info-row span {
      font-size: 14px;
      color: #1e293b;
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 16px;
    }

    .metric-card {
      text-align: center;
      padding: 20px !important;
      border: 2px solid #e5e7eb;
      transition: all 0.3s ease;
    }

    .metric-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
      border-color: #667eea;
    }

    .metric-card.active {
      background: linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%);
    }

    .metric-card.rating {
      background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
    }

    .metric-card mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: #667eea;
      margin-bottom: 8px;
    }

    .metric-value {
      font-size: 28px;
      font-weight: 700;
      color: #1e293b;
      margin-bottom: 4px;
    }

    .metric-label {
      font-size: 12px;
      color: #64748b;
      text-transform: uppercase;
      font-weight: 500;
    }

    .experience-text,
    .message-text,
    .proposal-text {
      line-height: 1.7;
      color: #475569;
      white-space: pre-wrap;
    }

    .fleet-capacity-card {
      background: linear-gradient(135deg, #f6f8fb 0%, #e9ecef 100%);
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 24px;
      border-left: 4px solid #667eea;
    }

    .fleet-capacity-card h3 {
      margin: 0 0 16px;
      color: #1e293b;
    }

    .capacity-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 16px;
    }

    .capacity-item {
      display: flex;
      gap: 12px;
      align-items: center;
      background: white;
      padding: 16px;
      border-radius: 8px;
    }

    .capacity-item mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #667eea;
    }

    .capacity-item strong {
      display: block;
      font-size: 20px;
      color: #1e293b;
      margin-bottom: 4px;
    }

    .capacity-item span {
      font-size: 12px;
      color: #64748b;
    }

    .vehicles-section h3 {
      margin: 0 0 16px;
      color: #1e293b;
    }

    .vehicles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    .vehicle-card {
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .vehicle-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    }

    .vehicle-image-container {
      position: relative;
      width: 100%;
      height: 180px;
      overflow: hidden;
      background: #f1f5f9;
    }

    .vehicle-image {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .vehicle-image-placeholder {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%);
    }

    .vehicle-image-placeholder mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #94a3b8;
    }

    .status-chip {
      position: absolute;
      top: 8px;
      right: 8px;
      background: #ef4444 !important;
      color: white !important;
      font-size: 11px;
      font-weight: 600;
    }

    .status-chip.active {
      background: #22c55e !important;
    }

    .vehicle-card mat-card-content {
      padding: 16px;
    }

    .vehicle-card h4 {
      margin: 0 0 4px;
      font-size: 16px;
      font-weight: 600;
      color: #1e293b;
    }

    .vehicle-name {
      margin: 0 0 12px;
      font-size: 14px;
      color: #64748b;
    }

    .vehicle-specs {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-bottom: 12px;
    }

    .spec-item {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 12px;
      color: #64748b;
    }

    .spec-item mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .type-chip {
      background: #667eea !important;
      color: white !important;
      font-size: 11px;
    }

    .budget-card {
      background: linear-gradient(135deg, #d4fc79 0%, #96e6a1 100%);
    }

    .budget-amount {
      font-size: 36px;
      font-weight: 700;
      color: #065f46;
      text-align: center;
      padding: 16px 0;
    }

    .no-vehicles {
      text-align: center;
      padding: 48px;
      color: #94a3b8;
    }

    .no-vehicles mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
    }

    mat-dialog-actions {
      padding: 16px 24px;
      border-top: 1px solid #e0e0e0;
    }

    @media (max-width: 768px) {
      .portfolio-dialog {
        width: 100vw;
        max-width: 100vw;
      }

      .metrics-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .vehicles-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ApplicantPortfolioDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ApplicantPortfolioDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public application: TenderApplication
  ) {
    console.log('Portfolio Dialog - Application data:', this.application);
    console.log('Portfolio Dialog - Fleet Summary:', this.application.fleetSummary);
    console.log('Portfolio Dialog - Vehicles:', this.application.fleetSummary?.vehicles);
    console.log('Portfolio Dialog - Vehicle count:', this.application.fleetSummary?.vehicles?.length);
  }

  close(): void {
    this.dialogRef.close();
  }

  contactApplicant(): void {
    window.location.href = `mailto:${this.application.contactEmail}?subject=Regarding Tender Application&body=Dear ${this.application.contactPerson},%0D%0A%0D%0AThank you for your application...`;
  }
}
