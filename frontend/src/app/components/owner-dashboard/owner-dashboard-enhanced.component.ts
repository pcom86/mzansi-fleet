import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTabsModule, MatTabGroup } from '@angular/material/tabs';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { FormsModule } from '@angular/forms';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { ScheduleServiceDialogComponent } from '../maintenance/schedule-service-dialog.component';

Chart.register(...registerables);

@Component({
  selector: 'app-owner-dashboard-enhanced',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatDialogModule,
    MatTooltipModule,
    MatTabsModule,
    MatMenuModule,
    MatSnackBarModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatInputModule,
    MatNativeDateModule,
    FormsModule
  ],
  template: `
    <div class="owner-dashboard">
      <div class="dashboard-header">
        <div class="welcome-section">
          <h1>Fleet Performance Dashboard</h1>
          <p>{{ currentMonthName }} Overview</p>
        </div>
      </div>

      <!-- Maintenance Alerts Banner -->
      <div *ngIf="!loading && maintenanceAlerts > 0" class="alert-banner" (click)="navigateToMaintenanceTab()">
        <div class="alert-icon">
          <mat-icon>warning</mat-icon>
        </div>
        <div class="alert-content">
          <h3>Pending Maintenance Requests</h3>
          <p>You have <strong>{{ maintenanceAlerts }}</strong> maintenance request{{ maintenanceAlerts > 1 ? 's' : '' }} awaiting your approval</p>
        </div>
        <div class="alert-action">
          <button mat-raised-button color="warn">
            <mat-icon>assignment</mat-icon>
            View Requests
          </button>
        </div>
        <mat-icon class="alert-close">chevron_right</mat-icon>
      </div>

      <div *ngIf="loading" class="loading-container">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        <p>Loading fleet data...</p>
      </div>

      <div *ngIf="!loading" class="dashboard-content">
        <mat-tab-group class="dashboard-tabs" #tabGroup>
          <!-- Overview Tab -->
          <mat-tab label="Overview">
            <div class="tab-content">
              <!-- Key Metrics -->
              <div class="metrics-grid">
                <mat-card class="metric-card total-profit">
                  <mat-card-content>
                    <div class="metric-icon">
                      <mat-icon>account_balance_wallet</mat-icon>
                    </div>
                    <div class="metric-info">
                      <h3>Total Profit</h3>
                      <h2 [class.positive]="totalProfit > 0" [class.negative]="totalProfit < 0">
                        R{{ totalProfit.toFixed(2) }}
                      </h2>
                      <p class="metric-detail">This month</p>
                    </div>
                  </mat-card-content>
                </mat-card>

                <mat-card class="metric-card total-vehicles">
                  <mat-card-content>
                    <div class="metric-icon">
                      <mat-icon>directions_car</mat-icon>
                    </div>
                    <div class="metric-info">
                      <h3>Fleet Size</h3>
                      <h2>{{ totalVehicles }}</h2>
                      <p class="metric-detail">{{ activeVehicles }} active</p>
                    </div>
                  </mat-card-content>
                </mat-card>

                <mat-card class="metric-card maintenance" (click)="navigateToMaintenance()" style="cursor: pointer;">
                  <mat-card-content>
                    <div class="metric-icon">
                      <mat-icon>build</mat-icon>
                    </div>
                    <div class="metric-info">
                      <h3>Maintenance Alerts</h3>
                      <h2>{{ maintenanceAlerts }}</h2>
                      <p class="metric-detail">{{ vehiclesInService }} in service</p>
                    </div>
                  </mat-card-content>
                </mat-card>

                <mat-card class="metric-card avg-profit">
                  <mat-card-content>
                    <div class="metric-icon">
                      <mat-icon>trending_up</mat-icon>
                    </div>
                    <div class="metric-info">
                      <h3>Avg Profit/Vehicle</h3>
                      <h2>R{{ avgProfitPerVehicle.toFixed(2) }}</h2>
                      <p class="metric-detail">Per vehicle</p>
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>

              <!-- Date Filter for Fleet Earnings Chart -->
              <mat-card class="filter-card" style="margin-bottom: 16px;">
                <mat-card-content style="padding: 16px;">
                  <div style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap;">
                    <mat-form-field style="width: 140px;">
                      <mat-label>Start Date</mat-label>
                      <input matInput [matDatepicker]="startPicker" [(ngModel)]="filterStartDate">
                      <mat-datepicker-toggle matSuffix [for]="startPicker"></mat-datepicker-toggle>
                      <mat-datepicker #startPicker></mat-datepicker>
                    </mat-form-field>
                    
                    <mat-form-field style="width: 140px;">
                      <mat-label>End Date</mat-label>
                      <input matInput [matDatepicker]="endPicker" [(ngModel)]="filterEndDate">
                      <mat-datepicker-toggle matSuffix [for]="endPicker"></mat-datepicker-toggle>
                      <mat-datepicker #endPicker></mat-datepicker>
                    </mat-form-field>
                    
                    <button mat-raised-button color="primary" (click)="applyDateFilter()" style="height: 40px;">
                      <mat-icon>filter_list</mat-icon>
                      Apply Filter
                    </button>
                  </div>
                </mat-card-content>
              </mat-card>

              <!-- Fleet Earnings vs Expenses Chart -->
              <mat-card class="chart-card">
                <mat-card-header style="display: flex; align-items: flex-start;">
                  <mat-icon mat-card-avatar>bar_chart</mat-icon>
                  <div style="flex: 1;">
                    <mat-card-title>Fleet Earnings vs Expenses Comparison</mat-card-title>
                    <mat-card-subtitle>
                      <div class="chart-subtitle-container">
                        <span>{{ getChartSubtitle() }}</span>
                        <div class="breadcrumb" *ngIf="drillDownLevel !== 'month'">
                          <button mat-button (click)="resetDrillDown()">
                            <mat-icon>home</mat-icon> All Vehicles
                          </button>
                          <span *ngIf="drillDownLevel === 'week' || drillDownLevel === 'day'"> > </span>
                          <button mat-button *ngIf="drillDownLevel === 'week'" (click)="drillToMonth()">
                            <mat-icon>arrow_back</mat-icon> {{ selectedVehicleName }}
                          </button>
                          <button mat-button *ngIf="drillDownLevel === 'day'" (click)="drillToWeek()">
                            <mat-icon>arrow_back</mat-icon> Week {{ selectedWeekNumber }}
                          </button>
                        </div>
                      </div>
                    </mat-card-subtitle>
                  </div>
                  <div style="margin-left: auto; padding-left: 16px;">
                    <div style="display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 8px; box-shadow: 0 2px 8px rgba(102, 126, 234, 0.25);">
                      <mat-icon style="color: white; font-size: 18px; width: 18px; height: 18px;">calendar_today</mat-icon>
                      <span style="font-size: 0.875rem; font-weight: 600; color: white; letter-spacing: 0.3px;">
                        {{ filterStartDate | date: 'MMM d' }} - {{ filterEndDate | date: 'MMM d, yyyy' }}
                      </span>
                    </div>
                  </div>
                </mat-card-header>
                <mat-card-content>
                  <div class="chart-info" *ngIf="drillDownLevel !== 'month'">
                    <mat-chip-set>
                      <mat-chip>Level: {{ drillDownLevel | titlecase }}</mat-chip>
                      <mat-chip *ngIf="selectedVehicleName">Vehicle: {{ selectedVehicleName }}</mat-chip>
                    </mat-chip-set>
                  </div>
                  <div class="chart-container">
                    <canvas #earningsExpensesChart></canvas>
                  </div>
                </mat-card-content>
              </mat-card>

              <!-- Most Profitable Vehicle -->
              <mat-card class="featured-card" *ngIf="mostProfitableVehicle">
                <mat-card-header>
                  <mat-icon mat-card-avatar class="trophy-icon">emoji_events</mat-icon>
                  <mat-card-title>Star Performer</mat-card-title>
                  <mat-card-subtitle>Most Profitable Vehicle This Month</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <div class="featured-vehicle">
                    <div class="vehicle-info">
                      <h2>{{ mostProfitableVehicle.make }} {{ mostProfitableVehicle.model }}</h2>
                      <p class="registration">{{ mostProfitableVehicle.registration }}</p>
                      <div class="profit-stats">
                        <div class="stat-row">
                          <span class="label">Earnings:</span>
                          <span class="value earnings">R{{ mostProfitableVehicle.earnings.toFixed(2) }}</span>
                        </div>
                        <div class="stat-row">
                          <span class="label">Expenses:</span>
                          <span class="value expenses">R{{ mostProfitableVehicle.expenses.toFixed(2) }}</span>
                        </div>
                        <div class="stat-row highlight">
                          <span class="label">Net Profit:</span>
                          <span class="value profit">R{{ mostProfitableVehicle.profit.toFixed(2) }}</span>
                        </div>
                      </div>
                    </div>
                    <div class="profit-visual">
                      <canvas id="profitChart" width="200" height="200"></canvas>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

          <!-- Fleet Vehicles Tab -->
          <mat-tab label="Fleet Vehicles">
            <div class="tab-content">
              <mat-card class="table-card">
                <mat-card-header>
                  <mat-icon mat-card-avatar>directions_car</mat-icon>
                  <mat-card-title>Fleet Vehicles</mat-card-title>
                  <mat-card-subtitle>{{ totalVehicles }} vehicles ({{ activeVehicles }} active, {{ inactiveVehicles }} inactive)</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <div class="table-container">
                    <table mat-table [dataSource]="vehiclePerformance" class="vehicles-table">
                      <!-- Vehicle Column -->
                      <ng-container matColumnDef="vehicle">
                        <th mat-header-cell *matHeaderCellDef>Vehicle Details</th>
                        <td mat-cell *matCellDef="let v">
                          <div class="vehicle-details-cell">
                            <div class="vehicle-primary">
                              <strong>{{ v.make }} {{ v.model }}</strong>
                              <mat-chip class="year-chip">{{ v.year || 'N/A' }}</mat-chip>
                            </div>
                            <div class="vehicle-secondary">
                              <span class="registration">{{ v.registration }}</span>
                              <span class="vin" *ngIf="v.vin">VIN: {{ v.vin }}</span>
                            </div>
                          </div>
                        </td>
                      </ng-container>

                      <!-- Status Column -->
                      <ng-container matColumnDef="status">
                        <th mat-header-cell *matHeaderCellDef>Status</th>
                        <td mat-cell *matCellDef="let v">
                          <div class="status-column">
                            <mat-chip [class.status-active]="v.status === 'Active'" 
                                      [class.status-inactive]="v.status !== 'Active'">
                              <mat-icon>{{ v.status === 'Active' ? 'check_circle' : 'cancel' }}</mat-icon>
                              {{ v.status || 'Unknown' }}
                            </mat-chip>
                            <mat-chip class="service-status" *ngIf="v.isInService" [matTooltip]="v.serviceMessage">
                              <mat-icon>build</mat-icon>
                              In Service
                            </mat-chip>
                          </div>
                        </td>
                      </ng-container>

                      <!-- Health Score Column -->
                      <ng-container matColumnDef="health">
                        <th mat-header-cell *matHeaderCellDef>Health</th>
                        <td mat-cell *matCellDef="let v">
                          <div class="health-column">
                            <div class="health-score" [matTooltip]="getHealthTooltip(v)">
                              <mat-icon [class.health-good]="v.healthScore >= 80"
                                        [class.health-warning]="v.healthScore >= 50 && v.healthScore < 80"
                                        [class.health-critical]="v.healthScore < 50">
                                {{ getHealthIcon(v.healthScore) }}
                              </mat-icon>
                              <span class="score-text">{{ v.healthScore }}%</span>
                            </div>
                            <div class="health-bar">
                              <div class="health-bar-fill" 
                                   [style.width.%]="v.healthScore"
                                   [class.bar-good]="v.healthScore >= 80"
                                   [class.bar-warning]="v.healthScore >= 50 && v.healthScore < 80"
                                   [class.bar-critical]="v.healthScore < 50">
                              </div>
                            </div>
                          </div>
                        </td>
                      </ng-container>

                      <!-- Driver Column -->
                      <ng-container matColumnDef="driver">
                        <th mat-header-cell *matHeaderCellDef>Driver</th>
                        <td mat-cell *matCellDef="let v">
                          <div class="driver-cell">
                            <mat-icon>person</mat-icon>
                            <span>{{ v.driverName || 'Unassigned' }}</span>
                          </div>
                        </td>
                      </ng-container>

                      <!-- This Month Profit Column -->
                      <ng-container matColumnDef="profit">
                        <th mat-header-cell *matHeaderCellDef>This Month</th>
                        <td mat-cell *matCellDef="let v">
                          <div class="profit-column">
                            <div class="profit-value" [class.positive]="v.profit > 0" [class.negative]="v.profit < 0">
                              R{{ v.profit.toFixed(2) }}
                            </div>
                            <div class="profit-breakdown">
                              <small class="earnings">+R{{ v.earnings.toFixed(2) }}</small>
                              <small class="expenses">-R{{ v.expenses.toFixed(2) }}</small>
                            </div>
                          </div>
                        </td>
                      </ng-container>

                      <!-- Actions Column -->
                      <ng-container matColumnDef="actions">
                        <th mat-header-cell *matHeaderCellDef>Actions</th>
                        <td mat-cell *matCellDef="let v">
                          <button mat-icon-button [matMenuTriggerFor]="vehicleMenu" [matTooltip]="'Vehicle options'">
                            <mat-icon>more_vert</mat-icon>
                          </button>
                          <mat-menu #vehicleMenu="matMenu">
                            <button mat-menu-item (click)="viewVehicleDetails(v.id)">
                              <mat-icon>visibility</mat-icon>
                              <span>View Details</span>
                            </button>
                            <button mat-menu-item (click)="navigateToVehicles()">
                              <mat-icon>edit</mat-icon>
                              <span>Edit Vehicle</span>
                            </button>
                            <button mat-menu-item (click)="scheduleService(v)">
                              <mat-icon>build_circle</mat-icon>
                              <span>Schedule Service</span>
                            </button>
                          </mat-menu>
                        </td>
                      </ng-container>

                      <tr mat-header-row *matHeaderRowDef="['vehicle', 'status', 'health', 'driver', 'profit', 'actions']"></tr>
                      <tr mat-row *matRowDef="let row; columns: ['vehicle', 'status', 'health', 'driver', 'profit', 'actions'];"></tr>
                    </table>
                  </div>

                  <div *ngIf="vehiclePerformance.length === 0" class="no-data">
                    <mat-icon>directions_car_filled</mat-icon>
                    <h3>No Vehicles Found</h3>
                    <p>Add vehicles to your fleet to see them here</p>
                    <button mat-raised-button color="primary" (click)="navigateToVehicles()">
                      <mat-icon>add</mat-icon>
                      Add Vehicle
                    </button>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

          <!-- Performance Tab -->
          <mat-tab label="Performance">
            <div class="tab-content">
              <mat-card class="table-card">
                <mat-card-header>
                  <mat-icon mat-card-avatar>assessment</mat-icon>
                  <mat-card-title>Vehicle Performance Comparison</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="table-container">
                    <table mat-table [dataSource]="vehiclePerformance" class="performance-table">
                      <ng-container matColumnDef="vehicle">
                        <th mat-header-cell *matHeaderCellDef>Vehicle</th>
                        <td mat-cell *matCellDef="let v">
                          <div class="vehicle-cell">
                            <strong>{{ v.make }} {{ v.model }}</strong><br>
                            <small>{{ v.registration }}</small>
                          </div>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="status">
                        <th mat-header-cell *matHeaderCellDef>Status</th>
                        <td mat-cell *matCellDef="let v">
                          <div class="status-chips">
                            <mat-chip [class.online]="v.status === 'Active'" [class.offline]="v.status !== 'Active'">
                              {{ v.status }}
                            </mat-chip>
                            <mat-chip class="service-chip" *ngIf="v.isInService" [matTooltip]="v.serviceMessage">
                              <mat-icon>build_circle</mat-icon>
                              {{ v.serviceType }}
                            </mat-chip>
                          </div>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="earnings">
                        <th mat-header-cell *matHeaderCellDef>Earnings</th>
                        <td mat-cell *matCellDef="let v" class="earnings-cell">
                          R{{ v.earnings.toFixed(2) }}
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="expenses">
                        <th mat-header-cell *matHeaderCellDef>Expenses</th>
                        <td mat-cell *matCellDef="let v" class="expenses-cell">
                          R{{ v.expenses.toFixed(2) }}
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="profit">
                        <th mat-header-cell *matHeaderCellDef>Profit</th>
                        <td mat-cell *matCellDef="let v">
                          <span [class.positive]="v.profit > 0" [class.negative]="v.profit < 0">
                            R{{ v.profit.toFixed(2) }}
                          </span>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="health">
                        <th mat-header-cell *matHeaderCellDef>Health</th>
                        <td mat-cell *matCellDef="let v">
                          <div class="health-indicator" [matTooltip]="getHealthTooltip(v)">
                            <mat-icon [class.health-good]="v.healthScore >= 80"
                                      [class.health-warning]="v.healthScore >= 50 && v.healthScore < 80"
                                      [class.health-critical]="v.healthScore < 50">
                              {{ getHealthIcon(v.healthScore) }}
                            </mat-icon>
                            <span>{{ v.healthScore }}%</span>
                          </div>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="performance">
                        <th mat-header-cell *matHeaderCellDef>Performance</th>
                        <td mat-cell *matCellDef="let v">
                          <div class="performance-bar">
                            <div class="bar-fill" 
                                 [style.width.%]="getPerformancePercentage(v.profit)"
                                 [class.bar-positive]="v.profit > 0"
                                 [class.bar-negative]="v.profit <= 0">
                            </div>
                          </div>
                        </td>
                      </ng-container>

                      <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
                    </table>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

          <!-- Health & Maintenance Tab -->
          <mat-tab label="Health & Maintenance">
            <div class="tab-content">
              <mat-card class="alerts-card" *ngIf="healthAlerts.length > 0">
                <mat-card-header>
                  <mat-icon mat-card-avatar class="alert-icon">warning</mat-icon>
                  <mat-card-title>Vehicle Health Alerts</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="alerts-list">
                    <div *ngFor="let alert of healthAlerts" class="alert-item" [class]="'alert-' + alert.severity">
                      <mat-icon>{{ alert.icon }}</mat-icon>
                      <div class="alert-content">
                        <h4>{{ alert.vehicle }}</h4>
                        <p>{{ alert.message }}</p>
                        <small>{{ alert.recommendation }}</small>
                      </div>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>

              <mat-card class="alerts-card" *ngIf="healthAlerts.length === 0">
                <mat-card-content>
                  <div class="no-alerts">
                    <mat-icon>check_circle</mat-icon>
                    <h3>All Vehicles Healthy</h3>
                    <p>No maintenance alerts at this time</p>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

          <!-- Maintenance Requests Tab -->
          <mat-tab label="Maintenance Requests">
            <div class="tab-content">
              <mat-card class="table-card">
                <mat-card-header>
                  <mat-icon mat-card-avatar>build_circle</mat-icon>
                  <mat-card-title>All Maintenance Requests</mat-card-title>
                  <mat-card-subtitle>{{ maintenanceRequests.length }} total requests</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <div *ngIf="maintenanceRequests.length === 0" class="no-alerts">
                    <mat-icon>assignment</mat-icon>
                    <h3>No Maintenance Requests</h3>
                    <p>There are currently no maintenance requests for your fleet</p>
                  </div>

                  <div *ngIf="maintenanceRequests.length > 0" class="table-container">
                    <table mat-table [dataSource]="maintenanceRequests" class="maintenance-table">
                      <!-- Vehicle Column -->
                      <ng-container matColumnDef="vehicle">
                        <th mat-header-cell *matHeaderCellDef>Vehicle</th>
                        <td mat-cell *matCellDef="let req">
                          <div class="vehicle-cell">
                            <strong>{{ req.vehicleRegistration || 'N/A' }}</strong><br>
                            <small>{{ req.vehicleMake }} {{ req.vehicleModel }}</small>
                          </div>
                        </td>
                      </ng-container>

                      <!-- Issue Column -->
                      <ng-container matColumnDef="issue">
                        <th mat-header-cell *matHeaderCellDef>Issue Description</th>
                        <td mat-cell *matCellDef="let req">
                          <div class="issue-cell">
                            {{ req.issueDescription }}
                          </div>
                        </td>
                      </ng-container>

                      <!-- Priority Column -->
                      <ng-container matColumnDef="priority">
                        <th mat-header-cell *matHeaderCellDef>Priority</th>
                        <td mat-cell *matCellDef="let req">
                          <mat-chip [class.priority-urgent]="req.priority === 'Urgent'"
                                    [class.priority-high]="req.priority === 'High'"
                                    [class.priority-medium]="req.priority === 'Medium'"
                                    [class.priority-low]="req.priority === 'Low'">
                            {{ req.priority || 'Normal' }}
                          </mat-chip>
                        </td>
                      </ng-container>

                      <!-- Status Column -->
                      <ng-container matColumnDef="status">
                        <th mat-header-cell *matHeaderCellDef>Status</th>
                        <td mat-cell *matCellDef="let req">
                          <mat-chip [class.status-pending]="req.state === 'Pending'"
                                    [class.status-approved]="req.state === 'Approved'"
                                    [class.status-declined]="req.state === 'Declined'"
                                    [class.status-scheduled]="req.state === 'Scheduled'"
                                    [class.status-completed]="req.state === 'Completed'">
                            {{ req.state }}
                          </mat-chip>
                        </td>
                      </ng-container>

                      <!-- Requested Date Column -->
                      <ng-container matColumnDef="requestedDate">
                        <th mat-header-cell *matHeaderCellDef>Requested</th>
                        <td mat-cell *matCellDef="let req">
                          {{ req.requestedDate | date: 'MMM d, yyyy' }}
                        </td>
                      </ng-container>

                      <!-- Scheduled Date Column -->
                      <ng-container matColumnDef="scheduledDate">
                        <th mat-header-cell *matHeaderCellDef>Scheduled</th>
                        <td mat-cell *matCellDef="let req">
                          {{ req.scheduledDate ? (req.scheduledDate | date: 'MMM d, yyyy') : '-' }}
                        </td>
                      </ng-container>

                      <!-- Estimated Cost Column -->
                      <ng-container matColumnDef="cost">
                        <th mat-header-cell *matHeaderCellDef>Est. Cost</th>
                        <td mat-cell *matCellDef="let req">
                          {{ req.estimatedCost ? ('R' + req.estimatedCost.toFixed(2)) : '-' }}
                        </td>
                      </ng-container>

                      <!-- Actions Column -->
                      <ng-container matColumnDef="actions">
                        <th mat-header-cell *matHeaderCellDef>Actions</th>
                        <td mat-cell *matCellDef="let req">
                          <!-- Pending requests: Approve/Decline -->
                          <button mat-icon-button [matMenuTriggerFor]="pendingMenu" *ngIf="req.state === 'Pending'">
                            <mat-icon>more_vert</mat-icon>
                          </button>
                          <mat-menu #pendingMenu="matMenu">
                            <button mat-menu-item (click)="approveRequest(req.id)">
                              <mat-icon>check</mat-icon>
                              <span>Approve</span>
                            </button>
                            <button mat-menu-item (click)="declineRequest(req.id)">
                              <mat-icon>close</mat-icon>
                              <span>Decline</span>
                            </button>
                          </mat-menu>

                          <!-- Approved requests: Schedule -->
                          <button mat-raised-button color="primary" *ngIf="req.state === 'Approved'" (click)="scheduleRequest(req.id)">
                            <mat-icon>schedule</mat-icon>
                            Schedule
                          </button>

                          <!-- Scheduled requests: Mark as Complete -->
                          <button mat-raised-button color="accent" *ngIf="req.state === 'Scheduled'" (click)="completeRequest(req.id)">
                            <mat-icon>check_circle</mat-icon>
                            Complete
                          </button>

                          <!-- Other states -->
                          <span *ngIf="req.state !== 'Pending' && req.state !== 'Approved' && req.state !== 'Scheduled'">-</span>
                        </td>
                      </ng-container>

                      <tr mat-header-row *matHeaderRowDef="maintenanceRequestColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: maintenanceRequestColumns;"></tr>
                    </table>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

          <!-- Recommendations Tab -->
          <mat-tab label="Recommendations">
            <div class="tab-content">
              <mat-card class="recommendations-card">
                <mat-card-header>
                  <mat-icon mat-card-avatar>lightbulb</mat-icon>
                  <mat-card-title>Improve Your Fleet Profitability</mat-card-title>
                  <mat-card-subtitle>Actionable insights to maximize returns</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <div class="recommendations-list">
                    <div *ngFor="let rec of recommendations" class="recommendation-item">
                      <div class="recommendation-icon" [class]="'priority-' + rec.priority">
                        <mat-icon>{{ rec.icon }}</mat-icon>
                      </div>
                      <div class="recommendation-content">
                        <h4>{{ rec.title }}</h4>
                        <p>{{ rec.description }}</p>
                        <div class="impact" *ngIf="rec.potentialImpact">
                          <mat-icon>trending_up</mat-icon>
                          <span>{{ rec.potentialImpact }}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

          <!-- Forecast Tab -->
          <mat-tab label="Forecast">
            <div class="tab-content">
              <mat-card class="forecast-card">
                <mat-card-header>
                  <mat-icon mat-card-avatar>insights</mat-icon>
                  <mat-card-title>12-Month Forecast</mat-card-title>
                  <mat-card-subtitle>Based on current performance trends</mat-card-subtitle>
                </mat-card-header>
                <mat-card-content>
                  <div class="forecast-summary">
                    <div class="forecast-item">
                      <mat-icon class="forecast-icon">attach_money</mat-icon>
                      <h3>Projected Annual Profit</h3>
                      <h2 class="positive">R{{ projectedAnnualProfit.toFixed(2) }}</h2>
                      <p>Extrapolated from current month</p>
                    </div>
                    <div class="forecast-item">
                      <mat-icon class="forecast-icon">trending_up</mat-icon>
                      <h3>Expected Growth Rate</h3>
                      <h2 [class.positive]="projectedGrowthRate > 0" [class.negative]="projectedGrowthRate < 0">
                        {{ projectedGrowthRate.toFixed(1) }}%
                      </h2>
                      <p>Compared to baseline</p>
                    </div>
                    <div class="forecast-item">
                      <mat-icon class="forecast-icon">build_circle</mat-icon>
                      <h3>Maintenance Budget</h3>
                      <h2>R{{ projectedMaintenanceCost.toFixed(2) }}</h2>
                      <p>Estimated annual cost</p>
                    </div>
                  </div>
                  <div class="forecast-notes">
                    <mat-icon>info</mat-icon>
                    <div>
                      <h4>About These Forecasts</h4>
                      <p>
                        Projections are calculated using your current month's performance, 
                        historical maintenance patterns, and vehicle utilization rates. 
                        Actual results may vary based on market conditions, seasonal factors, 
                        and operational changes.
                      </p>
                    </div>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>
    </div>
  `,
  styles: [`
    .owner-dashboard {
      padding: 20px;
      background-color: #f5f5f5;
      min-height: 100vh;
    }

    .dashboard-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      border-radius: 12px;
      color: white;
    }

    .welcome-section h1 {
      margin: 0 0 5px 0;
      font-size: 2rem;
    }

    .welcome-section p {
      margin: 0;
      opacity: 0.9;
    }

    .header-actions {
      display: flex;
      gap: 10px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      min-height: 400px;
      gap: 20px;
    }

    .dashboard-tabs {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .tab-content {
        padding: 15px;
      }

      .dashboard-tabs {
        font-size: 14px;
      }

      .dashboard-tabs .mat-tab-header {
        height: 48px;
      }

      .dashboard-tabs .mat-tab-label {
        min-width: 80px;
        padding: 0 12px;
        font-size: 13px;
      }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
    }

    .metric-card {
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .metric-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 16px rgba(0,0,0,0.15);
    }

    .metric-card mat-card-content {
      display: flex;
      gap: 15px;
      padding: 20px !important;
    }

    .metric-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      border-radius: 12px;
    }

    .metric-icon mat-icon {
      color: white;
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .total-profit .metric-icon {
      background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
    }

    .total-vehicles .metric-icon {
      background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
    }

    .maintenance .metric-icon {
      background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
    }

    .avg-profit .metric-icon {
      background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%);
    }

    .metric-info h3 {
      margin: 0 0 5px 0;
      font-size: 0.9rem;
      color: #666;
    }

    .metric-info h2 {
      margin: 0 0 5px 0;
      font-size: 1.8rem;
      font-weight: 600;
    }

    .metric-detail {
      margin: 0;
      font-size: 0.85rem;
      color: #888;
    }

    .positive { color: #4caf50; }
    .negative { color: #f44336; }

    /* Chart Card */
    .chart-card {
      margin-bottom: 30px;
    }

    .chart-subtitle-container {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .breadcrumb {
      display: flex;
      align-items: center;
      gap: 5px;
      margin-top: 5px;
    }

    .breadcrumb button {
      min-width: auto;
      padding: 0 8px;
      font-size: 0.85rem;
    }

    .breadcrumb mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .chart-info {
      padding: 10px 20px;
      background-color: #f5f5f5;
      border-radius: 4px;
      margin-bottom: 10px;
    }

    .chart-container {
      position: relative;
      height: 400px;
      padding: 20px;
      cursor: pointer;
      background: linear-gradient(to bottom, #ffffff, #f9fafb);
      border-radius: 12px;
    }

    .chart-container canvas {
      max-height: 100%;
      filter: drop-shadow(0 1px 3px rgba(0, 0, 0, 0.05));
    }

    /* Featured Card */
    .featured-card {
      background: linear-gradient(135deg, #fff 0%, #f8f9fa 100%);
    }

    .trophy-icon {
      background-color: #ffd700;
      color: white;
    }

    .featured-vehicle {
      display: flex;
      gap: 30px;
      align-items: center;
    }

    .vehicle-info h2 {
      margin: 0 0 5px 0;
    }

    .registration {
      color: #666;
      margin: 0 0 20px 0;
    }

    .profit-stats {
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .stat-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }

    .stat-row.highlight {
      border-bottom: 2px solid #2196f3;
      font-weight: 600;
    }

    .earnings { color: #4caf50; }
    .expenses { color: #f44336; }
    .profit { color: #2196f3; font-size: 1.2rem; }

    /* Table */
    .table-container {
      overflow-x: auto;
    }

    .performance-table {
      width: 100%;
    }

    .maintenance-table {
      width: 100%;
    }

    .maintenance-table .issue-cell {
      max-width: 300px;
      white-space: normal;
      line-height: 1.4;
    }

    .priority-urgent {
      background-color: #f44336 !important;
      color: white !important;
    }

    .priority-high {
      background-color: #ff9800 !important;
      color: white !important;
    }

    .priority-medium {
      background-color: #2196f3 !important;
      color: white !important;
    }

    .priority-low {
      background-color: #4caf50 !important;
      color: white !important;
    }

    .status-pending {
      background-color: #ff9800 !important;
      color: white !important;
    }

    .status-approved {
      background-color: #4caf50 !important;
      color: white !important;
    }

    .status-declined {
      background-color: #f44336 !important;
      color: white !important;
    }

    .status-scheduled {
      background-color: #2196f3 !important;
      color: white !important;
    }

    .status-completed {
      background-color: #9e9e9e !important;
      color: white !important;
    }

    .vehicle-cell strong {
      font-size: 1rem;
    }

    mat-chip.online {
      background-color: #4caf50;
      color: white;
    }

    mat-chip.offline {
      background-color: #9e9e9e;
      color: white;
    }

    .status-chips {
      display: flex;
      flex-direction: column;
      gap: 5px;
    }

    .service-chip {
      background-color: #ff9800 !important;
      color: white !important;
      font-size: 0.75rem;
      padding: 2px 8px !important;
      height: auto !important;
      min-height: 24px;
    }

    .service-chip mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
      margin-right: 4px;
    }

    .earnings-cell { color: #4caf50; font-weight: 600; }
    .expenses-cell { color: #f44336; font-weight: 600; }

    .health-indicator {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .health-good { color: #4caf50; }
    .health-warning { color: #ff9800; }
    .health-critical { color: #f44336; }

    .performance-bar {
      width: 100px;
      height: 20px;
      background-color: #eee;
      border-radius: 10px;
      overflow: hidden;
    }

    .bar-fill { height: 100%; transition: width 0.3s; }
    .bar-positive { background: linear-gradient(90deg, #4caf50 0%, #45a049 100%); }
    .bar-negative { background: linear-gradient(90deg, #f44336 0%, #e53935 100%); }

    /* Alerts */
    .alerts-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .alert-item {
      display: flex;
      gap: 15px;
      padding: 15px;
      border-radius: 8px;
      border-left: 4px solid;
    }

    .alert-critical {
      background-color: #ffebee;
      border-color: #f44336;
    }

    .alert-critical mat-icon { color: #f44336; }

    .alert-warning {
      background-color: #fff3e0;
      border-color: #ff9800;
    }

    .alert-warning mat-icon { color: #ff9800; }

    .no-alerts {
      text-align: center;
      padding: 40px;
      color: #4caf50;
    }

    .no-alerts mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
    }

    /* Recommendations */
    .recommendations-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .recommendation-item {
      display: flex;
      gap: 15px;
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 8px;
    }

    .recommendation-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .priority-high { background-color: #ffebee; color: #f44336; }
    .priority-medium { background-color: #fff3e0; color: #ff9800; }
    .priority-low { background-color: #e3f2fd; color: #2196f3; }

    .impact {
      display: flex;
      align-items: center;
      gap: 5px;
      color: #4caf50;
      font-weight: 500;
      margin-top: 8px;
    }

    /* Forecast */
    .forecast-summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }

    .forecast-item {
      text-align: center;
      padding: 30px;
      background-color: #f8f9fa;
      border-radius: 12px;
    }

    .forecast-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #667eea;
      margin-bottom: 10px;
    }

    .forecast-item h3 {
      margin: 10px 0;
      font-size: 1rem;
      color: #666;
    }

    .forecast-item h2 {
      margin: 10px 0;
      font-size: 2rem;
      font-weight: 600;
    }

    .forecast-notes {
      display: flex;
      gap: 15px;
      padding: 20px;
      background-color: #e3f2fd;
      border-radius: 8px;
    }

    .forecast-notes mat-icon {
      color: #2196f3;
      flex-shrink: 0;
    }

    .forecast-notes h4 {
      margin: 0 0 10px 0;
      color: #1976d2;
    }

    .forecast-notes p {
      margin: 0;
      color: #666;
      line-height: 1.6;
    }

    @media (max-width: 768px) {
      .owner-dashboard {
        padding: 15px;
      }

      .dashboard-header {
        flex-direction: column;
        gap: 15px;
        padding: 20px;
        margin-bottom: 20px;
      }

      .welcome-section h1 {
        font-size: 2.2rem;
      }

      .welcome-section p {
        font-size: 1rem;
      }

      .alert-banner {
        flex-direction: column;
        text-align: center;
        padding: 20px;
        gap: 15px;
      }

      .alert-banner .alert-close {
        display: none;
      }

      .tab-content {
        padding: 20px;
      }

      .metrics-grid {
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
        gap: 15px;
      }

      .metric-card mat-card-content {
        padding: 18px !important;
      }

      .metric-icon {
        width: 55px;
        height: 55px;
      }

      .metric-icon mat-icon {
        font-size: 30px;
        width: 30px;
        height: 30px;
      }

      .metric-info h3 {
        font-size: 0.85rem;
      }

      .metric-info h2 {
        font-size: 1.6rem;
      }

      .metric-detail {
        font-size: 0.8rem;
      }

      .chart-container {
        height: 350px;
        padding: 20px;
      }

      .filter-card mat-card-content {
        padding: 16px !important;
      }

      .filter-card mat-form-field {
        width: 140px;
      }

      .filter-card button {
        height: 40px;
      }

      .featured-vehicle {
        flex-direction: column;
        gap: 25px;
      }

      .table-container {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .vehicles-table,
      .performance-table,
      .maintenance-table {
        min-width: 650px;
        font-size: 14px;
      }

      .vehicles-table .mat-header-cell,
      .vehicles-table .mat-cell,
      .performance-table .mat-header-cell,
      .performance-table .mat-cell,
      .maintenance-table .mat-header-cell,
      .maintenance-table .mat-cell {
        padding: 10px 6px;
      }

      .vehicle-details-cell {
        min-width: 200px;
      }

      .status-column {
        min-width: 100px;
      }

      .health-column {
        min-width: 100px;
      }

      .driver-cell {
        min-width: 120px;
      }

      .profit-column {
        min-width: 100px;
      }

      .forecast-summary {
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 16px;
      }

      .forecast-item {
        padding: 20px;
      }

      .recommendations-list {
        gap: 12px;
      }

      .recommendation-item {
        padding: 12px;
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .recommendation-icon {
        align-self: flex-start;
      }

      .alerts-list {
        gap: 12px;
      }

      .alert-item {
        padding: 12px;
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .alert-item mat-icon {
        align-self: flex-start;
      }

      .dashboard-tabs .mat-tab-header {
        height: 48px;
      }

      .dashboard-tabs .mat-tab-label {
        min-width: 90px;
        padding: 0 12px;
        font-size: 14px;
      }
    }

    /* Samsung S20 and similar small screens (360px width) */
    @media (max-width: 430px) {
      .owner-dashboard {
        padding: 8px;
      }

      .dashboard-header {
        padding: 20px 15px;
        margin-bottom: 20px;
      }

      .welcome-section h1 {
        font-size: 1.8rem;
        margin: 0 0 6px 0;
      }

      .welcome-section p {
        font-size: 1rem;
        margin: 0;
      }

      .alert-banner {
        margin: 15px 0;
        padding: 15px 12px;
        flex-direction: column;
        text-align: center;
        gap: 12px;
      }

      .alert-banner .alert-icon {
        width: 50px;
        height: 50px;
      }

      .alert-banner .alert-content {
        flex: 1;
        text-align: center;
      }

      .alert-banner .alert-content h3 {
        font-size: 1.1rem;
        margin: 0 0 4px 0;
      }

      .alert-banner .alert-content p {
        font-size: 0.9rem;
        margin: 0;
      }

      .alert-banner .alert-action {
        width: 100%;
      }

      .alert-banner .alert-action button {
        width: 100%;
        max-width: 200px;
      }

      .alert-banner .alert-close {
        display: none;
      }

      .tab-content {
        padding: 16px;
      }

      .metrics-grid {
        grid-template-columns: 1fr;
        gap: 10px;
      }

      .metric-card mat-card-content {
        padding: 12px !important;
        flex-direction: row;
        gap: 12px;
      }

      .metric-icon {
        width: 45px;
        height: 45px;
        flex-shrink: 0;
      }

      .metric-icon mat-icon {
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      .metric-info h3 {
        font-size: 0.75rem;
        margin: 0 0 2px 0;
      }

      .metric-info h2 {
        font-size: 1.3rem;
        margin: 0 0 2px 0;
      }

      .metric-detail {
        font-size: 0.7rem;
        margin: 0;
      }

      .chart-card mat-card-header {
        padding: 16px 16px 8px 16px !important;
      }

      .chart-card .mat-card-header-text {
        margin: 0 !important;
      }

      .chart-card mat-card-title {
        font-size: 1.1rem;
        margin-bottom: 4px;
      }

      .chart-card mat-card-subtitle {
        font-size: 0.85rem;
        line-height: 1.3;
      }

      .chart-container {
        height: 280px;
        padding: 16px;
      }

      .filter-card mat-card-content {
        padding: 12px !important;
      }

      .filter-card mat-form-field {
        width: 100%;
        margin-bottom: 8px;
      }

      .filter-card mat-form-field .mat-form-field-wrapper {
        padding-bottom: 0;
      }

      .filter-card button {
        width: 100%;
        height: 40px;
      }

      .featured-card mat-card-header {
        padding: 16px 16px 8px 16px !important;
      }

      .featured-card mat-card-title {
        font-size: 1.1rem;
        margin-bottom: 4px;
      }

      .featured-card mat-card-subtitle {
        font-size: 0.85rem;
      }

      .featured-vehicle {
        flex-direction: column;
        gap: 20px;
        text-align: center;
      }

      .vehicle-info h2 {
        font-size: 1.4rem;
        margin: 0 0 4px 0;
      }

      .registration {
        font-size: 0.9rem;
        margin: 0 0 15px 0;
      }

      .profit-stats {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }

      .stat-row {
        display: flex;
        justify-content: space-between;
        padding: 6px 0;
        border-bottom: 1px solid #eee;
      }

      .stat-row.highlight {
        border-bottom: 2px solid #2196f3;
        font-weight: 600;
      }

      .table-container {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        margin: 0 -12px;
        padding: 0 12px;
      }

      .vehicles-table {
        min-width: 600px;
        font-size: 12px;
      }

      .vehicles-table .mat-header-cell,
      .vehicles-table .mat-cell {
        padding: 8px 4px;
        min-width: 80px;
      }

      .vehicle-details-cell {
        min-width: 150px;
      }

      .status-column {
        min-width: 80px;
      }

      .health-column {
        min-width: 100px;
      }

      .driver-cell {
        min-width: 100px;
      }

      .profit-column {
        min-width: 80px;
      }

      .performance-table {
        min-width: 700px;
        font-size: 12px;
      }

      .performance-table .mat-header-cell,
      .performance-table .mat-cell {
        padding: 6px 3px;
      }

      .maintenance-table {
        min-width: 800px;
        font-size: 12px;
      }

      .maintenance-table .mat-header-cell,
      .maintenance-table .mat-cell {
        padding: 6px 3px;
      }

      .maintenance-table .issue-cell {
        max-width: 200px;
        white-space: normal;
        line-height: 1.3;
      }

      .alerts-list {
        gap: 10px;
      }

      .alert-item {
        padding: 10px;
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .alert-item mat-icon {
        align-self: flex-start;
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .alert-item h4 {
        font-size: 1rem;
        margin: 0 0 4px 0;
      }

      .alert-item p {
        font-size: 0.85rem;
        margin: 0 0 4px 0;
      }

      .alert-item small {
        font-size: 0.8rem;
      }

      .recommendations-list {
        gap: 10px;
      }

      .recommendation-item {
        padding: 10px;
        flex-direction: column;
        align-items: flex-start;
        gap: 8px;
      }

      .recommendation-icon {
        width: 35px;
        height: 35px;
        align-self: flex-start;
      }

      .recommendation-icon mat-icon {
        font-size: 18px;
        width: 18px;
        height: 18px;
      }

      .recommendation-item h4 {
        font-size: 1rem;
        margin: 0 0 4px 0;
      }

      .recommendation-item p {
        font-size: 0.85rem;
        margin: 0 0 4px 0;
      }

      .forecast-summary {
        grid-template-columns: 1fr;
        gap: 12px;
      }

      .forecast-item {
        padding: 16px 12px;
        text-align: center;
      }

      .forecast-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
        margin-bottom: 8px;
      }

      .forecast-item h3 {
        font-size: 0.9rem;
        margin: 8px 0;
      }

      .forecast-item h2 {
        font-size: 1.6rem;
        margin: 8px 0;
      }

      .forecast-notes {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 16px 12px;
        text-align: center;
      }

      .forecast-notes mat-icon {
        align-self: center;
        font-size: 24px;
        width: 24px;
        height: 24px;
      }

      .forecast-notes h4 {
        margin: 0 0 8px 0;
        font-size: 1rem;
      }

      .forecast-notes p {
        margin: 0;
        font-size: 0.85rem;
        line-height: 1.4;
      }

      .no-data {
        text-align: center;
        padding: 40px 20px;
      }

      .no-data mat-icon {
        font-size: 48px;
        width: 48px;
        height: 48px;
        margin-bottom: 16px;
        opacity: 0.3;
      }

      .no-data h3 {
        font-size: 1.1rem;
        margin: 8px 0;
      }

      .no-data p {
        font-size: 0.85rem;
        margin: 8px 0 16px;
      }

      .no-data button {
        font-size: 0.9rem;
        padding: 8px 16px;
      }

      .dashboard-tabs .mat-tab-header {
        height: 44px;
      }

      .dashboard-tabs .mat-tab-label {
        min-width: 70px;
        padding: 0 8px;
        font-size: 12px;
        height: 44px;
        line-height: 44px;
      }

      .loading-container {
        padding: 40px 20px;
      }

      .loading-container p {
        font-size: 0.9rem;
        margin-top: 16px;
      }
    }

    /* Samsung S20 Ultra specific optimizations (412px width) */
    @media (max-width: 430px) and (min-width: 400px) {
      .owner-dashboard {
        padding: 12px;
      }

      .dashboard-header {
        padding: 24px 16px;
        margin-bottom: 24px;
        border-radius: 16px;
      }

      .welcome-section h1 {
        font-size: 2rem;
        margin: 0 0 8px 0;
        letter-spacing: -0.5px;
      }

      .welcome-section p {
        font-size: 1.1rem;
        margin: 0;
        opacity: 0.95;
      }

      .alert-banner {
        margin: 20px 0;
        padding: 20px 16px;
        border-radius: 16px;
        gap: 16px;
      }

      .alert-banner .alert-icon {
        width: 56px;
        height: 56px;
      }

      .alert-banner .alert-icon mat-icon {
        font-size: 32px;
        width: 32px;
        height: 32px;
      }

      .alert-banner .alert-content h3 {
        font-size: 1.4rem;
        margin: 0 0 6px 0;
      }

      .alert-banner .alert-content p {
        font-size: 1.05rem;
        margin: 0;
      }

      .tab-content {
        padding: 20px;
      }

      .metrics-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .metric-card mat-card-content {
        padding: 20px !important;
        gap: 16px;
      }

      .metric-icon {
        width: 52px;
        height: 52px;
        flex-shrink: 0;
      }

      .metric-icon mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      .metric-info h3 {
        font-size: 0.8rem;
        margin: 0 0 4px 0;
      }

      .metric-info h2 {
        font-size: 1.5rem;
        margin: 0 0 4px 0;
      }

      .metric-detail {
        font-size: 0.75rem;
        margin: 0;
      }

      .chart-card mat-card-header {
        padding: 20px 20px 12px 20px !important;
      }

      .chart-card .mat-card-header-text {
        margin: 0 !important;
      }

      .chart-card mat-card-title {
        font-size: 1.2rem;
        margin-bottom: 6px;
      }

      .chart-card mat-card-subtitle {
        font-size: 0.9rem;
        line-height: 1.4;
      }

      .chart-container {
        height: 320px;
        padding: 20px;
        border-radius: 16px;
      }

      .filter-card mat-card-content {
        padding: 16px !important;
      }

      .filter-card mat-form-field {
        width: 100%;
        margin-bottom: 12px;
      }

      .filter-card mat-form-field .mat-form-field-wrapper {
        padding-bottom: 0;
      }

      .filter-card button {
        width: 100%;
        height: 44px;
        font-size: 1rem;
      }

      .featured-card mat-card-header {
        padding: 20px 20px 12px 20px !important;
      }

      .featured-card mat-card-title {
        font-size: 1.2rem;
        margin-bottom: 6px;
      }

      .featured-card mat-card-subtitle {
        font-size: 0.9rem;
      }

      .featured-vehicle {
        flex-direction: column;
        gap: 24px;
        text-align: center;
      }

      .vehicle-info h2 {
        font-size: 1.6rem;
        margin: 0 0 6px 0;
      }

      .registration {
        font-size: 1rem;
        margin: 0 0 20px 0;
      }

      .profit-stats {
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .stat-row {
        display: flex;
        justify-content: space-between;
        padding: 8px 0;
        border-bottom: 1px solid #eee;
        font-size: 1rem;
      }

      .stat-row.highlight {
        border-bottom: 2px solid #2196f3;
        font-weight: 600;
      }

      .table-container {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
        margin: 0 -20px;
        padding: 0 20px;
        border-radius: 12px;
      }

      .vehicles-table {
        min-width: 650px;
        font-size: 13px;
        border-radius: 12px;
      }

      .vehicles-table .mat-header-cell,
      .vehicles-table .mat-cell {
        padding: 10px 6px;
        min-width: 90px;
      }

      .vehicle-details-cell {
        min-width: 160px;
      }

      .status-column {
        min-width: 90px;
      }

      .health-column {
        min-width: 110px;
      }

      .driver-cell {
        min-width: 110px;
      }

      .profit-column {
        min-width: 90px;
      }

      .performance-table {
        min-width: 750px;
        font-size: 13px;
      }

      .performance-table .mat-header-cell,
      .performance-table .mat-cell {
        padding: 8px 4px;
      }

      .maintenance-table {
        min-width: 850px;
        font-size: 13px;
      }

      .maintenance-table .mat-header-cell,
      .maintenance-table .mat-cell {
        padding: 8px 4px;
      }

      .maintenance-table .issue-cell {
        max-width: 220px;
        white-space: normal;
        line-height: 1.4;
      }

      .alerts-list {
        gap: 12px;
      }

      .alert-item {
        padding: 12px;
        border-radius: 12px;
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }

      .alert-item mat-icon {
        align-self: flex-start;
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .alert-item h4 {
        font-size: 1.1rem;
        margin: 0 0 6px 0;
      }

      .alert-item p {
        font-size: 0.9rem;
        margin: 0 0 6px 0;
      }

      .alert-item small {
        font-size: 0.85rem;
      }

      .recommendations-list {
        gap: 12px;
      }

      .recommendation-item {
        padding: 12px;
        border-radius: 12px;
        flex-direction: column;
        align-items: flex-start;
        gap: 10px;
      }

      .recommendation-icon {
        width: 40px;
        height: 40px;
        align-self: flex-start;
      }

      .recommendation-icon mat-icon {
        font-size: 20px;
        width: 20px;
        height: 20px;
      }

      .recommendation-item h4 {
        font-size: 1.1rem;
        margin: 0 0 6px 0;
      }

      .recommendation-item p {
        font-size: 0.9rem;
        margin: 0 0 6px 0;
      }

      .forecast-summary {
        grid-template-columns: 1fr;
        gap: 16px;
      }

      .forecast-item {
        padding: 20px 16px;
        text-align: center;
        border-radius: 16px;
      }

      .forecast-icon {
        font-size: 36px;
        width: 36px;
        height: 36px;
        margin-bottom: 10px;
      }

      .forecast-item h3 {
        font-size: 1rem;
        margin: 10px 0;
      }

      .forecast-item h2 {
        font-size: 1.8rem;
        margin: 10px 0;
      }

      .forecast-notes {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding: 20px 16px;
        text-align: center;
        border-radius: 16px;
      }

      .forecast-notes mat-icon {
        align-self: center;
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      .forecast-notes h4 {
        margin: 0 0 10px 0;
        font-size: 1.1rem;
      }

      .forecast-notes p {
        margin: 0;
        font-size: 0.95rem;
        line-height: 1.5;
      }

      .no-data {
        text-align: center;
        padding: 48px 24px;
      }

      .no-data mat-icon {
        font-size: 56px;
        width: 56px;
        height: 56px;
        margin-bottom: 20px;
        opacity: 0.3;
      }

      .no-data h3 {
        font-size: 1.2rem;
        margin: 10px 0;
      }

      .no-data p {
        font-size: 0.95rem;
        margin: 10px 0 20px;
      }

      .no-data button {
        font-size: 1rem;
        padding: 10px 20px;
      }

      .dashboard-tabs .mat-tab-header {
        height: 48px;
        border-radius: 12px 12px 0 0;
      }

      .dashboard-tabs .mat-tab-label {
        min-width: 80px;
        padding: 0 12px;
        font-size: 13px;
        height: 48px;
        line-height: 48px;
      }

      .loading-container {
        padding: 48px 24px;
      }

      .loading-container p {
        font-size: 1rem;
        margin-top: 20px;
      }
    }

    /* Alert Banner */
    .alert-banner {
      margin: 20px 0;
      padding: 20px 25px;
      background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
      border-radius: 12px;
      display: flex;
      align-items: center;
      gap: 20px;
      cursor: pointer;
      transition: all 0.3s ease;
      box-shadow: 0 4px 12px rgba(255, 152, 0, 0.3);
      animation: slideIn 0.5s ease-out;
    }

    @keyframes slideIn {
      from {
        opacity: 0;
        transform: translateY(-20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .alert-banner:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(255, 152, 0, 0.4);
    }

    .alert-banner .alert-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      background: rgba(255, 255, 255, 0.2);
      border-radius: 50%;
      flex-shrink: 0;
    }

    .alert-banner .alert-icon mat-icon {
      font-size: 36px;
      width: 36px;
      height: 36px;
      color: white;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        transform: scale(1);
      }
      50% {
        transform: scale(1.1);
      }
    }

    .alert-banner .alert-content {
      flex: 1;
      color: white;
    }

    .alert-banner .alert-content h3 {
      margin: 0 0 5px 0;
      font-size: 1.3rem;
      font-weight: 600;
      color: white;
    }

    .alert-banner .alert-content p {
      margin: 0;
      font-size: 1rem;
      opacity: 0.95;
      color: white;
    }

    .alert-banner .alert-content strong {
      font-weight: 700;
      font-size: 1.1rem;
    }

    .alert-banner .alert-action {
      flex-shrink: 0;
    }

    .alert-banner .alert-action button {
      background: white !important;
      color: #ff9800 !important;
      font-weight: 600;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
    }

    .alert-banner .alert-action button:hover {
      background: #fff !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .alert-banner .alert-close {
      color: white;
      font-size: 32px;
      width: 32px;
      height: 32px;
      opacity: 0.8;
    }

    @media (max-width: 768px) {
      .alert-banner {
        flex-direction: column;
        text-align: center;
        padding: 20px;
        gap: 15px;
      }

      .alert-banner .alert-content {
        text-align: center;
      }

      .alert-banner .alert-action {
        align-self: stretch;
        text-align: center;
      }

      .alert-banner .alert-close {
        display: none;
      }
    }

    /* Snackbar styling */
    ::ng-deep .warning-snackbar {
      background-color: #ff9800 !important;
      color: white !important;
      font-weight: 500;
    }

    ::ng-deep .warning-snackbar .mat-simple-snack-bar-content {
      font-size: 14px;
    }

    ::ng-deep .warning-snackbar .mat-mdc-button {
      color: white !important;
      font-weight: 600;
    }

    /* Fleet Vehicles Tab Styles */
    .vehicles-table {
      width: 100%;
    }

    .vehicle-details-cell {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .vehicle-primary {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .vehicle-primary strong {
      font-size: 15px;
      color: #212529;
    }

    .year-chip {
      background: #e3f2fd !important;
      color: #1976d2 !important;
      font-size: 11px;
      height: 20px;
      line-height: 20px;
      padding: 0 8px;
    }

    .vehicle-secondary {
      display: flex;
      flex-direction: column;
      gap: 2px;
      font-size: 12px;
      color: #666;
    }

    .registration {
      font-weight: 600;
      color: #333;
    }

    .vin {
      color: #999;
      font-size: 11px;
    }

    .status-column {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .status-active {
      background: #4caf50 !important;
      color: white !important;
    }

    .status-inactive {
      background: #9e9e9e !important;
      color: white !important;
    }

    .service-status {
      background: #ff9800 !important;
      color: white !important;
    }

    .health-column {
      display: flex;
      flex-direction: column;
      gap: 8px;
      min-width: 120px;
    }

    .health-score {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .score-text {
      font-weight: 600;
      font-size: 14px;
    }

    .health-bar {
      width: 100%;
      height: 6px;
      background: #e0e0e0;
      border-radius: 3px;
      overflow: hidden;
    }

    .health-bar-fill {
      height: 100%;
      transition: width 0.3s ease;
    }

    .bar-good {
      background: linear-gradient(90deg, #4caf50, #8bc34a);
    }

    .bar-warning {
      background: linear-gradient(90deg, #ff9800, #ffc107);
    }

    .bar-critical {
      background: linear-gradient(90deg, #f44336, #e91e63);
    }

    .driver-cell {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #666;
    }

    .profit-column {
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .profit-value {
      font-size: 16px;
      font-weight: 600;
    }

    .profit-breakdown {
      display: flex;
      flex-direction: column;
      gap: 2px;
    }

    .profit-breakdown .earnings {
      color: #4caf50;
      font-size: 11px;
    }

    .profit-breakdown .expenses {
      color: #f44336;
      font-size: 11px;
    }

    .no-data {
      text-align: center;
      padding: 60px 20px;
      color: #999;
    }

    .no-data mat-icon {
      font-size: 80px;
      width: 80px;
      height: 80px;
      margin-bottom: 20px;
      opacity: 0.3;
    }

    .no-data h3 {
      margin: 10px 0;
      color: #666;
    }

    .no-data p {
      margin: 10px 0 20px;
      color: #999;
    }
  `]
})
export class OwnerDashboardEnhancedComponent implements OnInit, AfterViewInit {
  @ViewChild('earningsExpensesChart') chartCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('tabGroup') tabGroup!: MatTabGroup;
  private chart: Chart | null = null;

