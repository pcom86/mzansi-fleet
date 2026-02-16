import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatCalendar, MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Router } from '@angular/router';
import { MessagingService } from '../../services/messaging.service';
import { TrackingDeviceService } from '../../services/tracking-device.service';
import { RoadsideAssistanceService } from '../../services/roadside-assistance.service';
import { interval, Subscription } from 'rxjs';

interface ScheduledJob {
  id: string;
  vehicleId: string;
  vehicleRegistration: string;
  vehicleMake: string;
  vehicleModel: string;
  scheduledDate: string;
  category: string;
  description: string;
  location?: string;
  priority?: string;
  state: string;
}

interface CompletedJob {
  id: string;
  vehicleId: string;
  vehicleRegistration: string;
  maintenanceDate: Date;
  completedDate: Date;
  maintenanceType: string;
  component: string;
  description: string;
  cost: number;
  invoiceNumber: string;
  rating?: number;
  ownerName?: string;
}

interface TrackingDeviceRequest {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string;
  vehicleId: string;
  vehicleRegistration: string;
  vehicleMake: string;
  vehicleModel: string;
  vehicleYear: number;
  preferredInstallationDate: string;
  installationLocation: string;
  deviceFeatures: string;
  budgetMin?: number;
  budgetMax?: number;
  status: string;
  createdAt: string;
  offerCount: number;
}

interface RoadsideAssistanceRequest {
  id: string;
  userId: string;
  userName: string;
  userPhone: string;
  userRole: string;
  vehicleId?: string;
  vehicleRegistration?: string;
  vehicleMake?: string;
  vehicleModel?: string;
  assistanceType: string;
  location: string;
  latitude?: string;
  longitude?: string;
  issueDescription: string;
  status: string;
  requestedAt: string;
  priority: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  date: Date;
  type: 'job' | 'request' | 'appointment';
  status: string;
  vehicleRegistration?: string;
  description?: string;
}

interface FinancialSummary {
  totalRevenue: number;
  last30DaysRevenue: number;
  last60DaysRevenue: number;
  revenueGrowth: number;
  totalJobsCompleted: number;
  averageJobValue: number;
  monthlyRevenue: any[];
}

