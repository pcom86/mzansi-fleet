import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { ApplicantPortfolioDialogComponent } from './applicant-portfolio-dialog.component';

interface TenderApplication {
  id: string;
  tenderId: string;
  tenderTitle: string;
  ownerId: string;
  ownerCompanyName: string;
  ownerContactName: string;
  applicationMessage: string;
  proposedBudget: number;
  proposalDetails: string;
  availableVehicles: number;
  vehicleTypes: string;
  experienceHighlights: string;
  status: string;
  appliedAt: string;
  reviewedAt?: string;
  reviewNotes?: string;
  contactPerson: string;
  contactPhone: string;
  contactEmail: string;
  fleetSummary?: FleetSummary;
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

@Component({
  selector: 'app-tender-applications-view',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatBadgeModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatExpansionModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  template: `
    <div class="applications-container">
      <div class="header-section">
        <button mat-icon-button (click)="goBack()" class="back-button">
          <mat-icon>arrow_back</mat-icon>
        </button>
        <div class="header-content">
          <div class="header-title">
            <mat-icon class="header-icon">inbox</mat-icon>
            <h1>Tender Applications</h1>
          </div>
          <div class="header-meta">
            <mat-chip class="count-chip">
              <mat-icon>description</mat-icon>
              {{ applications.length }} Application{{ applications.length !== 1 ? 's' : '' }}
            </mat-chip>
          </div>
        </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-container">
        <mat-spinner></mat-spinner>
        <p>Loading applications...</p>
      </div>

      <!-- Empty State -->
      <div *ngIf="!loading && applications.length === 0" class="empty-state">
        <mat-icon>inbox</mat-icon>
        <h2>No Applications Yet</h2>
        <p>No one has applied to this tender yet. Check back later.</p>
      </div>

      <!-- Applications List -->
      <div class="applications-list" *ngIf="!loading && applications.length > 0">
        <mat-accordion multi>
          <mat-expansion-panel *ngFor="let application of applications" class="application-panel">
            <mat-expansion-panel-header>
              <mat-panel-title>
                <div class="applicant-header">
                  <div class="applicant-main">
                    <div class="company-section">
                      <div class="company-avatar">
                        <mat-icon>business</mat-icon>
                      </div>
                      <div class="company-details">
                        <h3 class="company-name">{{ application.ownerCompanyName || 'Company Not Set' }}</h3>
                        <div class="application-meta">
                          <span class="meta-item">
                            <mat-icon>calendar_today</mat-icon>
                            Applied {{ application.appliedAt | date:'MMM d, y' }}
                          </span>
                          <span class="meta-divider">•</span>
                          <span class="meta-item budget-highlight">
                            <mat-icon>attach_money</mat-icon>
                            R{{ application.proposedBudget | number:'1.0-0' }}
                          </span>
                          <span class="meta-divider">•</span>
                          <span class="meta-item">
                            <mat-icon>directions_car</mat-icon>
                            {{ application.availableVehicles }} Vehicle{{ application.availableVehicles !== 1 ? 's' : '' }}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div class="header-right">
                      <mat-chip class="status-badge" [ngClass]="'status-' + application.status.toLowerCase()">
                        {{ application.status }}
                      </mat-chip>
                      <button mat-stroked-button color="primary" 
                              (click)="viewPortfolio(application, $event)"
                              class="view-portfolio-btn">
                        <mat-icon>visibility</mat-icon>
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </mat-panel-title>
            </mat-expansion-panel-header>

            <!-- Application Details -->
            <div class="application-content">
              <!-- Quick Portfolio Access -->
              <div class="portfolio-quick-access">
                <button mat-raised-button color="accent" (click)="viewPortfolio(application, $event)">
                  <mat-icon>business_center</mat-icon>
                  View Complete Portfolio & Fleet Details
                </button>
              </div>

              <!-- Cover Letter -->
              <div class="content-section">
                <h3><mat-icon>message</mat-icon> Cover Letter</h3>
                <p class="message-text">{{ application.applicationMessage }}</p>
              </div>

              <!-- Proposal -->
              <div class="content-section">
                <h3><mat-icon>description</mat-icon> Proposal Details</h3>
                <div class="proposal-info">
                  <div class="info-item">
                    <strong>Proposed Budget:</strong>
                    <span class="budget-amount">R{{ application.proposedBudget | number:'1.2-2' }}</span>
                  </div>
                  <p>{{ application.proposalDetails }}</p>
                </div>
              </div>

              <!-- Fleet Information -->
              <div class="content-section">
                <h3><mat-icon>directions_car</mat-icon> Fleet Information</h3>
                <div class="fleet-info">
                  <div class="info-row">
                    <strong>Available Vehicles:</strong> {{ application.availableVehicles }}
                  </div>
                  <div class="info-row">
                    <strong>Vehicle Types:</strong> {{ application.vehicleTypes }}
                  </div>
                  <div class="info-row" *ngIf="application.experienceHighlights">
                    <strong>Experience:</strong>
                    <p>{{ application.experienceHighlights }}</p>
                  </div>
                </div>
              </div>

              <!-- Fleet Profile -->
              <div class="content-section fleet-profile" *ngIf="application.fleetSummary">
                <h3><mat-icon>badge</mat-icon> Fleet Profile</h3>
                
                <div class="profile-stats">
                  <div class="stat-card">
                    <mat-icon>directions_car</mat-icon>
                    <div>
                      <strong>{{ application.fleetSummary.totalVehicles }}</strong>
                      <span>Total Vehicles</span>
                    </div>
                  </div>
                  <div class="stat-card">
                    <mat-icon>check_circle</mat-icon>
                    <div>
                      <strong>{{ application.fleetSummary.activeVehicles }}</strong>
                      <span>Active</span>
                    </div>
                  </div>
                  <div class="stat-card">
                    <mat-icon>attach_money</mat-icon>
                    <div>
                      <strong>R{{ application.fleetSummary.totalRevenue | number:'1.0-0' }}</strong>
                      <span>Total Revenue</span>
                    </div>
                  </div>
                  <div class="stat-card" *ngIf="application.fleetSummary.averageRating">
                    <mat-icon>star</mat-icon>
                    <div>
                      <strong>{{ application.fleetSummary.averageRating | number:'1.1-1' }}</strong>
                      <span>Avg Rating</span>
                    </div>
                  </div>
                </div>

                <!-- Vehicle Details -->
                <div class="vehicles-section" *ngIf="application.fleetSummary?.vehicles?.length">
                  <h4>Fleet Vehicles</h4>
                  <div class="vehicles-grid">
                    <div *ngFor="let vehicle of application.fleetSummary!.vehicles" class="vehicle-card">
                      <div class="vehicle-image" *ngIf="vehicle.photos?.length">
                        <img [src]="vehicle.photos[0]" [alt]="vehicle.registrationNumber">
                      </div>
                      <div class="vehicle-image placeholder" *ngIf="!vehicle.photos?.length">
                        <mat-icon>directions_car</mat-icon>
                      </div>
                      <div class="vehicle-details">
                        <strong>{{ vehicle.registrationNumber }}</strong>
                        <p>{{ vehicle.make }} {{ vehicle.model }} ({{ vehicle.year }})</p>
                        <div class="vehicle-meta">
                          <span class="chip">{{ vehicle.vehicleType }}</span>
                          <span class="chip">{{ vehicle.capacity }} seats</span>
                          <span class="chip" [class.active]="vehicle.status === 'Active'">{{ vehicle.status }}</span>
                        </div>
                        <p class="mileage" *ngIf="vehicle.mileage">
                          <mat-icon>speed</mat-icon>
                          {{ vehicle.mileage | number }} km
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Company Info -->
                <div class="company-info">
                  <h4>Company Details</h4>
                  <div class="info-grid">
                    <div class="info-item">
                      <mat-icon>business</mat-icon>
                      <div>
                        <strong>Company:</strong>
                        <span>{{ application.fleetSummary.companyName }}</span>
                      </div>
                    </div>
                    <div class="info-item">
                      <mat-icon>person</mat-icon>
                      <div>
                        <strong>Contact Person:</strong>
                        <span>{{ application.contactPerson }}</span>
                      </div>
                    </div>
                    <div class="info-item">
                      <mat-icon>phone</mat-icon>
                      <div>
                        <strong>Phone:</strong>
                        <span>{{ application.contactPhone }}</span>
                      </div>
                    </div>
                    <div class="info-item">
                      <mat-icon>email</mat-icon>
                      <div>
                        <strong>Email:</strong>
                        <span>{{ application.contactEmail }}</span>
                      </div>
                    </div>
                    <div class="info-item" *ngIf="application.fleetSummary?.address">
                      <mat-icon>location_on</mat-icon>
                      <div>
                        <strong>Address:</strong>
                        <span>{{ application.fleetSummary!.address }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Actions -->
              <div class="application-actions" *ngIf="application.status === 'Pending'">
                <button mat-raised-button color="primary" (click)="acceptApplication(application.id)">
                  <mat-icon>check_circle</mat-icon>
                  Accept Application
                </button>
                <button mat-stroked-button (click)="underReview(application.id)">
                  <mat-icon>rate_review</mat-icon>
                  Mark Under Review
                </button>
                <button mat-stroked-button color="warn" (click)="rejectApplication(application.id)">
                  <mat-icon>cancel</mat-icon>
                  Reject
                </button>
              </div>

              <div class="review-notes" *ngIf="application.reviewNotes">
                <mat-icon>note</mat-icon>
                <div>
                  <strong>Review Notes:</strong>
                  <p>{{ application.reviewNotes }}</p>
                  <small>Reviewed on {{ application.reviewedAt | date:'medium' }}</small>
                </div>
              </div>
            </div>
          </mat-expansion-panel>
        </mat-accordion>
      </div>
    </div>
  `,
  styles: [`
    .applications-container {
      padding: 24px;
      max-width: 1200px;
      margin: 0 auto;
    }

    .header-section {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 32px 24px;
      margin: -24px -24px 32px -24px;
      color: white;
      position: relative;
      box-shadow: 0 4px 20px rgba(102, 126, 234, 0.3);
    }

    .back-button {
      position: absolute;
      left: 16px;
      top: 16px;
      color: white;
    }

    .back-button:hover {
      background: rgba(255, 255, 255, 0.1);
    }

    .header-content {
      text-align: center;
      max-width: 800px;
      margin: 0 auto;
    }

    .header-title {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 16px;
      margin-bottom: 16px;
    }

    .header-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }

    .header-content h1 {
      font-size: 36px;
      font-weight: 600;
      margin: 0;
      text-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .header-meta {
      display: flex;
      justify-content: center;
      gap: 12px;
    }

    .count-chip {
      background: rgba(255, 255, 255, 0.2) !important;
      color: white !important;
      font-weight: 600;
      padding: 8px 20px;
      font-size: 15px;
      backdrop-filter: blur(10px);
    }

    .count-chip mat-icon {
      margin-right: 8px;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .loading-container, .empty-state {
      text-align: center;
      padding: 60px 20px;
    }

    .loading-container p, .empty-state p {
      margin-top: 16px;
      color: #666;
    }

    .empty-state mat-icon {
      font-size: 80px;
      width: 80px;
      height: 80px;
      color: #ccc;
    }

    .applications-list {
      margin-top: 24px;
    }

    .application-panel {
      margin-bottom: 16px;
      border-radius: 16px !important;
      box-shadow: 0 2px 12px rgba(0,0,0,0.08) !important;
      border: 1px solid #e0e0e0 !important;
      overflow: hidden;
      transition: all 0.3s ease;
    }

    .application-panel:hover {
      box-shadow: 0 4px 20px rgba(0,0,0,0.12) !important;
      transform: translateY(-2px);
    }

    .applicant-header {
      width: 100%;
      padding: 8px 0;
    }

    .applicant-main {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      gap: 24px;
    }

    @media (max-width: 768px) {
      .applicant-main {
        flex-direction: column;
        align-items: flex-start;
      }

      .header-right {
        width: 100%;
        justify-content: space-between;
      }
    }

    .company-section {
      display: flex;
      align-items: center;
      gap: 16px;
      flex: 1;
      min-width: 0;
    }

    .company-avatar {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    }

    .company-avatar mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: white;
    }

    .company-details {
      flex: 1;
      min-width: 0;
    }

    .company-name {
      font-size: 18px;
      font-weight: 600;
      color: #2c3e50;
      margin: 0 0 8px 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .application-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-wrap: wrap;
      font-size: 13px;
      color: #666;
    }

    .meta-item {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .meta-item mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #999;
    }

    .meta-divider {
      color: #ccc;
    }

    .budget-highlight {
      color: #667eea;
      font-weight: 600;
    }

    .budget-highlight mat-icon {
      color: #667eea;
    }

    .header-right {
      display: flex;
      align-items: center;
      gap: 12px;
      flex-shrink: 0;
    }

    .status-badge {
      padding: 8px 16px !important;
      font-weight: 600;
      font-size: 12px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-badge.status-pending {
      background: #fff3cd !important;
      color: #856404 !important;
    }

    .status-badge.status-underreview {
      background: #cfe2ff !important;
      color: #084298 !important;
    }

    .status-badge.status-accepted {
      background: #d1e7dd !important;
      color: #0f5132 !important;
    }

    .status-badge.status-rejected {
      background: #f8d7da !important;
      color: #842029 !important;
    }

    .view-portfolio-btn {
      font-weight: 500;
    }

    .view-portfolio-btn mat-icon {
      margin-right: 4px;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .company-badge {
      display: flex;
      align-items: center;
      gap: 12px;
      flex: 1;
      min-width: 0;
    }

    .company-badge > mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: #667eea;
      flex-shrink: 0;
    }

    .company-info {
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 0;
      flex: 1;
    }

    .company-badge strong {
      display: block;
      font-size: 14px;
      font-weight: 600;
      color: #2c3e50;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .contact-name {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      color: #666;
    }

    .contact-name mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #999;
    }

    .status-chip {
      padding: 6px 16px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-chip.pending {
      background: #fff3cd;
      color: #856404;
    }

    .status-chip.underreview {
      background: #cfe2ff;
      color: #084298;
    }

    .status-chip.accepted {
      background: #d1e7dd;
      color: #0f5132;
    }

    .status-chip.rejected {
      background: #f8d7da;
      color: #842029;
    }

    .quick-stats {
      display: flex;
      gap: 20px;
      font-size: 14px;
      color: #666;
    }

    .quick-stats span {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .quick-stats mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .application-content {
      padding: 24px;
    }

    .portfolio-quick-access {
      margin-bottom: 24px;
      text-align: center;
      padding: 20px;
      background: linear-gradient(135deg, #f6f8fb 0%, #e9ecef 100%);
      border-radius: 12px;
      border: 2px dashed #667eea;
    }

    .portfolio-quick-access button {
      font-size: 15px;
      padding: 12px 32px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
      color: white !important;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      transition: all 0.3s ease;
    }

    .portfolio-quick-access button:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(102, 126, 234, 0.4);
    }

    .portfolio-quick-access button mat-icon {
      margin-right: 8px;
    }

    .content-section {
      margin-bottom: 32px;
      padding: 20px;
      background: #f9fafb;
      border-radius: 12px;
    }

    .content-section h3 {
      display: flex;
      align-items: center;
      gap: 8px;
      margin: 0 0 16px 0;
      color: #2c3e50;
      font-size: 18px;
    }

    .content-section h3 mat-icon {
      color: #667eea;
    }

    .message-text {
      color: #444;
      line-height: 1.8;
      white-space: pre-wrap;
    }

    .proposal-info .info-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
      padding: 12px;
      background: white;
      border-radius: 8px;
    }

    .budget-amount {
      font-size: 20px;
      font-weight: 700;
      color: #4caf50;
    }

    .fleet-info .info-row {
      margin: 12px 0;
      color: #444;
    }

    .fleet-info strong {
      color: #2c3e50;
    }

    .fleet-profile {
      background: linear-gradient(135deg, #f5f7fa 0%, #e5e9f2 100%);
    }

    .profile-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.05);
    }

    .stat-card mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #667eea;
    }

    .stat-card strong {
      display: block;
      font-size: 20px;
      color: #2c3e50;
    }

    .stat-card span {
      display: block;
      font-size: 13px;
      color: #666;
    }

    .vehicles-section {
      margin: 24px 0;
    }

    .vehicles-section h4 {
      margin: 0 0 16px 0;
      color: #2c3e50;
    }

    .vehicles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    .vehicle-card {
      background: white;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    }

    .vehicle-image {
      width: 100%;
      height: 160px;
      overflow: hidden;
    }

    .vehicle-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .vehicle-image.placeholder {
      background: #e0e0e0;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .vehicle-image.placeholder mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: #bbb;
    }

    .vehicle-details {
      padding: 16px;
    }

    .vehicle-details strong {
      display: block;
      font-size: 16px;
      color: #2c3e50;
      margin-bottom: 4px;
    }

    .vehicle-details > p {
      color: #666;
      font-size: 14px;
      margin: 0 0 12px 0;
    }

    .vehicle-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 8px;
    }

    .chip {
      padding: 4px 12px;
      background: #e5e9f2;
      color: #666;
      border-radius: 16px;
      font-size: 12px;
    }

    .chip.active {
      background: #d1e7dd;
      color: #0f5132;
    }

    .mileage {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #666;
      font-size: 13px;
      margin: 8px 0 0 0;
    }

    .mileage mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .company-info {
      margin-top: 24px;
    }

    .company-info h4 {
      margin: 0 0 16px 0;
      color: #2c3e50;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 12px;
    }

    .info-grid .info-item {
      display: flex;
      gap: 12px;
      padding: 12px;
      background: white;
      border-radius: 8px;
    }

    .info-grid .info-item mat-icon {
      color: #667eea;
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .info-grid .info-item strong {
      display: block;
      font-size: 13px;
      color: #666;
      margin-bottom: 2px;
    }

    .info-grid .info-item span {
      display: block;
      font-size: 14px;
      color: #2c3e50;
    }

    .application-actions {
      display: flex;
      gap: 12px;
      padding: 20px;
      background: white;
      border-radius: 12px;
      border: 2px solid #e5e9f2;
    }

    .application-actions button {
      flex: 1;
    }

    .application-actions button mat-icon {
      margin-right: 4px;
    }

    .review-notes {
      display: flex;
      gap: 12px;
      padding: 16px;
      background: #fff3cd;
      border-radius: 8px;
      margin-top: 16px;
    }

    .review-notes mat-icon {
      color: #856404;
      margin-top: 2px;
    }

    .review-notes strong {
      display: block;
      color: #856404;
      margin-bottom: 4px;
    }

    .review-notes p {
      margin: 4px 0;
      color: #664d03;
    }

    .review-notes small {
      color: #997404;
      font-size: 12px;
    }
  `]
})
export class TenderApplicationsViewComponent implements OnInit {
  private apiUrl = 'http://localhost:5000/api';
  applications: TenderApplication[] = [];
  loading = false;
  tenderId: string = '';