  loading = true;
  currentMonthName = '';
  periodStartDate = '';
  periodEndDate = '';
  
  // Date filter properties
  filterStartDate: Date = new Date();
  filterEndDate: Date = new Date();
  
  // Drill-down state
  drillDownLevel: 'month' | 'week' | 'day' = 'month';
  selectedVehicleId: string | null = null;
  selectedVehicleName: string | null = null;
  selectedWeekNumber: number | null = null;
  selectedWeekStart: Date | null = null;
  chartData: any[] = [];
  
  totalProfit = 0;
  totalEarnings = 0;
  totalExpenses = 0;
  totalVehicles = 0;
  activeVehicles = 0;
  inactiveVehicles = 0;
  vehiclesInService = 0;
  maintenanceAlerts = 0;
  avgProfitPerVehicle = 0;

  mostProfitableVehicle: any = null;
  vehiclePerformance: any[] = [];
  displayedColumns: string[] = ['vehicle', 'status', 'earnings', 'expenses', 'profit', 'health', 'performance'];

  maintenanceRequests: any[] = [];
  maintenanceRequestColumns: string[] = ['vehicle', 'issue', 'priority', 'status', 'requestedDate', 'scheduledDate', 'cost', 'actions'];

  healthAlerts: any[] = [];
  recommendations: any[] = [];