@Component({
  selector: 'app-service-provider-overview',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatTabsModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule,
    MatDividerModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],
  template: `
    <div class="dashboard-container">
      <!-- Header with Key Metrics -->
      <div class="dashboard-header">
        <div class="welcome-section">
          <h1><mat-icon>dashboard</mat-icon> Service Provider Dashboard</h1>
          <p class="welcome-message">Welcome back! Here's your business overview.</p>
        </div>

        <div class="quick-stats">
          <mat-card class="quick-stat-card">
            <mat-card-content>
              <div class="stat-icon">
                <mat-icon>today</mat-icon>
              </div>
              <div class="stat-info">
                <h3>{{ todaysJobsCount }}</h3>
                <p>Jobs Today</p>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="quick-stat-card">
            <mat-card-content>
              <div class="stat-icon">
                <mat-icon>attach_money</mat-icon>
              </div>
              <div class="stat-info">
                <h3>R{{ financialSummary?.last30DaysRevenue?.toFixed(0) || '0' }}</h3>
                <p>Last 30 Days</p>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="quick-stat-card">
            <mat-card-content>
              <div class="stat-icon">
                <mat-icon>notifications</mat-icon>
              </div>
              <div class="stat-info">
                <h3>{{ newRequestsCount }}</h3>
                <p>New Requests</p>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="quick-stat-card">
            <mat-card-content>
              <div class="stat-icon">
                <mat-icon>mail</mat-icon>
              </div>
              <div class="stat-info">
                <h3>{{ unreadMessages }}</h3>
                <p>Messages</p>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      </div>

      <!-- Alert Section -->
      <div class="alerts-section" *ngIf="todaysJobsCount > 0 || newRequestsCount > 0 || unreadMessages > 0">
        <mat-card class="alert-card urgent" *ngIf="todaysJobsCount > 0">
          <mat-card-content>
            <div class="alert-header">
              <mat-icon>schedule</mat-icon>
              <h3>Today's Schedule</h3>
            </div>
            <p>You have <strong>{{ todaysJobsCount }}</strong> job(s) scheduled for today. Don't forget to check your calendar!</p>
            <button mat-raised-button color="primary" (click)="scrollToSection('calendar')">
              <mat-icon>calendar_today</mat-icon>
              View Calendar
            </button>
          </mat-card-content>
        </mat-card>

        <mat-card class="alert-card info" *ngIf="newRequestsCount > 0">
          <mat-card-content>
            <div class="alert-header">
              <mat-icon>notifications_active</mat-icon>
              <h3>New Service Requests</h3>
            </div>
            <p>There are <strong>{{ newRequestsCount }}</strong> new service requests in your area that match your services.</p>
            <button mat-raised-button color="accent" (click)="scrollToSection('requests')">
              <mat-icon>visibility</mat-icon>
              View Requests
            </button>
          </mat-card-content>
        </mat-card>

        <mat-card class="alert-card warning" *ngIf="unreadMessages > 0">
          <mat-card-content>
            <div class="alert-header">
              <mat-icon>mail</mat-icon>
              <h3>New Messages</h3>
            </div>
            <p>You have <strong>{{ unreadMessages }}</strong> unread message(s). Check your inbox for job assignments and updates.</p>
            <button mat-raised-button color="warn" (click)="navigateToMessages()">
              <mat-icon>inbox</mat-icon>
              View Messages
            </button>
          </mat-card-content>
        </mat-card>
      </div>

      <!-- Main Dashboard Tabs -->
      <mat-tab-group class="dashboard-tabs" animationDuration="0ms">
        <!-- Overview Tab -->
        <mat-tab label="Overview">
          <div class="tab-content">
            <div class="overview-grid">
              <!-- Upcoming Jobs -->
              <mat-card class="overview-card">
                <mat-card-header>
                  <mat-card-title>
                    <mat-icon>upcoming</mat-icon>
                    Upcoming Jobs
                  </mat-card-title>
                  <mat-card-subtitle>{{ upcomingJobs.length }} scheduled</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <div class="jobs-list" *ngIf="upcomingJobs.length > 0; else noUpcomingJobs">
                    <div *ngFor="let job of upcomingJobs.slice(0, 3)" class="job-item">
                      <div class="job-header">
                        <span class="vehicle-reg">{{ job.vehicleRegistration }}</span>
                        <mat-chip [color]="getPriorityColor(job.priority)" selected>
                          {{ job.priority || 'Normal' }}
                        </mat-chip>
                      </div>
                      <div class="job-details">
                        <p class="job-category">{{ job.category }}</p>
                        <p class="job-date">
                          <mat-icon>event</mat-icon>
                          {{ formatDate(job.scheduledDate) }}
                        </p>
                        <p class="job-location" *ngIf="job.location">
                          <mat-icon>location_on</mat-icon>
                          {{ job.location }}
                        </p>
                      </div>
                    </div>
                  </div>
                  <ng-template #noUpcomingJobs>
                    <div class="empty-state">
                      <mat-icon>event_busy</mat-icon>
                      <p>No upcoming jobs scheduled</p>
                    </div>
                  </ng-template>
                </mat-card-content>
                <mat-card-actions *ngIf="upcomingJobs.length > 3">
                  <button mat-button (click)="scrollToSection('jobs')">
                    View All Jobs
                  </button>
                </mat-card-actions>
              </mat-card>

              <!-- Recent Earnings -->
              <mat-card class="overview-card">
                <mat-card-header>
                  <mat-card-title>
                    <mat-icon>attach_money</mat-icon>
                    Recent Earnings
                  </mat-card-title>
                  <mat-card-subtitle>Last 30 days</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <div class="earnings-summary">
                    <div class="earnings-main">
                      <h3>R{{ financialSummary?.last30DaysRevenue?.toFixed(2) || '0.00' }}</h3>
                      <p class="earnings-change"
                         [class.positive]="financialSummary && financialSummary.revenueGrowth > 0"
                         [class.negative]="financialSummary && financialSummary.revenueGrowth < 0">
                        <mat-icon *ngIf="financialSummary && financialSummary.revenueGrowth !== 0">
                          {{ financialSummary && financialSummary.revenueGrowth > 0 ? 'trending_up' : 'trending_down' }}
                        </mat-icon>
                        {{ financialSummary?.revenueGrowth?.toFixed(1) || '0' }}% vs last month
                      </p>
                    </div>
                    <div class="earnings-breakdown">
                      <div class="earnings-stat">
                        <span class="stat-label">Jobs Completed</span>
                        <span class="stat-value">{{ financialSummary?.totalJobsCompleted || 0 }}</span>
                      </div>
                      <div class="earnings-stat">
                        <span class="stat-label">Avg. per Job</span>
                        <span class="stat-value">R{{ financialSummary?.averageJobValue?.toFixed(2) || '0.00' }}</span>
                      </div>
                    </div>
                  </div>
                </mat-card-content>
                <mat-card-actions>
                  <button mat-button (click)="scrollToSection('earnings')">
                    View Details
                  </button>
                </mat-card-actions>
              </mat-card>

              <!-- Service Requests -->
              <mat-card class="overview-card">
                <mat-card-header>
                  <mat-card-title>
                    <mat-icon>build_circle</mat-icon>
                    Service Requests
                  </mat-card-title>
                  <mat-card-subtitle>{{ trackingRequests.length + roadsideRequests.length }} available</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <div class="requests-summary">
                    <div class="request-type" *ngIf="trackingRequests.length > 0">
                      <mat-icon>gps_fixed</mat-icon>
                      <span>{{ trackingRequests.length }} Tracking Device Requests</span>
                    </div>
                    <div class="request-type" *ngIf="roadsideRequests.length > 0">
                      <mat-icon>local_shipping</mat-icon>
                      <span>{{ roadsideRequests.length }} Roadside Assistance Requests</span>
                    </div>
                    <div class="empty-state" *ngIf="trackingRequests.length === 0 && roadsideRequests.length === 0">
                      <mat-icon>check_circle</mat-icon>
                      <p>No new service requests</p>
                    </div>
                  </div>
                </mat-card-content>
                <mat-card-actions *ngIf="trackingRequests.length > 0 || roadsideRequests.length > 0">
                  <button mat-button (click)="scrollToSection('requests')">
                    View Requests
                  </button>
                </mat-card-actions>
              </mat-card>
            </div>
          </div>
        </mat-tab>

        <!-- Jobs Tab -->
        <mat-tab label="Jobs" id="jobs">
          <div class="tab-content">
            <div class="jobs-section">
              <h2>Job Management</h2>

              <mat-tab-group class="jobs-tabs">
                <mat-tab label="Upcoming Jobs">
                  <div class="jobs-table-container">
                    <table mat-table [dataSource]="upcomingJobs" class="jobs-table">
                      <ng-container matColumnDef="vehicle">
                        <th mat-header-cell *matHeaderCellDef>Vehicle</th>
                        <td mat-cell *matCellDef="let job">
                          <div class="vehicle-info">
                            <strong>{{ job.vehicleRegistration }}</strong>
                            <br>
                            <small>{{ job.vehicleMake }} {{ job.vehicleModel }}</small>
                          </div>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="service">
                        <th mat-header-cell *matHeaderCellDef>Service</th>
                        <td mat-cell *matCellDef="let job">
                          <div class="service-info">
                            <span class="category">{{ job.category }}</span>
                            <br>
                            <small>{{ job.description }}</small>
                          </div>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="date">
                        <th mat-header-cell *matHeaderCellDef>Scheduled Date</th>
                        <td mat-cell *matCellDef="let job">
                          <div class="date-info">
                            <mat-icon>event</mat-icon>
                            {{ formatDate(job.scheduledDate) }}
                          </div>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="location">
                        <th mat-header-cell *matHeaderCellDef>Location</th>
                        <td mat-cell *matCellDef="let job">
                          <div class="location-info" *ngIf="job.location; else noLocation">
                            <mat-icon>location_on</mat-icon>
                            {{ job.location }}
                          </div>
                          <ng-template #noLocation>
                            <span class="no-data">Not specified</span>
                          </ng-template>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="priority">
                        <th mat-header-cell *matHeaderCellDef>Priority</th>
                        <td mat-cell *matCellDef="let job">
                          <mat-chip [color]="getPriorityColor(job.priority)" selected>
                            {{ job.priority || 'Normal' }}
                          </mat-chip>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="actions">
                        <th mat-header-cell *matHeaderCellDef>Actions</th>
                        <td mat-cell *matCellDef="let job">
                          <button mat-icon-button [matTooltip]="'View Details'" (click)="viewJobDetails(job)">
                            <mat-icon>visibility</mat-icon>
                          </button>
                          <button mat-icon-button [matTooltip]="'Mark Complete'" (click)="markJobComplete(job)">
                            <mat-icon>check_circle</mat-icon>
                          </button>
                        </td>
                      </ng-container>

                      <tr mat-header-row *matHeaderRowDef="upcomingJobsColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: upcomingJobsColumns;"></tr>
                    </table>

                    <div class="empty-state" *ngIf="upcomingJobs.length === 0">
                      <mat-icon>event_busy</mat-icon>
                      <p>No upcoming jobs scheduled</p>
                    </div>
                  </div>
                </mat-tab>

                <mat-tab label="Job History">
                  <div class="jobs-table-container">
                    <table mat-table [dataSource]="completedJobs" class="jobs-table">
                      <ng-container matColumnDef="vehicle">
                        <th mat-header-cell *matHeaderCellDef>Vehicle</th>
                        <td mat-cell *matCellDef="let job">
                          <div class="vehicle-info">
                            <strong>{{ job.vehicleRegistration }}</strong>
                            <br>
                            <small>{{ job.ownerName || 'Unknown Owner' }}</small>
                          </div>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="service">
                        <th mat-header-cell *matHeaderCellDef>Service</th>
                        <td mat-cell *matCellDef="let job">
                          <div class="service-info">
                            <span class="category">{{ job.maintenanceType }}</span>
                            <br>
                            <small>{{ job.description }}</small>
                          </div>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="completed">
                        <th mat-header-cell *matHeaderCellDef>Completed</th>
                        <td mat-cell *matCellDef="let job">
                          <div class="date-info">
                            <mat-icon>event_available</mat-icon>
                            {{ formatDate(job.completedDate.toString()) }}
                          </div>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="cost">
                        <th mat-header-cell *matHeaderCellDef>Earnings</th>
                        <td mat-cell *matCellDef="let job">
                          <div class="cost-info">
                            <strong>R{{ job.cost.toFixed(2) }}</strong>
                          </div>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="rating">
                        <th mat-header-cell *matHeaderCellDef>Rating</th>
                        <td mat-cell *matCellDef="let job">
                          <div class="rating-info" *ngIf="job.rating; else noRating">
                            <mat-icon class="star">star</mat-icon>
                            {{ job.rating }}/5
                          </div>
                          <ng-template #noRating>
                            <span class="no-data">Not rated</span>
                          </ng-template>
                        </td>
                      </ng-container>

                      <tr mat-header-row *matHeaderRowDef="completedJobsColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: completedJobsColumns;"></tr>
                    </table>

                    <div class="empty-state" *ngIf="completedJobs.length === 0">
                      <mat-icon>history</mat-icon>
                      <p>No completed jobs yet</p>
                    </div>
                  </div>
                </mat-tab>
              </mat-tab-group>
            </div>
          </div>
        </mat-tab>

        <!-- Calendar & Bookings Tab -->
        <mat-tab label="Calendar" id="calendar">
          <div class="tab-content">
            <div class="calendar-section">
              <h2>Calendar & Bookings</h2>

              <div class="calendar-container">
                <div class="calendar-sidebar">
                  <mat-card class="calendar-events">
                    <mat-card-header>
                      <mat-card-title>Today's Events</mat-card-title>
                    </mat-card-header>
                    <mat-card-content>
                      <div class="events-list" *ngIf="todaysEvents.length > 0; else noEvents">
                        <div *ngFor="let event of todaysEvents" class="event-item" [class]="event.type">
                          <div class="event-icon">
                            <mat-icon>{{ getEventIcon(event.type) }}</mat-icon>
                          </div>
                          <div class="event-details">
                            <h4>{{ event.title }}</h4>
                            <p>{{ event.description }}</p>
                            <small *ngIf="event.vehicleRegistration">{{ event.vehicleRegistration }}</small>
                          </div>
                        </div>
                      </div>
                      <ng-template #noEvents>
                        <div class="empty-state">
                          <mat-icon>event_busy</mat-icon>
                          <p>No events today</p>
                        </div>
                      </ng-template>
                    </mat-card-content>
                  </mat-card>
                </div>

                <div class="calendar-main">
                  <mat-calendar
                    [selected]="selectedDate"
                    (selectedChange)="onDateSelected($event)">
                  </mat-calendar>
                </div>
              </div>
            </div>
          </div>
        </mat-tab>

        <!-- Service Requests Tab -->
        <mat-tab label="Requests" id="requests">
          <div class="tab-content">
            <div class="requests-section">
              <h2>Service Requests</h2>

              <mat-tab-group class="requests-tabs">
                <mat-tab label="Tracking Devices" *ngIf="offersTrackingServices">
                  <div class="requests-table-container">
                    <table mat-table [dataSource]="trackingRequests" class="requests-table">
                      <ng-container matColumnDef="vehicle">
                        <th mat-header-cell *matHeaderCellDef>Vehicle</th>
                        <td mat-cell *matCellDef="let request">
                          <div class="vehicle-info">
                            <strong>{{ request.vehicleRegistration }}</strong>
                            <br>
                            <small>{{ request.vehicleMake }} {{ request.vehicleModel }}</small>
                          </div>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="owner">
                        <th mat-header-cell *matHeaderCellDef>Owner</th>
                        <td mat-cell *matCellDef="let request">
                          <div class="owner-info">
                            <strong>{{ request.ownerName }}</strong>
                            <br>
                            <small>{{ request.ownerEmail }}</small>
                          </div>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="location">
                        <th mat-header-cell *matHeaderCellDef>Location</th>
                        <td mat-cell *matCellDef="let request">
                          <div class="location-info">
                            <mat-icon>location_on</mat-icon>
                            {{ request.installationLocation }}
                          </div>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="budget">
                        <th mat-header-cell *matHeaderCellDef>Budget</th>
                        <td mat-cell *matCellDef="let request">
                          <div class="budget-info">
                            R{{ request.budgetMin || 0 }} - R{{ request.budgetMax || 0 }}
                          </div>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="actions">
                        <th mat-header-cell *matHeaderCellDef>Actions</th>
                        <td mat-cell *matCellDef="let request">
                          <button mat-icon-button [matTooltip]="'View Details'" (click)="viewRequestDetails(request)">
                            <mat-icon>visibility</mat-icon>
                          </button>
                          <button mat-icon-button [matTooltip]="'Submit Offer'" color="primary" (click)="submitOffer(request)">
                            <mat-icon>send</mat-icon>
                          </button>
                        </td>
                      </ng-container>

                      <tr mat-header-row *matHeaderRowDef="trackingRequestsColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: trackingRequestsColumns;"></tr>
                    </table>

                    <div class="empty-state" *ngIf="trackingRequests.length === 0">
                      <mat-icon>gps_off</mat-icon>
                      <p>No tracking device requests available</p>
                    </div>
                  </div>
                </mat-tab>

                <mat-tab label="Roadside Assistance" *ngIf="offersRoadsideServices">
                  <div class="requests-table-container">
                    <table mat-table [dataSource]="roadsideRequests" class="requests-table">
                      <ng-container matColumnDef="vehicle">
                        <th mat-header-cell *matHeaderCellDef>Vehicle</th>
                        <td mat-cell *matCellDef="let request">
                          <div class="vehicle-info" *ngIf="request.vehicleRegistration; else noVehicle">
                            <strong>{{ request.vehicleRegistration }}</strong>
                            <br>
                            <small>{{ request.vehicleMake }} {{ request.vehicleModel }}</small>
                          </div>
                          <ng-template #noVehicle>
                            <span class="no-data">No vehicle specified</span>
                          </ng-template>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="requester">
                        <th mat-header-cell *matHeaderCellDef>Requester</th>
                        <td mat-cell *matCellDef="let request">
                          <div class="requester-info">
                            <strong>{{ request.userName }}</strong>
                            <br>
                            <small>{{ request.userRole }}</small>
                          </div>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="service">
                        <th mat-header-cell *matHeaderCellDef>Service Needed</th>
                        <td mat-cell *matCellDef="let request">
                          <div class="service-info">
                            <span class="assistance-type">{{ request.assistanceType }}</span>
                            <br>
                            <small>{{ request.issueDescription }}</small>
                          </div>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="location">
                        <th mat-header-cell *matHeaderCellDef>Location</th>
                        <td mat-cell *matCellDef="let request">
                          <div class="location-info">
                            <mat-icon>location_on</mat-icon>
                            {{ request.location }}
                          </div>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="priority">
                        <th mat-header-cell *matHeaderCellDef>Priority</th>
                        <td mat-cell *matCellDef="let request">
                          <mat-chip [color]="getPriorityColor(request.priority)" selected>
                            {{ request.priority }}
                          </mat-chip>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="actions">
                        <th mat-header-cell *matHeaderCellDef>Actions</th>
                        <td mat-cell *matCellDef="let request">
                          <button mat-icon-button [matTooltip]="'View Details'" (click)="viewRequestDetails(request)">
                            <mat-icon>visibility</mat-icon>
                          </button>
                          <button mat-icon-button [matTooltip]="'Accept Request'" color="primary" (click)="acceptRequest(request)">
                            <mat-icon>check_circle</mat-icon>
                          </button>
                        </td>
                      </ng-container>

                      <tr mat-header-row *matHeaderRowDef="roadsideRequestsColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: roadsideRequestsColumns;"></tr>
                    </table>

                    <div class="empty-state" *ngIf="roadsideRequests.length === 0">
                      <mat-icon>local_shipping</mat-icon>
                      <p>No roadside assistance requests available</p>
                    </div>
                  </div>
                </mat-tab>
              </mat-tab-group>
            </div>
          </div>
        </mat-tab>

        <!-- Earnings Tab -->
        <mat-tab label="Earnings" id="earnings">
          <div class="tab-content">
            <div class="earnings-section">
              <h2>Earnings Overview</h2>

              <div class="earnings-summary-cards">
                <mat-card class="earnings-card">
                  <mat-card-content>
                    <div class="earnings-header">
                      <mat-icon>attach_money</mat-icon>
                      <div>
                        <h3>Total Revenue</h3>
                        <p class="earnings-amount">R{{ financialSummary?.totalRevenue?.toFixed(2) || '0.00' }}</p>
                      </div>
                    </div>
                  </mat-card-content>
                </mat-card>

                <mat-card class="earnings-card">
                  <mat-card-content>
                    <div class="earnings-header">
                      <mat-icon>trending_up</mat-icon>
                      <div>
                        <h3>Last 30 Days</h3>
                        <p class="earnings-amount">R{{ financialSummary?.last30DaysRevenue?.toFixed(2) || '0.00' }}</p>
                      </div>
                    </div>
                  </mat-card-content>
                </mat-card>

                <mat-card class="earnings-card">
                  <mat-card-content>
                    <div class="earnings-header">
                      <mat-icon>analytics</mat-icon>
                      <div>
                        <h3>Growth</h3>
                        <p class="earnings-amount"
                           [class.positive]="financialSummary && financialSummary.revenueGrowth > 0"
                           [class.negative]="financialSummary && financialSummary.revenueGrowth < 0">
                          {{ financialSummary?.revenueGrowth?.toFixed(1) || '0' }}%
                        </p>
                      </div>
                    </div>
                  </mat-card-content>
                </mat-card>

                <mat-card class="earnings-card">
                  <mat-card-content>
                    <div class="earnings-header">
                      <mat-icon>assignment_turned_in</mat-icon>
                      <div>
                        <h3>Jobs Completed</h3>
                        <p class="earnings-amount">{{ financialSummary?.totalJobsCompleted || 0 }}</p>
                      </div>
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>

              <mat-card class="earnings-chart-card">
                <mat-card-header>
                  <mat-card-title>Monthly Revenue</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="monthly-revenue" *ngIf="financialSummary && financialSummary.monthlyRevenue && financialSummary.monthlyRevenue.length > 0; else noRevenueData">
                    <div *ngFor="let month of financialSummary.monthlyRevenue" class="month-bar">
                      <div class="month-label">{{ getMonthName(month.month) }} {{ month.year }}</div>
                      <div class="bar-container">
                        <div class="bar" [style.width.%]="getBarWidth(month.revenue)"></div>
                        <span class="bar-value">R{{ month.revenue.toFixed(0) }}</span>
                      </div>
                      <div class="month-stats">{{ month.jobCount }} jobs</div>
                    </div>
                  </div>
                  <ng-template #noRevenueData>
                    <div class="empty-state">
                      <mat-icon>bar_chart</mat-icon>
                      <p>No revenue data available yet</p>
                    </div>
                  </ng-template>
                </mat-card-content>
              </mat-card>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .dashboard-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 2rem;
      gap: 2rem;
    }

    .welcome-section h1 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 0 0.5rem 0;
      color: #1976d2;
      font-size: 2rem;
    }

    .welcome-message {
      color: #666;
      margin: 0;
      font-size: 1.1rem;
    }

    .quick-stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      flex: 1;
      max-width: 800px;
    }

    .quick-stat-card {
      text-align: center;
    }

    .quick-stat-card mat-card-content {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem !important;
    }

    .stat-icon {
      background: #f5f5f5;
      border-radius: 50%;
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .stat-icon mat-icon {
      color: #1976d2;
    }

    .stat-info h3 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: bold;
      color: #333;
    }

    .stat-info p {
      margin: 0.25rem 0 0 0;
      color: #666;
      font-size: 0.9rem;
    }

    .alerts-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .alert-card {
      border-left: 4px solid;
    }

    .alert-card.urgent {
      border-left-color: #f44336;
    }

    .alert-card.info {
      border-left-color: #2196f3;
    }

    .alert-card.warning {
      border-left-color: #ff9800;
    }

    .alert-header {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .alert-header h3 {
      margin: 0;
      color: #333;
    }

    .alert-card mat-card-content {
      padding: 1.5rem !important;
    }

    .dashboard-tabs {
      margin-top: 2rem;
    }

    .tab-content {
      padding: 2rem 0;
    }

    .overview-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 1.5rem;
    }

    .overview-card mat-card-header {
      padding-bottom: 0.5rem;
    }

    .overview-card mat-card-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.2rem;
    }

    .jobs-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      max-height: 300px;
      overflow-y: auto;
    }

    .job-item {
      background: #f8f9fa;
      border-radius: 8px;
      padding: 1rem;
      border-left: 3px solid #1976d2;
    }

    .job-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.5rem;
    }

    .vehicle-reg {
      font-weight: bold;
      color: #333;
    }

    .job-details p {
      margin: 0.25rem 0;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 0.9rem;
    }

    .job-category {
      font-weight: 500;
      color: #1976d2;
    }

    .earnings-summary {
      text-align: center;
    }

    .earnings-main h3 {
      font-size: 2rem;
      margin: 0;
      color: #4caf50;
    }

    .earnings-change {
      margin: 0.5rem 0 0 0;
      font-size: 0.9rem;
    }

    .earnings-change.positive {
      color: #4caf50;
    }

    .earnings-change.negative {
      color: #f44336;
    }

    .earnings-breakdown {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-top: 1rem;
    }

    .earnings-stat {
      text-align: center;
    }

    .stat-label {
      display: block;
      color: #666;
      font-size: 0.8rem;
    }

    .stat-value {
      display: block;
      font-weight: bold;
      color: #333;
    }

    .requests-summary {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .request-type {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem;
      background: #f8f9fa;
      border-radius: 4px;
    }

    .empty-state {
      text-align: center;
      color: #666;
      padding: 2rem;
    }

    .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .jobs-section h2,
    .calendar-section h2,
    .requests-section h2,
    .earnings-section h2 {
      margin: 0 0 1.5rem 0;
      color: #333;
    }

    .jobs-tabs,
    .requests-tabs {
      margin-top: 1rem;
    }

    .jobs-table-container,
    .requests-table-container {
      margin-top: 1rem;
    }

    .jobs-table,
    .requests-table {
      width: 100%;
    }

    .vehicle-info,
    .service-info,
    .owner-info,
    .requester-info {
      line-height: 1.4;
    }

    .date-info,
    .location-info,
    .cost-info,
    .budget-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .rating-info {
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .rating-info .star {
      color: #ffc107;
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .no-data {
      color: #999;
      font-style: italic;
    }

    .calendar-container {
      display: grid;
      grid-template-columns: 300px 1fr;
      gap: 2rem;
      align-items: start;
    }

    .calendar-sidebar {
      position: sticky;
      top: 2rem;
    }

    .calendar-events mat-card-content {
      padding: 1rem !important;
    }

    .events-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .event-item {
      display: flex;
      gap: 0.75rem;
      padding: 0.75rem;
      border-radius: 4px;
      border-left: 3px solid;
    }

    .event-item.job {
      border-left-color: #1976d2;
      background: #e3f2fd;
    }

    .event-item.request {
      border-left-color: #ff9800;
      background: #fff3e0;
    }

    .event-item.appointment {
      border-left-color: #4caf50;
      background: #e8f5e8;
    }

    .event-icon mat-icon {
      color: #666;
    }

    .event-details h4 {
      margin: 0 0 0.25rem 0;
      font-size: 0.9rem;
    }

    .event-details p {
      margin: 0 0 0.25rem 0;
      font-size: 0.8rem;
      color: #666;
    }

    .event-details small {
      color: #999;
      font-size: 0.75rem;
    }

    .calendar-main {
      background: white;
      border-radius: 8px;
      padding: 1rem;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .earnings-summary-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .earnings-card mat-card-content {
      padding: 1.5rem !important;
    }

    .earnings-header {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .earnings-header mat-icon {
      color: #1976d2;
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .earnings-amount {
      font-size: 1.5rem;
      font-weight: bold;
      margin: 0.5rem 0 0 0;
      color: #333;
    }

    .earnings-amount.positive {
      color: #4caf50;
    }

    .earnings-amount.negative {
      color: #f44336;
    }

    .earnings-chart-card mat-card-content {
      padding: 1.5rem !important;
    }

    .monthly-revenue {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .month-bar {
      display: grid;
      grid-template-columns: 120px 1fr 80px;
      align-items: center;
      gap: 1rem;
    }

    .month-label {
      font-weight: 500;
      color: #666;
    }

    .bar-container {
      position: relative;
      height: 24px;
      background: #f5f5f5;
      border-radius: 12px;
      overflow: hidden;
    }

    .bar {
      height: 100%;
      background: linear-gradient(90deg, #1976d2, #42a5f5);
      border-radius: 12px;
      transition: width 0.3s ease;
    }

    .bar-value {
      position: absolute;
      right: 8px;
      top: 50%;
      transform: translateY(-50%);
      color: white;
      font-size: 0.8rem;
      font-weight: bold;
      text-shadow: 0 1px 2px rgba(0,0,0,0.3);
    }

    .month-stats {
      text-align: right;
      color: #666;
      font-size: 0.8rem;
    }

    @media (max-width: 768px) {
      .dashboard-container {
        padding: 1rem;
      }

      .dashboard-header {
        flex-direction: column;
        align-items: stretch;
      }

      .quick-stats {
        max-width: none;
      }

      .overview-grid {
        grid-template-columns: 1fr;
      }

      .calendar-container {
        grid-template-columns: 1fr;
      }

      .calendar-sidebar {
        position: static;
      }

      .earnings-summary-cards {
        grid-template-columns: 1fr;
      }

      .month-bar {
        grid-template-columns: 1fr;
        gap: 0.5rem;
      }

      .month-label,
      .month-stats {
        text-align: center;
      }
    }
  `]
})
export class ServiceProviderOverviewComponent implements OnInit, OnDestroy {
  // Basic properties
  userData: any;
  profile: any;
  businessName: string | null = null;
  loading = true;
  unreadMessages = 0;