  constructor(
    private http: HttpClient,
    private route: ActivatedRoute,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.tenderId = this.route.snapshot.paramMap.get('id') || '';
    if (this.tenderId) {
      this.loadApplications();
    }
  }

  loadApplications(): void {
    this.loading = true;
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/login']);
      return;
    }

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http.get<TenderApplication[]>(`${this.apiUrl}/Tender/${this.tenderId}/applications`, { headers }).subscribe({
      next: (data) => {
        console.log('Applications data received:', data);
        data.forEach((app, index) => {
          console.log(`Application ${index}:`, {
            companyName: app.ownerCompanyName,
            hasFleetSummary: !!app.fleetSummary,
            vehicleCount: app.fleetSummary?.vehicles?.length || 0,
            vehicles: app.fleetSummary?.vehicles
          });
        });
        this.applications = data;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading applications:', error);
        this.snackBar.open('Failed to load applications', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  acceptApplication(applicationId: string): void {
    if (!confirm('Are you sure you want to accept this application? This will award the tender to this applicant and reject all other applications.')) {
      return;
    }

    this.updateApplicationStatus(applicationId, 'Accepted', 'Application accepted. Congratulations!');
  }

  underReview(applicationId: string): void {
    this.updateApplicationStatus(applicationId, 'UnderReview', 'Application is now under review');
  }

  rejectApplication(applicationId: string): void {
    const notes = prompt('Reason for rejection (optional):');
    this.updateApplicationStatus(applicationId, 'Rejected', notes || 'Application rejected');
  }

  updateApplicationStatus(applicationId: string, status: string, reviewNotes: string): void {
    const token = localStorage.getItem('token');
    if (!token) return;

    const headers = new HttpHeaders().set('Authorization', `Bearer ${token}`);
    
    this.http.put(
      `${this.apiUrl}/Tender/applications/${applicationId}/status`,
      { status, reviewNotes },
      { headers }
    ).subscribe({
      next: () => {
        this.snackBar.open('Application status updated', 'Close', { duration: 3000 });
        this.loadApplications();
      },
      error: (error) => {
        console.error('Error updating application:', error);
        this.snackBar.open('Failed to update application status', 'Close', { duration: 3000 });
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/tenders']);
  }

  viewPortfolio(application: TenderApplication, event: Event): void {
    event.stopPropagation(); // Prevent expansion panel from toggling
    
    this.dialog.open(ApplicantPortfolioDialogComponent, {
      width: '900px',
      maxWidth: '95vw',
      maxHeight: '90vh',
      data: application,
      panelClass: 'portfolio-dialog-container'
    });
  }
}