  projectedAnnualProfit = 0;
  projectedGrowthRate = 0;
  projectedMaintenanceCost = 0;

  private apiUrl = 'http://localhost:5000/api';

  constructor(
    private router: Router,
    private http: HttpClient,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  async ngOnInit() {
    const now = new Date();
    this.currentMonthName = now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    
    // Initialize filter dates to current month
    this.filterStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
    this.filterEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    await this.loadDashboardData();
  }

  async loadDashboardData() {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        this.router.navigate(['/login']);
        return;
      }

      const user = JSON.parse(userStr);
      const tenantId = user.tenantId;
      
      // Load only vehicles for this tenant
      const ownerVehicles: any = await this.http.get(`${this.apiUrl}/Vehicles/tenant/${tenantId}`).toPromise();
      
      this.totalVehicles = ownerVehicles.length;
      this.activeVehicles = ownerVehicles.filter((v: any) => v.status === 'Active').length;
      this.inactiveVehicles = this.totalVehicles - this.activeVehicles;

      const startDate = this.filterStartDate.toISOString().split('T')[0];
      const endDate = this.filterEndDate.toISOString().split('T')[0];

      // Store period for display
      this.periodStartDate = startDate;
      this.periodEndDate = endDate;

      const vehicleData = await Promise.all(ownerVehicles.map(async (vehicle: any) => {
        try {
          const earnings: any = await this.http.get(
            `${this.apiUrl}/VehicleEarnings/vehicle/${vehicle.id}/period?startDate=${startDate}&endDate=${endDate}`
          ).toPromise();
          
          const expenses: any = await this.http.get(
            `${this.apiUrl}/VehicleExpenses/vehicle/${vehicle.id}/period?startDate=${startDate}&endDate=${endDate}`
          ).toPromise();

          // Check if vehicle is in service/maintenance
          const serviceHistory: any = await this.http.get(
            `${this.apiUrl}/ServiceHistory/vehicle/${vehicle.id}`
          ).toPromise();

          const latestService = serviceHistory && serviceHistory.length > 0 
            ? serviceHistory.sort((a: any, b: any) => 
                new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime()
              )[0]
            : null;

          // Check if service is ongoing (service date within last 7 days and no completion)
          const isInService = latestService && 
            this.isDateWithinDays(new Date(latestService.serviceDate), 7) &&
            latestService.serviceType !== 'Completed';

          // Handle both array and single object responses
          const earningsArray = Array.isArray(earnings) ? earnings : (earnings ? [earnings] : []);
          const expensesArray = Array.isArray(expenses) ? expenses : (expenses ? [expenses] : []);

          const totalEarnings = earningsArray.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);
          const totalExpenses = expensesArray.reduce((sum: number, e: any) => sum + (e.amount || 0), 0);

          console.log(`Vehicle ${vehicle.registration}: Earnings=${totalEarnings}, Expenses=${totalExpenses}`);

          return {
            ...vehicle,
            earnings: totalEarnings,
            expenses: totalExpenses,
            profit: totalEarnings - totalExpenses,
            healthScore: this.calculateHealthScore(vehicle),
            isInService: isInService,
            serviceType: latestService?.serviceType || '',
            serviceMessage: latestService 
              ? `${latestService.serviceType} - ${latestService.description || 'In progress'}`
              : ''
          };
        } catch (error) {
          console.error(`Error loading data for vehicle ${vehicle.registration}:`, error);
          return {
            ...vehicle,
            earnings: 0,
            expenses: 0,
            profit: 0,
            healthScore: 50,
            isInService: false,
            serviceType: '',
            serviceMessage: ''
          };
        }
      }));