  // Job-related properties
  upcomingJobsCount = 0;
  totalScheduledCount = 0;
  todaysJobsCount = 0;
  upcomingJobs: ScheduledJob[] = [];
  completedJobs: CompletedJob[] = [];
  todaysEvents: CalendarEvent[] = [];

  // Table columns
  upcomingJobsColumns = ['vehicle', 'service', 'date', 'location', 'priority', 'actions'];
  completedJobsColumns = ['vehicle', 'service', 'completed', 'cost', 'rating'];
  trackingRequestsColumns = ['vehicle', 'owner', 'location', 'budget', 'actions'];
  roadsideRequestsColumns = ['vehicle', 'requester', 'service', 'location', 'priority', 'actions'];

  // Service requests
  trackingRequests: TrackingDeviceRequest[] = [];
  roadsideRequests: RoadsideAssistanceRequest[] = [];
  newRequestsCount = 0;

  // Financial data
  financialSummary: FinancialSummary | null = null;

  // Calendar properties
  selectedDate: Date | null = null;

  get offersTrackingServices(): boolean {
    return this.profile?.serviceTypes?.toLowerCase().includes('tracking') || false;
  }

  get offersRoadsideServices(): boolean {
    return this.profile?.serviceTypes?.toLowerCase().includes('roadside') || 
           this.profile?.serviceTypes?.toLowerCase().includes('towing') || false;
  }
  calendarEvents: CalendarEvent[] = [];

