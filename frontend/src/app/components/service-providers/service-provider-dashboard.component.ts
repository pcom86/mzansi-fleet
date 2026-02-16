import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDividerModule } from '@angular/material/divider';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../services/auth.service';
import { MessagingService } from '../../services/messaging.service';
import { TrackingDeviceService } from '../../services/tracking-device.service';
import { RoadsideAssistanceService } from '../../services/roadside-assistance.service';
import { MzansiFleetLogoComponent } from '../shared/mzansi-fleet-logo.component';

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

interface MaintenanceJob {
  id: string;
  vehicleId: string;
  vehicleRegistration: string;
  issueDescription: string;
  requestedDate: Date;
  scheduledDate?: Date;
  status: string;
  priority: string;
  estimatedCost?: number;
}

interface ScheduledAppointment {
  id: string;
  vehicleId: string;
  vehicleRegistration: string;
  scheduledDate: Date;
  category: string;
  description: string;
  location: string;
  priority: string;
  scheduledBy: string;
  timeSlot?: string;
}

interface CompletedMaintenance {
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
  mileageAtMaintenance: number;
  ownerName?: string;
  rating?: number;
}

interface MonthlyRevenue {
  year: number;
  month: number;
  revenue: number;
  jobCount: number;
}

interface FinancialData {
  totalRevenue: number;
  last30DaysRevenue: number;
  last60DaysRevenue: number;
  revenueGrowth: number;
  totalJobsCompleted: number;
  averageJobValue: number;
  monthlyRevenue: MonthlyRevenue[];
}

interface ServiceProviderProfile {
  id: string;
  businessName: string;
  serviceTypes: string;
  isAvailable: boolean;
  isActive: boolean;
  rating?: number;
  totalJobs: number;
  completedJobs: number;
}

interface CalendarDay {
  date: Date;
  isToday: boolean;
  isCurrentMonth: boolean;
  hasBookings: boolean;
  bookingCount: number;
  availableSlots: number;
  appointments: ScheduledAppointment[];
}

interface TimeSlot {
  time: string;
  isBooked: boolean;
  appointment?: ScheduledAppointment;
}

interface Review {
  id: string;
  vehicleRegistration: string;
  rating: number;
  comment: string;
  reviewDate: Date;
  reviewerName: string;
  jobType: string;
}