      this.vehiclePerformance = vehicleData;
      this.vehiclesInService = vehicleData.filter(v => v.isInService).length;

      this.totalEarnings = vehicleData.reduce((sum, v) => sum + (v.earnings || 0), 0);
      this.totalExpenses = vehicleData.reduce((sum, v) => sum + (v.expenses || 0), 0);
      this.totalProfit = this.totalEarnings - this.totalExpenses;
      this.avgProfitPerVehicle = this.totalVehicles > 0 ? this.totalProfit / this.totalVehicles : 0;

      console.log('Dashboard Summary:', {
        totalVehicles: this.totalVehicles,
        totalEarnings: this.totalEarnings,
        totalExpenses: this.totalExpenses,
        totalProfit: this.totalProfit,
        avgProfitPerVehicle: this.avgProfitPerVehicle
      });

      if (vehicleData.length > 0) {
        this.mostProfitableVehicle = vehicleData.reduce((max, v) => v.profit > max.profit ? v : max);
      }

      // Load maintenance requests
      await this.loadMaintenanceRequests(user.tenantId, ownerVehicles);

      this.generateHealthAlerts(vehicleData);
      this.generateRecommendations(vehicleData);
      this.calculateForecast();

      // Create chart after data is loaded
      setTimeout(() => this.createChart(), 200);

    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      this.loading = false;
    }
  }

  ngAfterViewInit() {
    // Chart will be created after data is loaded in loadDashboardData
  }

  createChart() {
    if (!this.chartCanvas || !this.chartCanvas.nativeElement) {
      console.log('Chart canvas not available');
      return;
    }
    
    const dataSource = this.drillDownLevel === 'month' ? this.vehiclePerformance : this.chartData;
    
    if (dataSource.length === 0) {
      console.log('No data available for chart');
      return;
    }

    const ctx = this.chartCanvas.nativeElement.getContext('2d');
    if (!ctx) {
      console.log('Could not get chart context');
      return;
    }

    // Destroy existing chart if any
    if (this.chart) {
      this.chart.destroy();
    }

    console.log('Creating chart with', dataSource.length, 'data points at level:', this.drillDownLevel);

    let labels: string[];
    let earningsData: number[];
    let expensesData: number[];
    let profitData: number[];

    if (this.drillDownLevel === 'month') {
      labels = dataSource.map(v => `${v.make} ${v.model} (${v.registration})`);
      earningsData = dataSource.map(v => v.earnings);
      expensesData = dataSource.map(v => v.expenses);
      profitData = dataSource.map(v => v.earnings - v.expenses);
    } else if (this.drillDownLevel === 'week') {
      labels = dataSource.map((d: any) => d.label);
      earningsData = dataSource.map((d: any) => d.earnings);
      expensesData = dataSource.map((d: any) => d.expenses);
      profitData = dataSource.map((d: any) => d.earnings - d.expenses);
    } else {
      labels = dataSource.map((d: any) => d.label);
      earningsData = dataSource.map((d: any) => d.earnings);
      expensesData = dataSource.map((d: any) => d.expenses);
      profitData = dataSource.map((d: any) => d.earnings - d.expenses);
    }

    const config: ChartConfiguration = {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Earnings',
            data: earningsData,
            backgroundColor: this.createGradient(ctx, '#10b981', '#059669'),
            borderColor: '#059669',
            borderWidth: 0,
            borderRadius: 8,
            borderSkipped: false,
            hoverBackgroundColor: this.createGradient(ctx, '#34d399', '#10b981'),
            hoverBorderColor: '#047857',
            hoverBorderWidth: 3
          },
          {
            label: 'Expenses',
            data: expensesData,
            backgroundColor: this.createGradient(ctx, '#ef4444', '#dc2626'),
            borderColor: '#dc2626',
            borderWidth: 0,
            borderRadius: 8,
            borderSkipped: false,
            hoverBackgroundColor: this.createGradient(ctx, '#f87171', '#ef4444'),
            hoverBorderColor: '#b91c1c',
            hoverBorderWidth: 3
          },
          {
            label: 'Profit',
            data: profitData,
            backgroundColor: this.createGradient(ctx, '#3b82f6', '#2563eb'),
            borderColor: '#2563eb',
            borderWidth: 0,
            borderRadius: 8,
            borderSkipped: false,
            hoverBackgroundColor: this.createGradient(ctx, '#60a5fa', '#3b82f6'),
            hoverBorderColor: '#1d4ed8',
            hoverBorderWidth: 3
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        aspectRatio: window.innerWidth <= 430 ? 1.2 : 2,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        animation: {
          duration: 1000,
          easing: 'easeInOutQuart'
        },
        plugins: {
          legend: {
            display: true,
            position: window.innerWidth <= 430 ? 'bottom' : 'top',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: window.innerWidth <= 430 ? 10 : 20,
              font: {
                size: window.innerWidth <= 430 ? 11 : 13,
                weight: 600,
                family: "'Inter', 'Segoe UI', sans-serif"
              },
              color: '#374151'
            }
          },
          title: {
            display: false
          },
          tooltip: {
            enabled: true,
            backgroundColor: 'rgba(17, 24, 39, 0.95)',
            titleColor: '#f9fafb',
            bodyColor: '#f9fafb',
            titleFont: {
              size: 14,
              weight: 'bold',
              family: "'Inter', 'Segoe UI', sans-serif"
            },
            bodyFont: {
              size: 13,
              family: "'Inter', 'Segoe UI', sans-serif"
            },
            padding: 16,
            cornerRadius: 12,
            displayColors: true,
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1,
            callbacks: {
              title: (context) => {
                return context[0].label;
              },
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y || 0;
                return ` ${label}: R${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
              }
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: {
              color: 'rgba(229, 231, 235, 0.5)'
            },
            border: {
              display: false
            },
            ticks: {
              callback: (value) => 'R' + value.toLocaleString('en-ZA'),
              font: {
                size: 12,
                family: "'Inter', 'Segoe UI', sans-serif"
              },
              color: '#6b7280',
              padding: 10
            }
          },
          x: {
            grid: {
              display: false
            },
            border: {
              display: false
            },
            ticks: {
              maxRotation: 45,
              minRotation: 45,
              font: {
                size: 11,
                weight: 500,
                family: "'Inter', 'Segoe UI', sans-serif"
              },
              color: '#6b7280',
              padding: 8
            }
          }
        },
        onClick: (event, elements) => {
          if (elements.length > 0) {
            const elementIndex = elements[0].index;
            this.handleChartClick(elementIndex);
          }
        }
      }
    };

    this.chart = new Chart(ctx, config);
  }

  createGradient(ctx: CanvasRenderingContext2D, color1: string, color2: string): CanvasGradient {
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, color1);
    gradient.addColorStop(1, color2);
    return gradient;
  }

  async handleChartClick(index: number) {
    if (this.drillDownLevel === 'month') {
      // Drill down to weekly view for selected vehicle
      const vehicle = this.vehiclePerformance[index];
      this.selectedVehicleId = vehicle.id;
      this.selectedVehicleName = `${vehicle.make} ${vehicle.model} (${vehicle.registration})`;
      this.drillDownLevel = 'week';
      await this.loadWeeklyData(vehicle.id);
    } else if (this.drillDownLevel === 'week') {
      // Drill down to daily view for selected week
      const weekData = this.chartData[index];
      this.selectedWeekNumber = weekData.weekNumber;
      this.selectedWeekStart = weekData.weekStart;
      this.drillDownLevel = 'day';
      await this.loadDailyData(this.selectedVehicleId!, weekData.weekStart, weekData.weekEnd);
    }
    // No further drill-down from day level
  }

  async loadWeeklyData(vehicleId: string) {
    try {
      const now = new Date();
      const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      const earnings: any = await this.http.get(
        `${this.apiUrl}/VehicleEarnings/vehicle/${vehicleId}/period?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`
      ).toPromise();
      
      const expenses: any = await this.http.get(
        `${this.apiUrl}/VehicleExpenses/vehicle/${vehicleId}/period?startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`
      ).toPromise();

      // Group by week
      const weekMap = new Map<number, any>();
      
      earnings?.forEach((e: any) => {
        const date = new Date(e.date);
        const weekNumber = this.getWeekNumber(date);
        const weekStart = this.getWeekStart(date);
        const weekEnd = this.getWeekEnd(weekStart);
        
        if (!weekMap.has(weekNumber)) {
          weekMap.set(weekNumber, {
            weekNumber,
            weekStart,
            weekEnd,
            label: `Week ${weekNumber} (${this.formatDate(weekStart)} - ${this.formatDate(weekEnd)})`,
            earnings: 0,
            expenses: 0
          });
        }
        weekMap.get(weekNumber)!.earnings += e.amount;
      });

      expenses?.forEach((e: any) => {
        const date = new Date(e.date);
        const weekNumber = this.getWeekNumber(date);
        const weekStart = this.getWeekStart(date);
        const weekEnd = this.getWeekEnd(weekStart);
        
        if (!weekMap.has(weekNumber)) {
          weekMap.set(weekNumber, {
            weekNumber,
            weekStart,
            weekEnd,
            label: `Week ${weekNumber} (${this.formatDate(weekStart)} - ${this.formatDate(weekEnd)})`,
            earnings: 0,
            expenses: 0
          });
        }
        weekMap.get(weekNumber)!.expenses += e.amount;
      });

      this.chartData = Array.from(weekMap.values()).sort((a, b) => a.weekNumber - b.weekNumber);
      this.createChart();
    } catch (error) {
      console.error('Error loading weekly data:', error);
    }
  }

  async loadDailyData(vehicleId: string, weekStart: Date, weekEnd: Date) {
    try {
      const earnings: any = await this.http.get(
        `${this.apiUrl}/VehicleEarnings/vehicle/${vehicleId}/period?startDate=${this.formatDateISO(weekStart)}&endDate=${this.formatDateISO(weekEnd)}`
      ).toPromise();
      
      const expenses: any = await this.http.get(
        `${this.apiUrl}/VehicleExpenses/vehicle/${vehicleId}/period?startDate=${this.formatDateISO(weekStart)}&endDate=${this.formatDateISO(weekEnd)}`
      ).toPromise();

      // Group by day
      const dayMap = new Map<string, any>();
      
      // Initialize all days in the week
      const currentDate = new Date(weekStart);
      while (currentDate <= weekEnd) {
        const dateStr = this.formatDateISO(currentDate);
        dayMap.set(dateStr, {
          date: new Date(currentDate),
          label: this.formatDate(currentDate),
          earnings: 0,
          expenses: 0
        });
        currentDate.setDate(currentDate.getDate() + 1);
      }

      earnings?.forEach((e: any) => {
        const dateStr = e.date.split('T')[0];
        if (dayMap.has(dateStr)) {
          dayMap.get(dateStr)!.earnings += e.amount;
        }
      });

      expenses?.forEach((e: any) => {
        const dateStr = e.date.split('T')[0];
        if (dayMap.has(dateStr)) {
          dayMap.get(dateStr)!.expenses += e.amount;
        }
      });

      this.chartData = Array.from(dayMap.values()).sort((a, b) => a.date.getTime() - b.date.getTime());
      this.createChart();
    } catch (error) {
      console.error('Error loading daily data:', error);
    }
  }

  getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  }

  getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  }

  getWeekEnd(weekStart: Date): Date {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 6);
    return d;
  }

  formatDate(date: Date): string {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }

  formatDateISO(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  resetDrillDown() {
    this.drillDownLevel = 'month';
    this.selectedVehicleId = null;
    this.selectedVehicleName = null;
    this.selectedWeekNumber = null;
    this.selectedWeekStart = null;
    this.chartData = [];
    this.createChart();
  }

  drillToMonth() {
    this.drillDownLevel = 'week';
    this.selectedWeekNumber = null;
    this.selectedWeekStart = null;
    this.loadWeeklyData(this.selectedVehicleId!);
  }

  drillToWeek() {
    this.drillDownLevel = 'day';
    this.loadWeeklyData(this.selectedVehicleId!);
  }

  getChartSubtitle(): string {
    if (this.drillDownLevel === 'month') {
      return 'Current Month Performance by Vehicle - Click to view weekly data';
    } else if (this.drillDownLevel === 'week') {
      return `Weekly Performance for ${this.selectedVehicleName} - Click to view daily data`;
    } else {
      return `Daily Performance for Week ${this.selectedWeekNumber}`;
    }
  }

  isDateWithinDays(date: Date, days: number): boolean {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= days;
  }

  calculateHealthScore(vehicle: any): number {
    let score = 100;
    
    if (vehicle.lastServiceDate) {
      const daysSince = Math.floor((Date.now() - new Date(vehicle.lastServiceDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince > 180) score -= 30;
      else if (daysSince > 120) score -= 20;
      else if (daysSince > 90) score -= 10;
    } else {
      score -= 40;
    }

    if (vehicle.nextServiceDate) {
      const daysUntil = Math.floor((new Date(vehicle.nextServiceDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      if (daysUntil < 0) score -= 25;
      else if (daysUntil < 7) score -= 15;
    }

    if (vehicle.mileage > 200000) score -= 20;
    else if (vehicle.mileage > 150000) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  generateHealthAlerts(vehicles: any[]) {
    this.healthAlerts = [];
    
    vehicles.forEach(vehicle => {
      const v = `${vehicle.make} ${vehicle.model} (${vehicle.registration})`;
      
      if (vehicle.healthScore < 50) {
        this.healthAlerts.push({
          severity: 'critical',
          icon: 'error',
          vehicle: v,
          message: 'Critical maintenance required',
          recommendation: 'Schedule immediate inspection to prevent breakdowns'
        });
      } else if (vehicle.healthScore < 80) {
        this.healthAlerts.push({
          severity: 'warning',
          icon: 'warning',
          vehicle: v,
          message: 'Maintenance recommended',
          recommendation: 'Schedule service within 2 weeks'
        });
      }

      if (vehicle.nextServiceDate && new Date(vehicle.nextServiceDate) < new Date()) {
        this.healthAlerts.push({
          severity: 'warning',
          icon: 'schedule',
          vehicle: v,
          message: 'Service overdue',
          recommendation: 'Schedule appointment ASAP'
        });
      }
    });
  }

  generateRecommendations(vehicles: any[]) {
    this.recommendations = [];

    const lowPerformers = vehicles.filter(v => v.profit < 0);
    if (lowPerformers.length > 0) {
      this.recommendations.push({
        priority: 'high',
        icon: 'trending_down',
        title: `${lowPerformers.length} Vehicle(s) Operating at Loss`,
        description: `Review expenses for ${lowPerformers.map(v => v.registration).join(', ')}`,
        potentialImpact: `Save up to R${Math.abs(lowPerformers.reduce((s, v) => s + v.profit, 0)).toFixed(2)}/month`
      });
    }

    const avgExpense = this.totalExpenses / vehicles.length;
    const highExpense = vehicles.filter(v => v.expenses > avgExpense * 1.5);
    if (highExpense.length > 0) {
      this.recommendations.push({
        priority: 'medium',
        icon: 'money_off',
        title: 'High Expense Vehicles Detected',
        description: `${highExpense.length} vehicle(s) with unusually high expenses`,
        potentialImpact: 'R5,000 - R15,000 monthly savings potential'
      });
    }

    const poorHealth = vehicles.filter(v => v.healthScore < 60);
    if (poorHealth.length > 0) {
      this.recommendations.push({
        priority: 'high',
        icon: 'build_circle',
        title: 'Preventive Maintenance Needed',
        description: `${poorHealth.length} vehicle(s) need attention`,
        potentialImpact: 'Prevent up to R50,000 in breakdown costs'
      });
    }

    if (this.inactiveVehicles > 0) {
      this.recommendations.push({
        priority: 'medium',
        icon: 'directions_car_filled',
        title: `${this.inactiveVehicles} Inactive Vehicle(s)`,
        description: 'Consider activating or evaluating for sale/rent',
        potentialImpact: 'Generate R10,000+ monthly revenue'
      });
    }
  }

  calculateForecast() {
    this.projectedAnnualProfit = this.totalProfit * 12;
    const baseline = this.totalEarnings * 0.7;
    this.projectedGrowthRate = baseline > 0 ? ((this.totalProfit - baseline) / baseline) * 100 : 0;
    this.projectedMaintenanceCost = this.totalEarnings * 12 * 0.12;
  }

  getHealthIcon(score: number): string {
    if (score >= 80) return 'check_circle';
    if (score >= 50) return 'warning';
    return 'error';
  }

  getHealthTooltip(vehicle: any): string {
    return `Health: ${vehicle.healthScore}% - Based on maintenance history`;
  }

  getPerformancePercentage(profit: number): number {
    if (this.vehiclePerformance.length === 0) return 0;
    const maxProfit = Math.max(...this.vehiclePerformance.map(v => Math.abs(v.profit)));
    return maxProfit > 0 ? Math.min(100, (Math.abs(profit) / maxProfit) * 100) : 0;
  }

  navigateToMaintenanceTab() {
    // Navigate to the Maintenance Requests tab (index 4)
    // Overview = 0, Fleet Vehicles = 1, Performance = 2, Health & Maintenance = 3, Maintenance Requests = 4
    if (this.tabGroup) {
      this.tabGroup.selectedIndex = 4;
      // Scroll to top of page
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  navigateToMaintenance() {
    this.router.navigate(['/maintenance']);
  }

  async loadMaintenanceRequests(tenantId: string, ownerVehicles: any[]) {
    try {
      // Get all mechanical requests
      const allRequests: any = await this.http.get(`${this.apiUrl}/MechanicalRequests`).toPromise();
      
      // Filter requests for this tenant's vehicles
      const vehicleIds = ownerVehicles.map(v => v.id);
      this.maintenanceRequests = allRequests
        .filter((req: any) => vehicleIds.includes(req.vehicleId))
        .map((req: any) => {
          const vehicle = ownerVehicles.find(v => v.id === req.vehicleId);
          return {
            ...req,
            vehicleRegistration: vehicle?.registration,
            vehicleMake: vehicle?.make,
            vehicleModel: vehicle?.model,
            requestedDate: req.createdAt || req.requestedDate // Map createdAt to requestedDate
          };
        })
        .sort((a: any, b: any) => new Date(b.requestedDate).getTime() - new Date(a.requestedDate).getTime());
      
      // Update maintenance alerts count
      this.maintenanceAlerts = this.maintenanceRequests.filter((req: any) => req.state === 'Pending').length;
      
      console.log('Loaded maintenance requests:', this.maintenanceRequests.length);
    } catch (error) {
      console.error('Error loading maintenance requests:', error);
      this.maintenanceRequests = [];
    }
  }

  async approveRequest(requestId: string) {
    try {
      await this.http.put(`${this.apiUrl}/MechanicalRequests/${requestId}/approve`, {}).toPromise();
      
      // Update local data
      const request = this.maintenanceRequests.find(r => r.id === requestId);
      if (request) {
        request.state = 'Approved';
      }
      
      // Refresh the count
      this.maintenanceAlerts = this.maintenanceRequests.filter((req: any) => req.state === 'Pending').length;
      
      console.log('Request approved successfully');
    } catch (error) {
      console.error('Error approving request:', error);
      alert('Failed to approve request. Please try again.');
    }
  }

  async declineRequest(requestId: string) {
    const reason = prompt('Please provide a reason for declining this request:');
    if (!reason) return;
    
    try {
      await this.http.put(`${this.apiUrl}/MechanicalRequests/${requestId}/decline`, { reason }).toPromise();
      
      // Update local data
      const request = this.maintenanceRequests.find(r => r.id === requestId);
      if (request) {
        request.state = 'Declined';
        request.declineReason = reason;
      }
      
      // Refresh the count
      this.maintenanceAlerts = this.maintenanceRequests.filter((req: any) => req.state === 'Pending').length;
      
      console.log('Request declined successfully');
    } catch (error) {
      console.error('Error declining request:', error);
      alert('Failed to decline request. Please try again.');
    }
  }

  async scheduleRequest(requestId: string) {
    // Find the request to get its details
    const request = this.maintenanceRequests.find(r => r.id === requestId);
    if (!request) {
      this.snackBar.open('Request not found', 'Close', { duration: 3000 });
      return;
    }

    const dialogRef = this.dialog.open(ScheduleServiceDialogComponent, {
      width: '700px',
      maxHeight: '90vh',
      data: {
        requestId: requestId,
        request: {
          id: request.id,
          vehicleName: request.vehicleName,
          requestType: request.issueDescription || 'Maintenance',
          category: request.priority || 'Normal',
          description: request.issueDescription || 'No description provided'
        }
      }
    });

    dialogRef.afterClosed().subscribe(async result => {
      if (!result) return;

      try {
        const userStr = localStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;
        const scheduledBy = user?.email || 'Owner';

        await this.http.put(`${this.apiUrl}/MechanicalRequests/${requestId}/schedule`, {
          scheduledDate: result.scheduledDate.toISOString(),
          serviceProvider: result.providerName,
          scheduledBy: scheduledBy
        }).toPromise();
        
        // Update local data
        const request = this.maintenanceRequests.find(r => r.id === requestId);
        if (request) {
          request.state = 'Scheduled';
          request.scheduledDate = result.scheduledDate;
          request.serviceProvider = result.providerName;
        }
        
        this.snackBar.open('Maintenance request scheduled successfully!', 'Close', { duration: 3000 });
        console.log('Request scheduled successfully');
      } catch (error) {
        console.error('Error scheduling request:', error);
        this.snackBar.open('Failed to schedule request. Please try again.', 'Close', { duration: 3000 });
      }
    });
  }

  async completeRequest(requestId: string) {
    const request = this.maintenanceRequests.find(r => r.id === requestId);
    if (!request) {
      this.snackBar.open('Request not found', 'Close', { duration: 3000 });
      return;
    }

    // Prompt for completion details
    const serviceCostStr = prompt('Enter service cost (R):');
    if (serviceCostStr === null) return; // User cancelled
    
    const serviceCost = parseFloat(serviceCostStr) || 0;
    const mileageStr = prompt('Enter vehicle mileage at service:');
    if (mileageStr === null) return; // User cancelled
    
    const mileage = parseInt(mileageStr) || 0;
    const invoiceNumber = prompt('Enter invoice number (optional):') || '';
    const completionNotes = prompt('Enter completion notes (optional):') || 'Service completed';
    const ratingStr = prompt('Rate the service provider (1-5 stars, optional):');
    const rating = ratingStr ? parseInt(ratingStr) : null;
    
    // Validate rating if provided
    if (rating !== null && (rating < 1 || rating > 5)) {
      alert('Rating must be between 1 and 5 stars');
      return;
    }

    try {
      await this.http.put(`${this.apiUrl}/MechanicalRequests/${requestId}/complete`, {
        completedDate: new Date().toISOString(),
        serviceCost: serviceCost,
        mileageAtService: mileage,
        invoiceNumber: invoiceNumber,
        completionNotes: completionNotes,
        serviceProviderRating: rating
      }).toPromise();
      
      // Update local data
      request.state = 'Completed';
      request.completedDate = new Date();
      
      // Refresh maintenance alerts count
      this.maintenanceAlerts = this.maintenanceRequests.filter((req: any) => req.state === 'Pending').length;
      
      this.snackBar.open('Maintenance request completed and recorded in service history!', 'Close', { duration: 5000 });
      console.log('Request completed successfully');
    } catch (error) {
      console.error('Error completing request:', error);
      this.snackBar.open('Failed to complete request. Please try again.', 'Close', { duration: 3000 });
    }
  }

  viewVehicleDetails(vehicleId: string) {
    this.router.navigate(['/owner-dashboard/vehicles', vehicleId]);
  }

  navigateToVehicles() {
    this.router.navigate(['/owner-dashboard/vehicles']);
  }

  scheduleService(vehicle: any) {
    const dialogRef = this.dialog.open(ScheduleServiceDialogComponent, {
      width: '600px',
      data: {
        vehicleId: vehicle.id,
        vehicleName: `${vehicle.make} ${vehicle.model} (${vehicle.registration})`
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.snackBar.open('Service scheduled successfully', 'Close', { duration: 3000 });
        // Reload dashboard data to reflect the changes
        this.loadDashboardData();
      }
    });
  }

  async applyDateFilter() {
    this.loading = true;
    this.drillDownLevel = 'month'; // Reset drill-down when applying new filter
    this.selectedVehicleId = null;
    this.selectedVehicleName = null;
    await this.loadDashboardData();
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.router.navigate(['/login']);
  }
}