  // Subscriptions
  private refreshSubscription?: Subscription;

  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar,
    private messagingService: MessagingService,
    private trackingDeviceService: TrackingDeviceService,
    private roadsideAssistanceService: RoadsideAssistanceService
  ) {}

  ngOnInit() {
    this.loadUserData();
    this.loadProfile();
  }

  ngOnDestroy() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadUserData() {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      this.userData = JSON.parse(userStr);
      this.businessName = this.userData.businessName || this.userData.email;
    }
  }

  loadProfile() {
    if (!this.userData?.userId && !this.userData?.id) return;

    const userId = this.userData.userId || this.userData.id;
    const profileUrl = `${environment.apiUrl}/ServiceProviderProfiles/user/${userId}`;

    this.http.get<any>(profileUrl).subscribe({
      next: (profile) => {
        this.profile = profile;
        // Now load dashboard data and service requests
        this.loadDashboardData();
        this.loadServiceRequests();
        this.loadUnreadMessages();

        // Auto-refresh every 5 minutes
        this.refreshSubscription = interval(300000).subscribe(() => {
          this.loadDashboardData();
          if (this.profile) {
            this.loadServiceRequests();
          }
          this.loadUnreadMessages();
        });
      },
      error: (error) => {
        console.error('Error loading profile:', error);
        this.loading = false;
      }
    });
  }

  loadDashboardData() {
    if (!this.userData?.userId && !this.userData?.id) return;

    const userId = this.userData.userId || this.userData.id;

    // Load main dashboard data
    this.http.get<any>(`${environment.apiUrl}/ServiceProviderDashboard/user/${userId}`)
      .subscribe({
        next: (data) => {
          this.processDashboardData(data);
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading dashboard data:', error);
          this.loading = false;
        }
      });

    // Load scheduled alerts
    this.http.get<any>(`${environment.apiUrl}/ServiceProviderDashboard/user/${userId}/scheduled-alerts`)
      .subscribe({
        next: (alerts) => {
          this.upcomingJobsCount = alerts.upcomingJobsCount || 0;
          this.totalScheduledCount = alerts.totalScheduledCount || 0;
          this.upcomingJobs = alerts.upcomingJobs || [];
          this.calculateTodaysJobs();
          this.generateCalendarEvents();
        },
        error: (error) => console.error('Error loading scheduled alerts:', error)
      });
  }

  processDashboardData(data: any) {
    // Process upcoming appointments
    this.upcomingJobs = (data.upcomingAppointments?.appointments || []).map((apt: any) => ({
      ...apt,
      state: 'Scheduled'
    }));

    // Process completed jobs
    this.completedJobs = (data.recentMaintenance?.records || []).map((job: any) => ({
      ...job,
      completedDate: new Date(job.completedDate),
      maintenanceDate: new Date(job.maintenanceDate)
    }));

    // Process financial data
    this.financialSummary = data.financial || {
      totalRevenue: 0,
      last30DaysRevenue: 0,
      last60DaysRevenue: 0,
      revenueGrowth: 0,
      totalJobsCompleted: 0,
      averageJobValue: 0,
      monthlyRevenue: []
    };

    this.calculateTodaysJobs();
    this.generateCalendarEvents();
  }

  calculateTodaysJobs() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    this.todaysJobsCount = this.upcomingJobs.filter(job => {
      const jobDate = new Date(job.scheduledDate);
      jobDate.setHours(0, 0, 0, 0);
      return jobDate.getTime() === today.getTime();
    }).length;
  }

  loadServiceRequests() {
    // Only load if profile is available
    if (!this.profile?.serviceTypes) {
      console.log('Profile not loaded yet, skipping service requests load');
      return;
    }

    // Load tracking device requests only if provider offers tracking services
    const serviceTypes = this.profile.serviceTypes.toLowerCase();
    if (serviceTypes.includes('tracking device installation') || serviceTypes.includes('tracking')) {
      console.log('Loading tracking requests for service provider');
      this.trackingDeviceService.getMarketplaceRequests().subscribe({
        next: (requests) => {
          this.trackingRequests = requests.filter(r => r.status === 'Open');
          this.updateNewRequestsCount();
        },
        error: (error) => console.error('Error loading tracking requests:', error)
      });
    } else {
      console.log('Service provider does not offer tracking services, skipping tracking requests');
      // Clear tracking requests if provider doesn't offer tracking services
      this.trackingRequests = [];
      this.updateNewRequestsCount();
    }

    // Load roadside assistance requests
    this.roadsideAssistanceService.getPendingRequests().subscribe({
      next: (requests) => {
        this.roadsideRequests = requests.filter(r => r.status === 'Pending');
        this.updateNewRequestsCount();
      },
      error: (error) => console.error('Error loading roadside requests:', error)
    });
  }

  updateNewRequestsCount() {
    this.newRequestsCount = this.trackingRequests.length + this.roadsideRequests.length;
  }

  loadUnreadMessages() {
    if (this.userData?.id || this.userData?.userId) {
      const userId = this.userData.id || this.userData.userId;
      this.messagingService.getUnreadCount(userId).subscribe({
        next: (count) => this.unreadMessages = count,
        error: (error) => console.error('Error loading unread messages:', error)
      });
    }
  }

  generateCalendarEvents() {
    this.calendarEvents = [];

    // Add job events
    this.upcomingJobs.forEach(job => {
      this.calendarEvents.push({
        id: `job-${job.id}`,
        title: `${job.category} - ${job.vehicleRegistration}`,
        date: new Date(job.scheduledDate),
        type: 'job',
        status: job.state,
        vehicleRegistration: job.vehicleRegistration,
        description: job.description
      });
    });

    // Add request events (for today/tomorrow)
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    [...this.trackingRequests, ...this.roadsideRequests].forEach(request => {
      const requestDate = new Date((request as any).createdAt || today);
      if (requestDate >= today && requestDate <= tomorrow) {
        this.calendarEvents.push({
          id: `request-${(request as any).id}`,
          title: (request as any).assistanceType || 'Tracking Request',
          date: requestDate,
          type: 'request',
          status: (request as any).status,
          description: (request as any).issueDescription || (request as any).deviceFeatures
        });
      }
    });

    this.updateTodaysEvents();
  }

  updateTodaysEvents() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    this.todaysEvents = this.calendarEvents.filter(event => {
      const eventDate = new Date(event.date);
      eventDate.setHours(0, 0, 0, 0);
      return eventDate.getTime() === today.getTime();
    });
  }

  // Event handlers
  onDateSelected(date: Date | null) {
    this.selectedDate = date;
    // Could navigate to day view or show details
  }

  dateClass = (date: Date): string => {
    const dateStr = date.toDateString();
    const hasEvents = this.calendarEvents.some(event =>
      event.date.toDateString() === dateStr
    );
    return hasEvents ? 'has-events' : '';
  };

  // Action methods
  viewJobDetails(job: ScheduledJob) {
    // Navigate to job details or open dialog
    this.snackBar.open('Job details view coming soon', 'Close', { duration: 2000 });
  }

  markJobComplete(job: ScheduledJob) {
    // Mark job as complete
    this.snackBar.open('Mark complete functionality coming soon', 'Close', { duration: 2000 });
  }

  viewRequestDetails(request: any) {
    // Navigate to appropriate detail view based on request type
    if (request.vehicleRegistration) {
      // This is a tracking device request
      this.router.navigate(['/service-provider-dashboard/marketplace'], {
        queryParams: { requestId: request.id }
      });
    } else if (request.serviceType && request.serviceType.toLowerCase().includes('roadside')) {
      // This is a roadside assistance request
      this.router.navigate(['/service-provider-dashboard/roadside-assistance'], {
        queryParams: { requestId: request.id }
      });
    } else {
      // Default to service requests page
      this.router.navigate(['/service-provider-dashboard/service-requests'], {
        queryParams: { requestId: request.id }
      });
    }
  }

  submitOffer(request: TrackingDeviceRequest) {
    // Navigate to offer submission
    this.router.navigate(['/service-provider-dashboard/marketplace']);
  }

  acceptRequest(request: RoadsideAssistanceRequest) {
    // Show confirmation dialog
    const confirmed = confirm(`Accept this roadside assistance request?\n\nVehicle: ${request.vehicleRegistration || 'N/A'}\nLocation: ${request.location}\nIssue: ${request.issueDescription}\n\nYou will be assigned as the service provider.`);
    
    if (confirmed) {
      // Use default values for quick acceptance from overview
      const assignment = {
        requestId: request.id,
        technicianName: this.profile?.businessName || 'Service Team',
        estimatedArrivalTime: '30-45 minutes',
        estimatedCost: undefined // Will be determined later
      };

      this.roadsideAssistanceService.assignRequest(assignment).subscribe({
        next: () => {
          this.snackBar.open('✓ Request accepted! Customer has been notified.', 'Close', { 
            duration: 5000,
            panelClass: 'success-snackbar'
          });
          // Refresh the requests data
          this.loadServiceRequests();
        },
        error: (error) => {
          if (error.status === 400 && error.error?.message?.includes('no longer available')) {
            this.snackBar.open('⚠ Sorry, another service provider already accepted this request!', 'Close', { 
              duration: 5000,
              panelClass: 'warning-snackbar'
            });
            // Refresh to remove the accepted request
            this.loadServiceRequests();
          } else {
            this.snackBar.open('Failed to accept request. Please try again.', 'Close', { duration: 3000 });
          }
        }
      });
    }
  }

  navigateToMessages() {
    this.router.navigate(['/service-provider-dashboard/messages']);
  }

  scrollToSection(sectionId: string) {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  // Utility methods
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return 'Today at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Tomorrow at ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays < 7) {
      return `In ${diffDays} days`;
    } else {
      return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }
  }

  getPriorityColor(priority?: string): string {
    switch (priority?.toLowerCase()) {
      case 'high': return 'warn';
      case 'urgent': return 'warn';
      case 'low': return 'primary';
      default: return 'accent';
    }
  }

  getEventIcon(type: string): string {
    switch (type) {
      case 'job': return 'build';
      case 'request': return 'notifications';
      case 'appointment': return 'event';
      default: return 'event';
    }
  }

  getMonthName(month: number): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                   'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1] || '';
  }

  getBarWidth(revenue: number): number {
    if (!this.financialSummary?.monthlyRevenue?.length) return 0;

    const maxRevenue = Math.max(...this.financialSummary.monthlyRevenue.map(m => m.revenue));
    return maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
  }
}