@Component({
  selector: 'app-service-provider-dashboard',
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
    MatSlideToggleModule,
    MatSnackBarModule,
    MatTabsModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatBadgeModule,
    MatTooltipModule,
    MatDialogModule,
    MatListModule,
    MatMenuModule,
    MatSidenavModule,
    MatToolbarModule,
    MatDividerModule,
    MzansiFleetLogoComponent
  ],
  template: `
    <div class="dashboard-wrapper">
      <!-- Sidebar Navigation -->
      <aside class="sidebar" [class.collapsed]="sidebarCollapsed">
        <div class="sidebar-header">
          <div class="logo-section">
            <app-mzansi-fleet-logo class="mzansi-logo"></app-mzansi-fleet-logo>
            <div class="header-text" *ngIf="!sidebarCollapsed">
              <h2>{{ profile?.businessName || 'Service Provider' }}</h2>
              <p class="admin-badge">Provider Portal</p>
            </div>
          </div>
          <button mat-icon-button class="collapse-btn" (click)="toggleSidebar()">
            <mat-icon>{{ sidebarCollapsed ? 'menu_open' : 'menu' }}</mat-icon>
          </button>
        </div>
        
        <nav class="sidebar-nav">
          <div class="nav-section">
            <p class="section-label" *ngIf="!sidebarCollapsed">Dashboard</p>
            <a class="nav-item" 
               *ngFor="let item of menuItems" 
               [routerLink]="item.route"
               routerLinkActive="active"
               [routerLinkActiveOptions]="{exact: item.route === '/service-provider-dashboard/overview'}"
               [title]="item.title"
               (click)="onMenuItemClick()">
              <mat-icon [matBadge]="item.badge || null" [matBadgeHidden]="!item.badge" matBadgeColor="warn" matBadgeSize="small" aria-hidden="false">{{ item.icon }}</mat-icon>
              <span *ngIf="!sidebarCollapsed">{{ item.title }}</span>
              <mat-icon class="nav-arrow" *ngIf="!sidebarCollapsed">chevron_right</mat-icon>
            </a>
          </div>

          <div class="nav-section">
            <p class="section-label" *ngIf="!sidebarCollapsed">Account</p>
            <a class="nav-item clickable" (click)="navigateTo('/service-providers')" title="Profile">
              <mat-icon>person</mat-icon>
              <span *ngIf="!sidebarCollapsed">Profile</span>
            </a>
            <a class="nav-item clickable" (click)="navigateTo('/service-provider-dashboard/settings')" title="Settings">
              <mat-icon>settings</mat-icon>
              <span *ngIf="!sidebarCollapsed">Settings</span>
            </a>
            <a class="nav-item logout-item clickable" (click)="logout()" title="Logout">
              <mat-icon>logout</mat-icon>
              <span *ngIf="!sidebarCollapsed">Logout</span>
            </a>
          </div>
        </nav>
      </aside>

      <!-- Main Content Area -->
      <main class="main-content" [class.expanded]="sidebarCollapsed">
        <header class="top-bar">
          <div class="left-section">
            <button class="menu-toggle" (click)="toggleSidebar()">
              <mat-icon>menu</mat-icon>
            </button>
            <div class="breadcrumb">
              <mat-icon>build_circle</mat-icon>
              <span>{{ profile?.businessName || 'Service Provider Dashboard' }}</span>
            </div>
          </div>

          <div class="center-section">
            <!-- Availability Toggle with better styling -->
            <button 
              class="quick-action-btn availability-btn"
              [class.available]="profile.isAvailable"
              (click)="toggleAvailability()"
              *ngIf="profile">
              <mat-icon>{{ profile.isAvailable ? 'check_circle' : 'cancel' }}</mat-icon>
              <span class="action-label">{{ profile.isAvailable ? 'Available' : 'Unavailable' }}</span>
            </button>
          </div>

          <div class="right-section">
            <button class="notifications-btn" (click)="navigateToMessages()" title="Messages">
              <mat-icon [matBadge]="unreadMessages > 0 ? unreadMessages.toString() : null" [matBadgeHidden]="unreadMessages === 0" matBadgeColor="warn" matBadgeSize="small">mail</mat-icon>
            </button>

            <button class="profile-btn" [matMenuTriggerFor]="profileMenu">
              <mat-icon>account_circle</mat-icon>
              <span class="profile-name" *ngIf="userData">{{ userData.fullName || userData.email }}</span>
              <mat-icon class="dropdown-arrow">expand_more</mat-icon>
            </button>

            <mat-menu #profileMenu="matMenu" class="profile-dropdown">
              <div class="profile-header">
                <mat-icon class="profile-avatar">account_circle</mat-icon>
                <div class="profile-info">
                  <p class="profile-name-text">{{ userData?.fullName || userData?.email }}</p>
                  <p class="profile-role">Service Provider</p>
                </div>
              </div>
              <mat-divider></mat-divider>
              <button mat-menu-item (click)="navigateTo('/service-providers')">
                <mat-icon>person</mat-icon>
                <span>My Profile</span>
              </button>
              <button mat-menu-item (click)="navigateTo('/service-provider-dashboard/settings')">
                <mat-icon>settings</mat-icon>
                <span>Settings</span>
              </button>
              <mat-divider></mat-divider>
              <button mat-menu-item (click)="logout()" class="logout-menu-item">
                <mat-icon>logout</mat-icon>
                <span>Logout</span>
              </button>
            </mat-menu>
          </div>
        </header>

        <!-- Main Content -->
        <div class="content-wrapper">
          <router-outlet></router-outlet>
        </div>
      </main>
    </div>
  `,
  styles: [`
    /* Dashboard Wrapper */
    .dashboard-wrapper {
      display: flex;
      min-height: 100vh;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    }

    /* Sidebar Styles */
    .sidebar {
      width: 280px;
      background: linear-gradient(180deg, #ffffff 0%, #f8f9fa 100%);
      color: #212529;
      display: flex;
      flex-direction: column;
      transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 4px 0 24px rgba(0, 0, 0, 0.08);
      position: fixed;
      top: 0;
      left: 0;
      height: 100vh;
      z-index: 100;
      border-right: 1px solid rgba(0, 0, 0, 0.06);
    }

    .sidebar.collapsed {
      width: 72px;
    }

    .sidebar.collapsed .header-text,
    .sidebar.collapsed .section-label,
    .sidebar.collapsed .nav-item span,
    .sidebar.collapsed .nav-arrow {
      display: none;
    }

    .sidebar-header {
      padding: 1.25rem 1rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 1px solid rgba(0, 0, 0, 0.08);
      background: linear-gradient(135deg, #ffffff, #f8f9fa);
      min-height: 80px;
    }

    .logo-section {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex: 1;
      min-width: 0;
    }

    .mzansi-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 48px;
      height: 48px;
    }

    .header-text {
      flex: 1;
      min-width: 0;
    }

    .header-text h2 {
      margin: 0;
      font-size: 1.05rem;
      font-weight: 700;
      color: #212529;
      line-height: 1.3;
      letter-spacing: -0.3px;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .admin-badge {
      margin: 0.25rem 0 0;
      font-size: 0.65rem;
      color: #667eea;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
      line-height: 1;
    }

    .collapse-btn {
      color: #495057;
      transition: all 0.2s ease;
    }

    .collapse-btn:hover {
      background: rgba(0, 0, 0, 0.05);
      transform: scale(1.1);
    }

    /* Sidebar Navigation */
    .sidebar-nav {
      flex: 1;
      overflow-y: auto;
      padding: 1rem 0;
    }

    .nav-section {
      margin-bottom: 1.5rem;
    }

    .section-label {
      font-size: 0.7rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #6c757d;
      padding: 0.75rem 1.5rem 0.5rem;
      margin: 0;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 0.875rem;
      padding: 0.875rem 1.5rem;
      margin: 0.25rem 1rem;
      color: #495057;
      text-decoration: none;
      border-radius: 10px;
      transition: all 0.25s ease;
      cursor: pointer;
      font-weight: 500;
      font-size: 0.9rem;
      border-left: 3px solid transparent;
    }

    .nav-item mat-icon:first-of-type {
      font-size: 22px;
      width: 22px;
      height: 22px;
      color: #6c757d;
    }

    .nav-item:hover {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.08), rgba(118, 75, 162, 0.08));
      color: #667eea;
    }

    .nav-item.active {
      background: linear-gradient(135deg, rgba(102, 126, 234, 0.15), rgba(118, 75, 162, 0.15));
      color: #667eea;
      border-left-color: #667eea;
      font-weight: 600;
    }

    .nav-item.logout-item {
      color: #dc3545;
      margin-top: 0.5rem;
    }

    .nav-item.logout-item mat-icon {
      color: #dc3545;
    }

    /* Main Content Area */
    .main-content {
      flex: 1;
      display: flex;
      flex-direction: column;
      margin-left: 280px;
      transition: margin-left 0.3s ease;
      min-height: 100vh;
    }

    .main-content.expanded {
      margin-left: 72px;
    }

    /* Top Bar */
    .top-bar {
      background: white;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
      z-index: 50;
      position: sticky;
      top: 0;
    }

    .left-section {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .menu-toggle {
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 8px;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 600;
      color: #495057;
    }

    .center-section {
      flex: 1;
      display: flex;
      justify-content: center;
    }

    .availability-toggle {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .right-section {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .profile-btn {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      transition: background 0.2s ease;
    }

    .profile-btn:hover {
      background: rgba(0, 0, 0, 0.05);
    }

    .profile-name {
      font-weight: 500;
      font-size: 0.9rem;
    }

    .profile-dropdown .profile-header {
      padding: 1rem;
      display: flex;
      gap: 1rem;
      align-items: center;
      background: linear-gradient(135deg, #667eea, #764ba2);
      color: white;
    }

    .profile-dropdown .profile-avatar {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }

    .profile-dropdown .profile-name-text {
      margin: 0;
      font-weight: 600;
      font-size: 1rem;
    }

    .profile-dropdown .profile-role {
      margin: 0.25rem 0 0;
      font-size: 0.85rem;
      opacity: 0.9;
    }

    .profile-dropdown .logout-menu-item {
      color: #dc3545;
    }

    .profile-dropdown .logout-menu-item mat-icon {
      color: #dc3545;
    }

    /* Content Wrapper */
    .content-wrapper {
      flex: 1;
      padding: 2rem;
      background: #f5f7fa;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 80px;
    }

    /* Appointment Alerts */
    .appointment-alerts {
      margin-bottom: 24px;
    }

    .alert {
      display: flex;
      align-items: center;
      gap: 20px;
      padding: 20px 24px;
      border-radius: 12px;
      margin-bottom: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .alert-urgent {
      background: linear-gradient(135deg, #ff6b6b 0%, #ee5a6f 100%);
      color: white;
      border-left: 6px solid #c92a2a;
    }

    .alert-warning {
      background: linear-gradient(135deg, #ffd93d 0%, #ffb700 100%);
      color: #1a1a1a;
      border-left: 6px solid #f59f00;
    }

    .alert-info {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-left: 6px solid #4c63d2;
    }

    .alert mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }

    .alert-content {
      flex: 1;
    }

    .alert-content h3 {
      margin: 0 0 4px 0;
      font-size: 18px;
      font-weight: 700;
    }

    .alert-content p {
      margin: 0;
      font-size: 14px;
      opacity: 0.95;
    }

    .alert-urgent .alert-content p strong {
      font-weight: 700;
      text-decoration: underline;
    }

    .alert-warning .alert-content p strong {
      font-weight: 700;
    }

    .alert button {
      min-width: 140px;
    }

    .alert-urgent button {
      background: white;
      color: #c92a2a;
    }

    .alert-urgent button:hover {
      background: #f8f9fa;
    }

    .dashboard-content {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .stat-card {
      padding: 24px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 20px;
      transition: transform 0.2s, box-shadow 0.2s;
      cursor: pointer;
    }

    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.12);
    }

    .stat-card.revenue {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .stat-card.jobs {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
    }

    .stat-card.rating {
      background: linear-gradient(135deg, #ffa726 0%, #fb8c00 100%);
      color: white;
    }

    .stat-card.appointments {
      background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
      color: white;
    }

    .stat-card mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      opacity: 0.9;
    }

    .stat-content h3 {
      margin: 0 0 4px 0;
      font-size: 32px;
      font-weight: 700;
    }

    .stat-content p {
      margin: 0;
      font-size: 14px;
      opacity: 0.9;
    }

    .rating-stars {
      display: flex;
      gap: 2px;
      margin-top: 4px;
    }

    .rating-stars mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .rating-stars mat-icon.filled {
      color: #ffd700;
    }

    /* Marketplace Section */
    .marketplace-section {
      display: flex;
      flex-direction: column;
      gap: 24px;
    }

    .marketplace-card {
      border-radius: 12px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    }

    .marketplace-card mat-card-header {
      position: relative;
    }

    .marketplace-card mat-card-header button {
      position: absolute;
      right: 0;
      top: 50%;
      transform: translateY(-50%);
    }

    .requests-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 20px;
      margin-top: 16px;
    }

    .request-card {
      border: 1px solid #e0e0e0;
      border-radius: 12px;
      padding: 20px;
      background: white;
      transition: all 0.3s ease;
    }

    .request-card:hover {
      box-shadow: 0 6px 20px rgba(0,0,0,0.1);
      transform: translateY(-2px);
    }

    .request-card.priority-emergency {
      border-left: 4px solid #d32f2f;
      background: linear-gradient(135deg, #fff5f5 0%, #ffffff 100%);
    }

    .request-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .vehicle-badge {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .vehicle-badge mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #667eea;
    }

    .vehicle-badge h4 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .vehicle-badge p {
      margin: 4px 0 0 0;
      font-size: 13px;
      color: #666;
    }

    .status-chip {
      font-size: 12px;
      height: 24px;
      background: #e3f2fd;
      color: #1976d2;
    }

    .request-body {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 16px;
    }

    .info-item {
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      color: #666;
    }

    .info-item mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #999;
    }

    .request-details {
      padding: 12px;
      background: #f5f7fa;
      border-radius: 8px;
      margin-bottom: 16px;
    }

    .request-details p {
      margin: 0;
      font-size: 14px;
      color: #333;
      line-height: 1.5;
    }

    .request-details strong {
      color: #667eea;
    }

    .request-actions {
      display: flex;
      gap: 10px;
    }

    .request-actions button {
      flex: 1;
    }

    .view-all-footer {
      margin-top: 16px;
      text-align: center;
      padding-top: 16px;
      border-top: 1px solid #e0e0e0;
    }

    .priority-high {
      background: #ffe0b2;
      color: #e65100;
    }

    .priority-emergency {
      background: #ffcdd2;
      color: #c62828;
      font-weight: 600;
    }

    .priority-normal {
      background: #e0e0e0;
      color: #616161;
    }

    /* Main Grid */
    .main-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
    }

    /* Calendar Section */
    .calendar-section {
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .calendar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding: 16px;
      background: #f5f7fa;
      border-radius: 8px;
    }

    .calendar-header h2 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
    }

    .calendar-grid {
      margin-bottom: 20px;
    }

    .calendar-weekdays {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
      margin-bottom: 8px;
    }

    .weekday {
      text-align: center;
      font-size: 12px;
      font-weight: 600;
      color: #666;
      padding: 8px;
    }

    .calendar-days {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 4px;
    }

    .calendar-day {
      aspect-ratio: 1;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 8px;
      cursor: pointer;
      transition: all 0.2s;
      background: white;
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
    }

    .calendar-day:hover {
      border-color: #667eea;
      background: #f5f7fa;
    }

    .calendar-day.today {
      border-color: #667eea;
      background: #e8eaf6;
      font-weight: 600;
    }

    .calendar-day.other-month {
      opacity: 0.3;
    }

    .calendar-day.has-bookings {
      background: #fff3e0;
      border-color: #ff9800;
    }

    .day-number {
      font-size: 14px;
      font-weight: 500;
    }

    .day-indicators {
      margin-top: 4px;
    }

    .booking-dot {
      font-size: 8px;
      width: 8px;
      height: 8px;
      color: #ff9800;
    }

    /* Selected Date Details */
    .selected-date-details {
      padding: 20px;
      background: #f5f7fa;
      border-radius: 8px;
      margin-top: 20px;
    }

    .selected-date-details h3 {
      margin: 0 0 16px 0;
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .no-appointments {
      text-align: center;
      padding: 40px;
      color: #999;
    }

    .no-appointments mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      opacity: 0.3;
      margin-bottom: 8px;
    }

    .date-appointments {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .appointment-card {
      background: white;
      border-radius: 8px;
      padding: 16px;
      display: flex;
      gap: 16px;
      border-left: 4px solid #667eea;
      transition: box-shadow 0.2s;
    }

    .appointment-card:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .apt-time {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      color: #667eea;
      font-weight: 600;
      font-size: 14px;
    }

    .apt-time mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .apt-details {
      flex: 1;
    }

    .apt-details h4 {
      margin: 0 0 4px 0;
      font-size: 16px;
      color: #1a1a1a;
    }

    .apt-details p {
      margin: 4px 0;
      font-size: 14px;
      color: #666;
    }

    .apt-details mat-chip {
      margin-top: 8px;
    }

    /* History Section */
    .history-section {
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .history-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
      max-height: 600px;
      overflow-y: auto;
    }

    .history-item {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      background: white;
      transition: box-shadow 0.2s;
    }

    .history-item:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .history-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 16px;
    }

    .vehicle-info {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .vehicle-info mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: #667eea;
    }

    .vehicle-info h4 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
    }

    .vehicle-info p {
      margin: 0;
      font-size: 14px;
      color: #666;
    }

    .history-cost {
      text-align: right;
    }

    .history-cost .amount {
      font-size: 20px;
      font-weight: 700;
      color: #4caf50;
      display: block;
    }

    .history-cost .date {
      font-size: 12px;
      color: #999;
      display: block;
      margin-top: 4px;
    }

    .history-details {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      margin: 12px 0;
      padding: 12px;
      background: #f5f7fa;
      border-radius: 6px;
    }

    .detail-row {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      color: #666;
    }

    .detail-row mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #667eea;
    }

    .history-description {
      margin: 12px 0 0 0;
      font-size: 14px;
      color: #666;
      line-height: 1.5;
    }

    .history-rating {
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid #e0e0e0;
    }

    .rating-display {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .rating-display mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #ffd700;
    }

    .rating-display mat-icon.filled {
      color: #ffd700;
    }

    .rating-display span {
      font-size: 14px;
      color: #666;
    }

    /* Reviews Section */
    .reviews-section {
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .rating-summary {
      display: grid;
      grid-template-columns: auto 1fr;
      gap: 40px;
      padding: 24px;
      background: #f5f7fa;
      border-radius: 8px;
      margin-bottom: 24px;
    }

    .overall-rating {
      text-align: center;
      padding: 20px;
    }

    .overall-rating h2 {
      margin: 0 0 8px 0;
      font-size: 48px;
      font-weight: 700;
      color: #1a1a1a;
    }

    .stars-large {
      display: flex;
      justify-content: center;
      gap: 4px;
      margin-bottom: 8px;
    }

    .stars-large mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
      color: #ffd700;
    }

    .stars-large mat-icon.filled {
      color: #ffd700;
    }

    .overall-rating p {
      margin: 0;
      font-size: 13px;
      color: #666;
    }

    .rating-breakdown {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .rating-bar {
      display: grid;
      grid-template-columns: 60px 1fr 60px;
      gap: 12px;
      align-items: center;
    }

    .rating-label {
      display: flex;
      align-items: center;
      gap: 4px;
      font-size: 14px;
      font-weight: 500;
    }

    .rating-label mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #ffd700;
    }

    .bar {
      height: 8px;
      background: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
    }

    .bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #ffd700 0%, #ffa726 100%);
      border-radius: 4px;
      transition: width 0.3s ease;
    }

    .rating-count {
      text-align: right;
      font-size: 14px;
      color: #666;
    }

    .reviews-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .review-item {
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      padding: 20px;
      background: white;
      transition: box-shadow 0.2s;
    }

    .review-item:hover {
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
    }

    .review-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 12px;
    }

    .reviewer-info {
      display: flex;
      gap: 12px;
      align-items: center;
    }

    .reviewer-info mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: #667eea;
    }

    .reviewer-info h4 {
      margin: 0 0 4px 0;
      font-size: 16px;
      font-weight: 600;
    }

    .reviewer-info p {
      margin: 0;
      font-size: 13px;
      color: #666;
    }

    .review-rating {
      display: flex;
      gap: 2px;
    }

    .review-rating mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #ffd700;
    }

    .review-rating mat-icon.filled {
      color: #ffd700;
    }

    .review-comment {
      margin: 12px 0;
      font-size: 14px;
      line-height: 1.6;
      color: #333;
    }

    .review-date {
      margin: 0;
      font-size: 12px;
      color: #999;
    }

    /* Availability Card */
    .availability-card {
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
    }

    .availability-toggle {
      text-align: center;
      padding: 20px;
    }

    .availability-toggle mat-slide-toggle {
      font-size: 16px;
      font-weight: 500;
    }

    .availability-toggle mat-icon {
      vertical-align: middle;
      margin-right: 8px;
    }

    .availability-hint {
      margin: 12px 0 0 0;
      font-size: 14px;
      color: #666;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #999;
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      opacity: 0.3;
      margin-bottom: 16px;
    }

    .empty-state p {
      margin: 8px 0;
      font-size: 16px;
    }

    .empty-hint {
      font-size: 14px;
      color: #bbb;
    }

    /* Priority Chips */
    .priority-high {
      background-color: #f44336 !important;
      color: white !important;
    }

    .priority-medium {
      background-color: #ff9800 !important;
      color: white !important;
    }

    .priority-low {
      background-color: #4caf50 !important;
      color: white !important;
    }

    /* Appointments Detail Section */
    .appointments-detail {
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      margin-bottom: 24px;
      position: relative;
    }

    .appointments-detail .close-btn {
      position: absolute;
      top: 16px;
      right: 16px;
    }

    .appointments-detail mat-card-header {
      position: relative;
    }

    .filter-buttons {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }

    .filter-buttons button {
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      transition: all 0.3s;
    }

    .filter-buttons button.active {
      background: #667eea;
      color: white;
    }

    .filter-buttons button:not(.active) {
      background: #f5f7fa;
      color: #666;
    }

    .filter-buttons button:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.1);
    }

    /* Completed Jobs Detail Section */
    .completed-jobs-detail {
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      margin-bottom: 24px;
      position: relative;
    }

    .completed-jobs-detail .close-btn {
      position: absolute;
      top: 16px;
      right: 16px;
    }

    .completed-jobs-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .job-detail-card {
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      padding: 24px;
      background: white;
      transition: all 0.3s;
    }

    .job-detail-card:hover {
      border-color: #4caf50;
      box-shadow: 0 4px 16px rgba(76, 175, 80, 0.15);
    }

    .job-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 2px solid #f5f7fa;
    }

    .job-vehicle-badge {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
      color: white;
      border-radius: 8px;
    }

    .job-vehicle-badge mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .vehicle-info strong {
      display: block;
      font-size: 16px;
      font-weight: 600;
    }

    .vehicle-info span {
      display: block;
      font-size: 14px;
      opacity: 0.9;
    }

    .job-amount {
      text-align: right;
    }

    .job-amount .amount {
      display: block;
      font-size: 24px;
      font-weight: 700;
      color: #4caf50;
    }

    .job-amount .date {
      display: block;
      font-size: 13px;
      color: #999;
      margin-top: 4px;
    }

    .job-body {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
      margin-bottom: 20px;
    }

    .job-main-info .info-row {
      display: flex;
      align-items: flex-start;
      gap: 12px;
      margin: 12px 0;
      color: #666;
    }

    .job-main-info .info-row mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #4caf50;
      margin-top: 2px;
    }

    .job-main-info .info-row span {
      font-size: 14px;
      line-height: 1.5;
    }

    .job-meta {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      background: #f5f7fa;
      border-radius: 8px;
    }

    .job-meta .meta-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .job-meta .meta-item .label {
      font-size: 12px;
      font-weight: 600;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .job-meta .meta-item .value {
      font-size: 14px;
      color: #333;
      font-weight: 500;
    }

    .rating-display-mini {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .rating-display-mini mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      color: #e0e0e0;
    }

    .rating-display-mini mat-icon.filled {
      color: #ffd700;
    }

    .rating-display-mini .rating-value {
      font-size: 13px;
      color: #666;
      margin-left: 4px;
    }

    .job-actions {
      display: flex;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid #f5f7fa;
    }

    .job-actions button {
      flex: 1;
    }

    .job-actions button mat-icon {
      margin-right: 4px;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .appointments-detail-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .appointment-detail-card {
      border: 2px solid #e0e0e0;
      border-radius: 12px;
      padding: 24px;
      background: white;
      transition: all 0.3s;
    }

    .appointment-detail-card:hover {
      border-color: #667eea;
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.15);
    }

    .apt-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 16px;
      border-bottom: 2px solid #f5f7fa;
    }

    .apt-date-badge {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 12px 16px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 8px;
    }

    .apt-date-badge mat-icon {
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .date-info strong {
      display: block;
      font-size: 16px;
      font-weight: 600;
    }

    .date-info span {
      display: block;
      font-size: 14px;
      opacity: 0.9;
    }

    .apt-body {
      display: grid;
      grid-template-columns: 2fr 1fr;
      gap: 24px;
      margin-bottom: 20px;
    }

    .apt-main-info h3 {
      margin: 0 0 16px 0;
      font-size: 20px;
      font-weight: 600;
      color: #1a1a1a;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 12px;
      margin: 12px 0;
      color: #666;
    }

    .info-row mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #667eea;
    }

    .info-row span {
      font-size: 14px;
      line-height: 1.5;
    }

    .apt-meta {
      display: flex;
      flex-direction: column;
      gap: 12px;
      padding: 16px;
      background: #f5f7fa;
      border-radius: 8px;
    }

    .meta-item {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .meta-item .label {
      font-size: 12px;
      font-weight: 600;
      color: #999;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .meta-item .value {
      font-size: 14px;
      color: #333;
      font-weight: 500;
    }

    .apt-actions {
      display: flex;
      gap: 12px;
      padding-top: 16px;
      border-top: 1px solid #f5f7fa;
    }

    .apt-actions button {
      flex: 1;
    }

    .apt-actions button mat-icon {
      margin-right: 4px;
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    /* Responsive Design */
    @media (max-width: 1200px) {
      .main-grid {
        grid-template-columns: 1fr;
      }

      .rating-summary {
        grid-template-columns: 1fr;
        gap: 20px;
      }
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }

      .header-content {
        flex-direction: column;
        align-items: flex-start;
      }

      .header-actions {
        width: 100%;
        justify-content: space-between;
      }

      .calendar-days {
        gap: 2px;
      }

      .calendar-day {
        padding: 4px;
      }

      .day-number {
        font-size: 12px;
      }
    }

    /* Availability Button Styling */
    .availability-btn {
      &.available {
        background: linear-gradient(135deg, rgba(25, 135, 84, 0.1), rgba(32, 201, 151, 0.1)) !important;
        border-color: rgba(25, 135, 84, 0.3) !important;
        color: #198754 !important;

        &:hover {
          background: linear-gradient(135deg, rgba(25, 135, 84, 0.2), rgba(32, 201, 151, 0.2)) !important;
          box-shadow: 0 4px 12px rgba(25, 135, 84, 0.3) !important;
        }

        mat-icon {
          color: #198754 !important;
        }
      }
    }

    /* Menu Toggle Button */
    .menu-toggle {
      display: none;
      background: transparent;
      border: none;
      cursor: pointer;
      padding: 0.5rem;
      border-radius: 8px;
      transition: background 0.2s ease;

      mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
        color: #495057;
      }

      &:hover {
        background: rgba(0, 0, 0, 0.05);
      }
    }

    /* Responsive Design */
    @media (max-width: 1024px) {
      .center-section .quick-action-btn .action-label {
        display: none;
      }
    }

    @media (max-width: 768px) {
      .sidebar {
        position: fixed;
        left: -280px;
        top: 0;
        height: 100vh;
        z-index: 1000;
        transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      }

      .sidebar.collapsed {
        left: 0;
        width: 280px;
      }

      .main-content {
        margin-left: 0 !important;
      }

      .menu-toggle {
        display: block;
      }

      .breadcrumb span {
        font-size: 1rem;
      }

      .profile-btn .profile-name {
        display: none;
      }

      .content-wrapper {
        padding: 1rem;
      }
    }

    @media (max-width: 480px) {
      .top-bar {
        padding: 1rem;
      }

      .breadcrumb {
        font-size: 0.9rem;

        mat-icon {
          font-size: 20px;
          width: 20px;
          height: 20px;
        }
      }

      .right-section {
        gap: 0.5rem;
      }
    }
  `]
})
export class ServiceProviderDashboardComponent implements OnInit {
  userData: any;
  profile: ServiceProviderProfile | null = null;
  dashboardData: any = null;
  scheduledAppointments: ScheduledAppointment[] = [];
  completedMaintenance: CompletedMaintenance[] = [];
  financialData: FinancialData | null = null;
  loading = true;
  sidebarCollapsed = false;
  unreadMessages = 0;
  menuItems: any[] = [];
  
  // Marketplace requests
  trackingDeviceRequests: TrackingDeviceRequest[] = [];
  roadsideAssistanceRequests: RoadsideAssistanceRequest[] = [];
  newServiceRequests: any[] = [];
  loadingMarketplace = false;

  // Calendar properties
  currentDate = new Date();
  currentMonthDisplay = '';
  weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  calendarDays: CalendarDay[] = [];
  selectedDate: CalendarDay | null = null;

  // Appointments list toggle
  showAppointmentsList = false;
  appointmentsFilterMode: 'all' | 'today' | 'tomorrow' = 'all';
  todayAppointments: ScheduledAppointment[] = [];
  tomorrowAppointments: ScheduledAppointment[] = [];

  // Completed jobs list toggle
  showCompletedJobsList = false;

  // Reviews properties
  reviews: Review[] = [];
  ratingDistribution = [
    { stars: 5, count: 0, percentage: 0 },
    { stars: 4, count: 0, percentage: 0 },
    { stars: 3, count: 0, percentage: 0 },
    { stars: 2, count: 0, percentage: 0 },
    { stars: 1, count: 0, percentage: 0 }
  ];

  get filteredAppointments(): ScheduledAppointment[] {
    switch (this.appointmentsFilterMode) {
      case 'today':
        return this.todayAppointments;
      case 'tomorrow':
        return this.tomorrowAppointments;
      default:
        return this.scheduledAppointments;
    }
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    private snackBar: MatSnackBar,
    private authService: AuthService,
    private messagingService: MessagingService,
    private trackingDeviceService: TrackingDeviceService,
    private roadsideAssistanceService: RoadsideAssistanceService
  ) {}

  async ngOnInit(): Promise<void> {
    // Get user info from local storage
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
    }
    await this.loadDashboardData();
    this.loadMarketplaceRequests();
    this.loadNewServiceRequests();
    this.categorizeAppointments();
    this.generateCalendar();
    this.updateMonthDisplay();
    this.loadUnreadMessages();
  }

  loadMarketplaceRequests(): void {
    if (!this.profile || !this.profile.serviceTypes) return;

    const serviceTypes = this.profile.serviceTypes.toLowerCase();
    
    // Load tracking device requests if provider offers tracking services
    if (serviceTypes.includes('tracking device installation') || serviceTypes.includes('tracking')) {
      this.loadingMarketplace = true;
      this.trackingDeviceService.getMarketplaceRequests().subscribe({
        next: (requests) => {
          this.trackingDeviceRequests = requests.filter(r => r.status === 'Open');
          this.loadingMarketplace = false;
          this.updateMenuBadges();
        },
        error: (error) => {
          console.error('Error loading tracking device requests:', error);
          this.loadingMarketplace = false;
        }
      });
    }

    // Load roadside assistance requests if provider offers roadside/towing services
    if (serviceTypes.includes('roadside assistance') || serviceTypes.includes('towing')) {
      this.loadingMarketplace = true;
      this.roadsideAssistanceService.getPendingRequests().subscribe({
        next: (requests) => {
          this.roadsideAssistanceRequests = requests.filter(r => r.status === 'Pending');
          this.loadingMarketplace = false;
          this.updateMenuBadges();
        },
        error: (error) => {
          console.error('Error loading roadside assistance requests:', error);
          this.loadingMarketplace = false;
        }
      });
    }
  }

  updateMenuBadges(): void {
    this.menuItems = this.menuItems.map(item => {
      if (item.title === 'Marketplace') {
        return { ...item, badge: this.trackingDeviceRequests.length > 0 ? this.trackingDeviceRequests.length.toString() : null };
      }
      if (item.title === 'Roadside Requests') {
        return { ...item, badge: this.roadsideAssistanceRequests.length > 0 ? this.roadsideAssistanceRequests.length.toString() : null };
      }
      if (item.title === 'Service Requests') {
        return { ...item, badge: this.newServiceRequests.length > 0 ? this.newServiceRequests.length.toString() : null };
      }
      return item;
    });
  }

  loadNewServiceRequests(): void {
    if (!this.profile) return;

    // Combine all already loaded requests plus additional ones
    const allRequests: any[] = [];

    // Add already loaded tracking device requests
    allRequests.push(...this.trackingDeviceRequests);

    // Add already loaded roadside assistance requests
    allRequests.push(...this.roadsideAssistanceRequests);

    // Load mechanical requests
    this.http.get<any[]>(`${environment.apiUrl}/MechanicalRequests`)
      .toPromise()
      .then(reqs => {
        const mechanicalReqs = (reqs || []).filter(r => r.state !== 'Completed');
        allRequests.push(...mechanicalReqs);

        // Load stuff requests
        this.http.get<any[]>(`${environment.apiUrl}/StuffRequests`)
          .toPromise()
          .then(stuffReqs => {
            const pendingStuffReqs = (stuffReqs || []).filter(r => r.status === 'Pending');
            allRequests.push(...pendingStuffReqs);

            this.newServiceRequests = allRequests;
            this.updateMenuBadges();
          })
          .catch(error => {
            console.error('Error loading stuff requests:', error);
            this.newServiceRequests = allRequests;
            this.updateMenuBadges();
          });
      })
      .catch(error => {
        console.error('Error loading mechanical requests:', error);
        // Load stuff requests anyway
        this.http.get<any[]>(`${environment.apiUrl}/StuffRequests`)
          .toPromise()
          .then(stuffReqs => {
            const pendingStuffReqs = (stuffReqs || []).filter(r => r.status === 'Pending');
            allRequests.push(...pendingStuffReqs);
            this.newServiceRequests = allRequests;
            this.updateMenuBadges();
          })
          .catch(stuffError => {
            console.error('Error loading stuff requests:', stuffError);
            this.newServiceRequests = allRequests;
            this.updateMenuBadges();
          });
      });
  }

  loadMenuItems(): void {
    // Base menu items that always show
    const baseItems = [
      { title: 'Dashboard', icon: 'dashboard', route: '/service-provider-dashboard/overview', badge: null }
    ];

    // Service-specific menu items
    const serviceItems = [];

    // Check if provider offers services
    if (this.profile?.serviceTypes) {
      const serviceTypes = this.profile.serviceTypes.toLowerCase();
      
      // Removed Tracking Devices tab as requested

      if (serviceTypes.includes('roadside') || serviceTypes.includes('towing')) {
        serviceItems.push({ 
          title: 'Roadside Assistance', 
          icon: 'local_shipping', 
          route: '/service-provider-dashboard/roadside-assistance', 
          badge: null 
        });
      }
    }

    // Add Service Requests menu item for all service providers
    serviceItems.push({ 
      title: 'Service Requests', 
      icon: 'assignment', 
      route: '/service-provider-dashboard/service-requests', 
      badge: null 
    });

    // Profile edit always shows at the end
    const messagesItem = { 
      title: 'Messages', 
      icon: 'inbox', 
      route: '/service-provider-dashboard/messages', 
      badge: null 
    };

    const profileItem = { 
      title: 'Edit Profile', 
      icon: 'edit', 
      route: '/service-provider-dashboard/profile-edit', 
      badge: null 
    };

    this.menuItems = [...baseItems, ...serviceItems, messagesItem, profileItem];
  }

  toggleSidebar(): void {
    this.sidebarCollapsed = !this.sidebarCollapsed;
  }

  onMenuItemClick(): void {
    if (window.innerWidth < 768) {
      this.sidebarCollapsed = true;
    }
  }

  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  navigateToMessages(): void {
    this.router.navigate(['/service-provider-dashboard/messages']);
  }

  scrollToSection(section: string): void {
    const element = document.getElementById(section);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  loadUnreadMessages(): void {
    if (this.userData?.id || this.userData?.userId) {
      const userId = this.userData.id || this.userData.userId;
      this.messagingService.getUnreadCount(userId).subscribe({
        next: (count) => {
          this.unreadMessages = count;
        },
        error: (error) => console.error('Error loading unread messages:', error)
      });
    }
  }

  categorizeAppointments(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const dayAfterTomorrow = new Date(tomorrow);
    dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);

    this.todayAppointments = this.scheduledAppointments.filter(apt => {
      const aptDate = new Date(apt.scheduledDate);
      aptDate.setHours(0, 0, 0, 0);
      return aptDate.getTime() === today.getTime();
    });

    this.tomorrowAppointments = this.scheduledAppointments.filter(apt => {
      const aptDate = new Date(apt.scheduledDate);
      aptDate.setHours(0, 0, 0, 0);
      return aptDate.getTime() === tomorrow.getTime();
    });
  }

  async loadDashboardData(): Promise<void> {
    try {
      const userStr = localStorage.getItem('user');
      console.log('Service Provider Dashboard - Raw user data:', userStr);
      
      if (!userStr) {
        console.error('No user found in localStorage, redirecting to login');
        this.router.navigate(['/login']);
        return;
      }

      const user = JSON.parse(userStr);
      console.log('Service Provider Dashboard - Parsed user object:', user);
      
      // Try to get userId from different possible properties
      const userId = user.userId || user.id || user.UserId || user.Id;
      
      console.log('Service Provider userId extracted:', userId);

      if (!userId) {
        console.error('No userId found in user object. Available keys:', Object.keys(user));
        this.snackBar.open('User ID not found. Please log in again.', 'Close', { duration: 5000 });
        this.router.navigate(['/login']);
        return;
      }

      // Load profile
      console.log('Attempting to load service provider profile...');
      const profileUrl = `${environment.apiUrl}/ServiceProviderProfiles/user/${userId}`;
      console.log('Profile URL:', profileUrl);
      
      try {
        this.profile = await this.http.get<ServiceProviderProfile>(profileUrl).toPromise() as ServiceProviderProfile;
        console.log('Service provider profile loaded successfully:', this.profile);
        
        // Load menu items now that profile is available
        this.loadMenuItems();

        // Load dashboard data if profile exists and has a business name
        if (this.profile && this.profile.businessName) {
          console.log('Loading dashboard data for business:', this.profile.businessName);
          try {
            const dashboardData = await this.http.get<any>(
              `${environment.apiUrl}/ServiceProviderDashboard/user/${userId}`
            ).toPromise();

            console.log('Dashboard data loaded:', dashboardData);

            // Store dashboard data
            this.dashboardData = dashboardData;

            // Load appointments
            this.scheduledAppointments = dashboardData.upcomingAppointments?.appointments || [];
            
            // Load completed maintenance
            this.completedMaintenance = dashboardData.recentMaintenance?.records || [];
            
            // Load reviews from backend
            if (dashboardData.reviews) {
              this.reviews = dashboardData.reviews.items || [];
              
              // Update profile rating with average from reviews
              if (this.profile) {
                if (dashboardData.reviews.count > 0) {
                  this.profile.rating = dashboardData.reviews.averageRating;
                } else {
                  this.profile.rating = undefined; // No reviews yet
                }
              }
              
              // Calculate rating distribution
              this.calculateRatingDistribution();
            } else {
              // Fallback to loading from completed maintenance
              this.loadReviews();
            }
            
            // Load financial data
            this.financialData = dashboardData.financial || {
              totalRevenue: 0,
              last30DaysRevenue: 0,
              last60DaysRevenue: 0,
              revenueGrowth: 0,
              totalJobsCompleted: 0,
              averageJobValue: 0,
              monthlyRevenue: []
            };

            // Load reviews (mock data for now)
            this.loadReviews();
          } catch (dashboardError: any) {
            console.error('Error loading dashboard data:', dashboardError);
            // Initialize with empty data if dashboard load fails
            this.financialData = {
              totalRevenue: 0,
              last30DaysRevenue: 0,
              last60DaysRevenue: 0,
              revenueGrowth: 0,
              totalJobsCompleted: 0,
              averageJobValue: 0,
              monthlyRevenue: []
            };
            this.snackBar.open('Dashboard data not available yet. Complete some jobs to see statistics.', 'Close', { duration: 3000 });
          }
        } else {
          console.warn('Profile loaded but businessName is missing');
          // Initialize with empty financial data
          this.financialData = {
            totalRevenue: 0,
            last30DaysRevenue: 0,
            last60DaysRevenue: 0,
            revenueGrowth: 0,
            totalJobsCompleted: 0,
            averageJobValue: 0,
            monthlyRevenue: []
          };
        }
      } catch (profileError: any) {
        console.error('Error loading service provider profile:', profileError);
        
        // If profile doesn't exist yet (404), create a placeholder
        if (profileError.status === 404) {
          console.log('Service provider profile not found - redirecting to profile creation');
          this.snackBar.open('Please complete your service provider profile first.', 'Go to Profile', { duration: 5000 })
            .onAction().subscribe(() => {
              this.router.navigate(['/service-provider-profile/create']);
            });
          this.loading = false;
          return;
        } else {
          throw profileError;
        }
      }

      this.loading = false;
    } catch (error) {
      console.error('Error loading dashboard:', error);
      this.snackBar.open('Failed to load dashboard data. Please try refreshing the page.', 'Close', { duration: 5000 });
      this.loading = false;
    }
  }

  loadReviews(): void {
    // Generate reviews based on completed maintenance with ratings
    this.reviews = this.completedMaintenance
      .filter(m => m.rating)
      .map(m => ({
        id: m.id,
        vehicleRegistration: m.vehicleRegistration,
        rating: m.rating || 0,
        comment: 'Service completed successfully.',
        reviewDate: m.completedDate,
        reviewerName: m.ownerName || 'Vehicle Owner',
        jobType: m.maintenanceType
      }));

    // Calculate rating distribution
    this.calculateRatingDistribution();
  }

  calculateRatingDistribution(): void {
    const totalRatings = this.reviews.length;
    if (totalRatings > 0) {
      this.ratingDistribution = [
        { stars: 5, count: this.reviews.filter(r => r.rating === 5).length, percentage: 0 },
        { stars: 4, count: this.reviews.filter(r => r.rating === 4).length, percentage: 0 },
        { stars: 3, count: this.reviews.filter(r => r.rating === 3).length, percentage: 0 },
        { stars: 2, count: this.reviews.filter(r => r.rating === 2).length, percentage: 0 },
        { stars: 1, count: this.reviews.filter(r => r.rating === 1).length, percentage: 0 }
      ];

      // Calculate percentages
      this.ratingDistribution = this.ratingDistribution.map(item => ({
        ...item,
        percentage: (item.count / totalRatings) * 100
      }));
    }
  }

  generateCalendar(): void {
    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    
    // Get first day of the month
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    // Get starting day of week (0 = Sunday)
    const startingDayOfWeek = firstDay.getDay();
    const daysInMonth = lastDay.getDate();
    
    // Get days from previous month
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevMonthDays = startingDayOfWeek;
    
    // Get days for next month
    const totalCells = Math.ceil((daysInMonth + prevMonthDays) / 7) * 7;
    const nextMonthDays = totalCells - (daysInMonth + prevMonthDays);
    
    const days: CalendarDay[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Previous month days
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push(this.createCalendarDay(date, false));
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      days.push(this.createCalendarDay(date, true));
    }
    
    // Next month days
    for (let i = 1; i <= nextMonthDays; i++) {
      const date = new Date(year, month + 1, i);
      days.push(this.createCalendarDay(date, false));
    }
    
    this.calendarDays = days;
  }

  createCalendarDay(date: Date, isCurrentMonth: boolean): CalendarDay {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    
    const dayAppointments = this.scheduledAppointments.filter(apt => {
      const aptDate = new Date(apt.scheduledDate);
      aptDate.setHours(0, 0, 0, 0);
      return aptDate.getTime() === compareDate.getTime();
    });
    
    return {
      date: new Date(date),
      isToday: compareDate.getTime() === today.getTime(),
      isCurrentMonth,
      hasBookings: dayAppointments.length > 0,
      bookingCount: dayAppointments.length,
      availableSlots: 8 - dayAppointments.length, // Assuming 8 slots per day
      appointments: dayAppointments
    };
  }

  updateMonthDisplay(): void {
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    this.currentMonthDisplay = `${months[this.currentDate.getMonth()]} ${this.currentDate.getFullYear()}`;
  }

  previousMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() - 1, 1);
    this.generateCalendar();
    this.updateMonthDisplay();
  }

  nextMonth(): void {
    this.currentDate = new Date(this.currentDate.getFullYear(), this.currentDate.getMonth() + 1, 1);
    this.generateCalendar();
    this.updateMonthDisplay();
  }

  selectDate(day: CalendarDay): void {
    this.selectedDate = day;
  }

  toggleAppointmentsList(): void {
    this.showAppointmentsList = !this.showAppointmentsList;
  }

  toggleCompletedJobsList(): void {
    this.showCompletedJobsList = !this.showCompletedJobsList;
    // Scroll to completed jobs section
    if (this.showCompletedJobsList) {
      setTimeout(() => {
        const element = document.querySelector('.completed-jobs-detail');
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    }
  }

  showTodayAppointments(): void {
    this.appointmentsFilterMode = 'today';
    this.showAppointmentsList = true;
    // Scroll to appointments section
    setTimeout(() => {
      const element = document.querySelector('.appointments-detail');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  showTomorrowAppointments(): void {
    this.appointmentsFilterMode = 'tomorrow';
    this.showAppointmentsList = true;
    // Scroll to appointments section
    setTimeout(() => {
      const element = document.querySelector('.appointments-detail');
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  }

  getRatingStars(rating: number): boolean[] {
    const stars: boolean[] = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(i <= Math.round(rating));
    }
    return stars;
  }

  getBarHeight(revenue: number): number {
    if (!this.financialData || !this.financialData.monthlyRevenue || this.financialData.monthlyRevenue.length === 0) {
      return 0;
    }
    const maxRevenue = Math.max(...this.financialData.monthlyRevenue.map(m => m.revenue));
    return maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
  }

  getMonthName(month: number): string {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return months[month - 1] || '';
  }

  navigateToRoadsideAssistance(): void {
    this.router.navigate(['/service-provider-dashboard/roadside-assistance']);
  }

  navigateToServiceRequests(): void {
    this.router.navigate(['/service-provider-dashboard/service-requests']);
  }

  async toggleAvailability(): Promise<void> {
    try {
      await this.http.patch(
        `${environment.apiUrl}/ServiceProviderProfiles/${this.profile?.id}/toggle-availability`,
        {}
      ).toPromise();

      if (this.profile) {
        this.profile.isAvailable = !this.profile.isAvailable;
      }

      this.snackBar.open(
        `You are now ${this.profile?.isAvailable ? 'available' : 'unavailable'} for jobs`,
        'Close',
        { duration: 3000 }
      );
    } catch (error) {
      console.error('Error toggling availability:', error);
      this.snackBar.open('Failed to update availability', 'Close', { duration: 5000 });
    }
  }
}
