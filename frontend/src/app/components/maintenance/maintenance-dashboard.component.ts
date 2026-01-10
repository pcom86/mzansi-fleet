import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { ScheduleServiceDialogComponent } from './schedule-service-dialog.component';

@Component({
  selector: 'app-maintenance-dashboard',
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
    MatTabsModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatCheckboxModule
  ],
  template: `
    <div class="maintenance-dashboard">
      <div class="dashboard-header">
        <div class="header-content">
          <div class="header-top">
            <button mat-raised-button routerLink="/owner-dashboard/analytics" class="back-button">
              <mat-icon>arrow_back</mat-icon>
              Back to Dashboard
            </button>
            <button mat-raised-button color="primary" (click)="showNewRequestForm = !showNewRequestForm">
              <mat-icon>add</mat-icon>
              {{ showNewRequestForm ? 'Cancel' : 'New Request' }}
            </button>
          </div>
          <h1>Fleet Maintenance & Service</h1>
          <p>Comprehensive maintenance tracking and history</p>
        </div>
      </div>

      <div *ngIf="loading" class="loading-container">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        <p>Loading maintenance data...</p>
      </div>

      <div *ngIf="!loading" class="dashboard-content">
        <!-- New Request Form -->
        <mat-card *ngIf="showNewRequestForm" class="new-request-card">
          <mat-card-header>
            <mat-icon mat-card-avatar color="primary">add_circle</mat-icon>
            <mat-card-title>Create Maintenance Request</mat-card-title>
            <mat-card-subtitle>As an owner, you can create requests for any vehicle in your fleet</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <form #requestForm="ngForm" (ngSubmit)="submitOwnerRequest()">
              <div class="form-grid">
                <mat-form-field appearance="outline">
                  <mat-label>Vehicle</mat-label>
                  <mat-select [(ngModel)]="newRequest.vehicleId" name="vehicleId" required>
                    <mat-option *ngFor="let vehicle of ownerVehicles" [value]="vehicle.id">
                      {{ vehicle.make }} {{ vehicle.model }} ({{ vehicle.registration }})
                    </mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Request Type</mat-label>
                  <mat-select [(ngModel)]="newRequest.category" name="category" required>
                    <mat-option value="Routine Service">Routine Service</mat-option>
                    <mat-option value="Urgent Repair">Urgent Repair</mat-option>
                    <mat-option value="Tire Service">Tire Service</mat-option>
                    <mat-option value="Brake Service">Brake Service</mat-option>
                    <mat-option value="Engine Issue">Engine Issue</mat-option>
                    <mat-option value="Electrical">Electrical</mat-option>
                    <mat-option value="Body Work">Body Work</mat-option>
                    <mat-option value="Other">Other</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Priority</mat-label>
                  <mat-select [(ngModel)]="newRequest.priority" name="priority" required>
                    <mat-option value="Low">Low - Can wait</mat-option>
                    <mat-option value="Medium">Medium - Within a week</mat-option>
                    <mat-option value="High">High - Urgent attention needed</mat-option>
                    <mat-option value="Critical">Critical - Vehicle unsafe</mat-option>
                  </mat-select>
                </mat-form-field>

                <mat-form-field appearance="outline">
                  <mat-label>Location</mat-label>
                  <input matInput [(ngModel)]="newRequest.location" name="location" placeholder="Vehicle location">
                </mat-form-field>
              </div>

              <mat-form-field appearance="outline" class="full-width">
                <mat-label>Description</mat-label>
                <textarea 
                  matInput 
                  [(ngModel)]="newRequest.description" 
                  name="description"
                  rows="3"
                  placeholder="Describe the issue or service needed..."
                  required>
                </textarea>
              </mat-form-field>

              <div class="form-row">
                <mat-form-field appearance="outline">
                  <mat-label>Preferred Service Date</mat-label>
                  <input 
                    matInput 
                    [matDatepicker]="newPicker"
                    [(ngModel)]="newRequest.preferredTime"
                    name="preferredTime">
                  <mat-datepicker-toggle matSuffix [for]="newPicker"></mat-datepicker-toggle>
                  <mat-datepicker #newPicker></mat-datepicker>
                </mat-form-field>

                <mat-checkbox [(ngModel)]="newRequest.callOutRequired" name="callOutRequired">
                  Call-out service required
                </mat-checkbox>
              </div>

              <div class="form-actions">
                <button mat-button type="button" (click)="showNewRequestForm = false">Cancel</button>
                <button 
                  mat-raised-button 
                  color="primary" 
                  type="submit"
                  [disabled]="!requestForm.valid || submittingRequest">
                  <mat-icon>send</mat-icon>
                  Submit Request
                </button>
              </div>
            </form>
          </mat-card-content>
        </mat-card>

        <!-- Stats Overview -->
        <div class="stats-grid">
          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-icon total-services">
                <mat-icon>build_circle</mat-icon>
              </div>
              <div class="stat-info">
                <h3>Total Services</h3>
                <h2>{{ totalServices }}</h2>
                <p>All time</p>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-icon active-requests">
                <mat-icon>pending_actions</mat-icon>
              </div>
              <div class="stat-info">
                <h3>Active Requests</h3>
                <h2>{{ activeRequests }}</h2>
                <p>In progress</p>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-icon total-cost">
                <mat-icon>attach_money</mat-icon>
              </div>
              <div class="stat-info">
                <h3>Total Cost</h3>
                <h2>R{{ totalCost.toFixed(2) }}</h2>
                <p>This year</p>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card">
            <mat-card-content>
              <div class="stat-icon avg-cost">
                <mat-icon>trending_up</mat-icon>
              </div>
              <div class="stat-info">
                <h3>Avg Cost/Service</h3>
                <h2>R{{ avgCostPerService.toFixed(2) }}</h2>
                <p>Per service</p>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- Tabs -->
        <mat-tab-group class="maintenance-tabs">
          <!-- Maintenance Requests Tab -->
          <mat-tab label="Maintenance Requests">
            <div class="tab-content">
              <mat-card>
                <mat-card-header>
                  <mat-icon mat-card-avatar>list_alt</mat-icon>
                  <mat-card-title>Recent Maintenance Requests</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="table-container">
                    <table mat-table [dataSource]="maintenanceRequests" class="requests-table">
                      <ng-container matColumnDef="vehicle">
                        <th mat-header-cell *matHeaderCellDef>Vehicle</th>
                        <td mat-cell *matCellDef="let request">
                          <div class="vehicle-info">
                            <strong>{{ request.vehicleName }}</strong><br>
                            <small>{{ request.registration }}</small>
                          </div>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="type">
                        <th mat-header-cell *matHeaderCellDef>Type</th>
                        <td mat-cell *matCellDef="let request">
                          <mat-chip>{{ request.requestType }}</mat-chip>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="description">
                        <th mat-header-cell *matHeaderCellDef>Description</th>
                        <td mat-cell *matCellDef="let request">{{ request.description }}</td>
                      </ng-container>

                      <ng-container matColumnDef="priority">
                        <th mat-header-cell *matHeaderCellDef>Priority</th>
                        <td mat-cell *matCellDef="let request">
                          <mat-chip [class.priority-high]="request.priority === 'High'"
                                    [class.priority-medium]="request.priority === 'Medium'"
                                    [class.priority-low]="request.priority === 'Low'">
                            {{ request.priority }}
                          </mat-chip>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="status">
                        <th mat-header-cell *matHeaderCellDef>Status</th>
                        <td mat-cell *matCellDef="let request">
                          <mat-chip [class.status-pending]="request.state === 'Pending'"
                                    [class.status-progress]="request.state === 'Approved'"
                                    [class.status-completed]="request.state === 'Completed' || request.state === 'Scheduled'"
                                    [class.status-declined]="request.state === 'Declined'">
                            {{ request.state }}
                          </mat-chip>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="date">
                        <th mat-header-cell *matHeaderCellDef>Request Date</th>
                        <td mat-cell *matCellDef="let request">{{ request.requestDate | date:'short' }}</td>
                      </ng-container>

                      <ng-container matColumnDef="actions">
                        <th mat-header-cell *matHeaderCellDef>Actions</th>
                        <td mat-cell *matCellDef="let request">
                          <div class="action-buttons" *ngIf="request.state === 'Pending'">
                            <button mat-mini-fab color="primary" 
                                    (click)="approveRequest(request)"
                                    matTooltip="Approve">
                              <mat-icon>check</mat-icon>
                            </button>
                            <button mat-mini-fab color="warn" 
                                    (click)="declineRequest(request)"
                                    matTooltip="Decline">
                              <mat-icon>close</mat-icon>
                            </button>
                          </div>
                          <button mat-raised-button color="accent" 
                                  *ngIf="request.state === 'Approved' && !request.serviceProvider"
                                  (click)="scheduleService(request)">
                            <mat-icon>event</mat-icon>
                            Schedule
                          </button>
                          <span *ngIf="request.state !== 'Pending' && (request.state !== 'Approved' || request.serviceProvider)">-</span>
                        </td>
                      </ng-container>

                      <tr mat-header-row *matHeaderRowDef="requestColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: requestColumns;"></tr>
                    </table>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

          <!-- Service History Tab -->
          <mat-tab label="Service History">
            <div class="tab-content">
              <mat-card>
                <mat-card-header>
                  <mat-icon mat-card-avatar>history</mat-icon>
                  <mat-card-title>Complete Service History</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="table-container">
                    <table mat-table [dataSource]="serviceHistory" class="history-table">
                      <ng-container matColumnDef="vehicle">
                        <th mat-header-cell *matHeaderCellDef>Vehicle</th>
                        <td mat-cell *matCellDef="let service">
                          <div class="vehicle-info">
                            <strong>{{ service.vehicleName }}</strong><br>
                            <small>{{ service.registration }}</small>
                          </div>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="serviceDate">
                        <th mat-header-cell *matHeaderCellDef>Service Date</th>
                        <td mat-cell *matCellDef="let service">{{ service.serviceDate | date:'medium' }}</td>
                      </ng-container>

                      <ng-container matColumnDef="serviceType">
                        <th mat-header-cell *matHeaderCellDef>Type</th>
                        <td mat-cell *matCellDef="let service">
                          <mat-chip>{{ service.serviceType }}</mat-chip>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="description">
                        <th mat-header-cell *matHeaderCellDef>Description</th>
                        <td mat-cell *matCellDef="let service">{{ service.description }}</td>
                      </ng-container>

                      <ng-container matColumnDef="mileage">
                        <th mat-header-cell *matHeaderCellDef>Mileage</th>
                        <td mat-cell *matCellDef="let service">{{ service.mileageAtService | number }} km</td>
                      </ng-container>

                      <ng-container matColumnDef="cost">
                        <th mat-header-cell *matHeaderCellDef>Cost</th>
                        <td mat-cell *matCellDef="let service" class="cost-cell">
                          R{{ service.cost.toFixed(2) }}
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="provider">
                        <th mat-header-cell *matHeaderCellDef>Service Provider</th>
                        <td mat-cell *matCellDef="let service">{{ service.serviceProvider }}</td>
                      </ng-container>

                      <ng-container matColumnDef="nextService">
                        <th mat-header-cell *matHeaderCellDef>Next Service</th>
                        <td mat-cell *matCellDef="let service">
                          <div *ngIf="service.nextServiceDate">
                            {{ service.nextServiceDate | date:'shortDate' }}<br>
                            <small>{{ service.nextServiceMileage | number }} km</small>
                          </div>
                          <span *ngIf="!service.nextServiceDate">-</span>
                        </td>
                      </ng-container>

                      <tr mat-header-row *matHeaderRowDef="historyColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: historyColumns;"></tr>
                    </table>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

          <!-- Maintenance History Tab -->
          <mat-tab label="Maintenance History">
            <div class="tab-content">
              <mat-card>
                <mat-card-header>
                  <mat-icon mat-card-avatar>build</mat-icon>
                  <mat-card-title>Maintenance Records</mat-card-title>
                </mat-card-header>
                <mat-card-content>
                  <div class="table-container">
                    <table mat-table [dataSource]="maintenanceHistory" class="history-table">
                      <ng-container matColumnDef="vehicle">
                        <th mat-header-cell *matHeaderCellDef>Vehicle</th>
                        <td mat-cell *matCellDef="let maint">
                          <div class="vehicle-info">
                            <strong>{{ maint.vehicleName }}</strong><br>
                            <small>{{ maint.registration }}</small>
                          </div>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="date">
                        <th mat-header-cell *matHeaderCellDef>Date</th>
                        <td mat-cell *matCellDef="let maint">{{ maint.maintenanceDate | date:'medium' }}</td>
                      </ng-container>

                      <ng-container matColumnDef="type">
                        <th mat-header-cell *matHeaderCellDef>Type</th>
                        <td mat-cell *matCellDef="let maint">
                          <mat-chip>{{ maint.maintenanceType }}</mat-chip>
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="description">
                        <th mat-header-cell *matHeaderCellDef>Work Performed</th>
                        <td mat-cell *matCellDef="let maint">{{ maint.description }}</td>
                      </ng-container>

                      <ng-container matColumnDef="mileage">
                        <th mat-header-cell *matHeaderCellDef>Mileage</th>
                        <td mat-cell *matCellDef="let maint">{{ maint.mileageAtMaintenance | number }} km</td>
                      </ng-container>

                      <ng-container matColumnDef="cost">
                        <th mat-header-cell *matHeaderCellDef>Cost</th>
                        <td mat-cell *matCellDef="let maint" class="cost-cell">
                          R{{ maint.cost.toFixed(2) }}
                        </td>
                      </ng-container>

                      <ng-container matColumnDef="technician">
                        <th mat-header-cell *matHeaderCellDef>Technician</th>
                        <td mat-cell *matCellDef="let maint">{{ maint.technicianName }}</td>
                      </ng-container>

                      <tr mat-header-row *matHeaderRowDef="maintenanceColumns"></tr>
                      <tr mat-row *matRowDef="let row; columns: maintenanceColumns;"></tr>
                    </table>
                  </div>
                </mat-card-content>
              </mat-card>
            </div>
          </mat-tab>

          <!-- Fleet Statistics Tab -->
          <mat-tab label="Fleet Statistics">
            <div class="tab-content">
              <div class="stats-section">
                <mat-card class="stats-card">
                  <mat-card-header>
                    <mat-icon mat-card-avatar>bar_chart</mat-icon>
                    <mat-card-title>Service Statistics by Vehicle</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="vehicle-stats-list">
                      <div *ngFor="let stat of vehicleStats" class="vehicle-stat-item">
                        <div class="vehicle-header">
                          <h4>{{ stat.vehicleName }} ({{ stat.registration }})</h4>
                        </div>
                        <div class="stat-details">
                          <div class="stat-detail">
                            <mat-icon>build_circle</mat-icon>
                            <span>{{ stat.totalServices }} Services</span>
                          </div>
                          <div class="stat-detail">
                            <mat-icon>build</mat-icon>
                            <span>{{ stat.totalMaintenance }} Maintenance</span>
                          </div>
                          <div class="stat-detail">
                            <mat-icon>attach_money</mat-icon>
                            <span>R{{ stat.totalCost.toFixed(2) }} Total Cost</span>
                          </div>
                          <div class="stat-detail">
                            <mat-icon>schedule</mat-icon>
                            <span>Last Service: {{ stat.lastServiceDate | date:'shortDate' }}</span>
                          </div>
                          <div class="stat-detail" *ngIf="stat.daysSinceService !== null">
                            <mat-icon [class.overdue]="stat.daysSinceService > 90">event</mat-icon>
                            <span [class.overdue]="stat.daysSinceService > 90">
                              {{ stat.daysSinceService }} days since service
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </mat-card-content>
                </mat-card>

                <mat-card class="stats-card">
                  <mat-card-header>
                    <mat-icon mat-card-avatar>pie_chart</mat-icon>
                    <mat-card-title>Service Type Distribution</mat-card-title>
                  </mat-card-header>
                  <mat-card-content>
                    <div class="distribution-list">
                      <div *ngFor="let dist of serviceTypeDistribution" class="distribution-item">
                        <div class="dist-header">
                          <span class="dist-type">{{ dist.type }}</span>
                          <span class="dist-count">{{ dist.count }} services</span>
                        </div>
                        <div class="dist-bar">
                          <div class="dist-fill" [style.width.%]="dist.percentage"></div>
                        </div>
                        <div class="dist-footer">
                          <span>{{ dist.percentage.toFixed(1) }}%</span>
                          <span>R{{ dist.totalCost.toFixed(2) }}</span>
                        </div>
                      </div>
                    </div>
                  </mat-card-content>
                </mat-card>
              </div>
            </div>
          </mat-tab>
        </mat-tab-group>
      </div>
    </div>
  `,
  styles: [`
    .maintenance-dashboard {
      padding: 20px;
      background-color: #f5f5f5;
      min-height: 100vh;
    }

    .dashboard-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 30px;
      border-radius: 12px;
      color: white;
      margin-bottom: 20px;
    }

    .header-content h1 {
      margin: 10px 0 5px 0;
      font-size: 2rem;
    }

    .header-content p {
      margin: 0;
      opacity: 0.9;
    }

    .back-button {
      margin-bottom: 15px;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 400px;
      gap: 20px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 20px;
      margin-bottom: 30px;
    }

    .stat-card mat-card-content {
      display: flex;
      gap: 15px;
      padding: 20px !important;
    }

    .stat-icon {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 60px;
      height: 60px;
      border-radius: 12px;
    }

    .stat-icon mat-icon {
      color: white;
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    .total-services {
      background: linear-gradient(135deg, #4caf50 0%, #45a049 100%);
    }

    .active-requests {
      background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
    }

    .total-cost {
      background: linear-gradient(135deg, #2196f3 0%, #1976d2 100%);
    }

    .avg-cost {
      background: linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%);
    }

    .stat-info h3 {
      margin: 0 0 5px 0;
      font-size: 0.9rem;
      color: #666;
    }

    .stat-info h2 {
      margin: 0 0 5px 0;
      font-size: 1.8rem;
      font-weight: 600;
    }

    .stat-info p {
      margin: 0;
      font-size: 0.85rem;
      color: #888;
    }

    .maintenance-tabs {
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }

    .tab-content {
      padding: 20px;
    }

    .table-container {
      overflow-x: auto;
      max-height: 600px;
      overflow-y: auto;
    }

    .requests-table,
    .history-table {
      width: 100%;
    }

    .vehicle-info strong {
      font-size: 1rem;
    }

    .vehicle-info small {
      color: #666;
    }

    mat-chip.priority-high {
      background-color: #f44336;
      color: white;
    }

    mat-chip.priority-medium {
      background-color: #ff9800;
      color: white;
    }

    mat-chip.priority-low {
      background-color: #4caf50;
      color: white;
    }

    mat-chip.status-pending {
      background-color: #ff9800;
      color: white;
    }

    mat-chip.status-progress {
      background-color: #2196f3;
      color: white;
    }

    mat-chip.status-completed {
      background-color: #4caf50;
      color: white;
    }

    mat-chip.status-declined {
      background-color: #f44336;
      color: white;
    }

    .cost-cell {
      color: #f44336;
      font-weight: 600;
    }

    .stats-section {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 20px;
    }

    .vehicle-stats-list {
      display: flex;
      flex-direction: column;
      gap: 20px;
    }

    .vehicle-stat-item {
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 8px;
      border-left: 4px solid #667eea;
    }

    .vehicle-header h4 {
      margin: 0 0 10px 0;
      color: #333;
    }

    .stat-details {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 10px;
    }

    .stat-detail {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.9rem;
    }

    .stat-detail mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #667eea;
    }

    .stat-detail mat-icon.overdue {
      color: #f44336;
    }

    .stat-detail span.overdue {
      color: #f44336;
      font-weight: 600;
    }

    .distribution-list {
      display: flex;
      flex-direction: column;
      gap: 15px;
    }

    .distribution-item {
      padding: 15px;
      background-color: #f8f9fa;
      border-radius: 8px;
    }

    .dist-header {
      display: flex;
      justify-content: space-between;
      margin-bottom: 8px;
    }

    .dist-type {
      font-weight: 600;
      color: #333;
    }

    .dist-count {
      color: #666;
      font-size: 0.9rem;
    }

    .dist-bar {
      height: 8px;
      background-color: #e0e0e0;
      border-radius: 4px;
      overflow: hidden;
      margin-bottom: 8px;
    }

    .dist-fill {
      height: 100%;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
      transition: width 0.3s ease;
    }

    .dist-footer {
      display: flex;
      justify-content: space-between;
      font-size: 0.85rem;
      color: #666;
    }

    .action-buttons {
      display: flex;
      gap: 8px;
    }

    .action-buttons button {
      width: 36px;
      height: 36px;
    }

    .header-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
      margin-bottom: 10px;
    }

    .new-request-card {
      margin-bottom: 20px;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
      margin-bottom: 15px;
    }

    .form-row {
      display: flex;
      align-items: center;
      gap: 20px;
      margin-bottom: 15px;
    }

    .form-row mat-form-field {
      flex: 1;
    }

    .full-width {
      width: 100%;
      margin-bottom: 15px;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      margin-top: 15px;
    }

    @media (max-width: 768px) {
      .stats-grid {
        grid-template-columns: 1fr;
      }

      .stats-section {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class MaintenanceDashboardComponent implements OnInit {
  loading = true;
  submittingRequest = false;
  showNewRequestForm = false;
  ownerVehicles: any[] = [];
  
  newRequest: any = {
    vehicleId: null,
    category: '',
    priority: 'Medium',
    description: '',
    location: '',
    preferredTime: null,
    callOutRequired: false
  };
  
  // Stats
  totalServices = 0;
  activeRequests = 0;
  totalCost = 0;
  avgCostPerService = 0;

  // Tables
  maintenanceRequests: any[] = [];
  serviceHistory: any[] = [];
  maintenanceHistory: any[] = [];
  vehicleStats: any[] = [];
  serviceTypeDistribution: any[] = [];

  requestColumns = ['vehicle', 'type', 'description', 'priority', 'status', 'date', 'actions'];
  historyColumns = ['vehicle', 'serviceDate', 'serviceType', 'description', 'mileage', 'cost', 'provider', 'nextService'];
  maintenanceColumns = ['vehicle', 'date', 'type', 'description', 'mileage', 'cost', 'technician'];

  private apiUrl = 'http://localhost:5000/api';
  
  serviceProviders: any[] = [
    { name: 'AutoCare Plus', specialty: 'General Service' },
    { name: 'QuickFix Mechanics', specialty: 'Emergency Repairs' },
    { name: 'Elite Auto Service', specialty: 'Luxury Vehicles' },
    { name: 'TirePro Center', specialty: 'Tire Services' },
    { name: 'BrakeExperts', specialty: 'Brake Systems' }
  ];

  constructor(
    private router: Router, 
    private http: HttpClient,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit() {
    await this.loadMaintenanceData();
  }

  async loadMaintenanceData() {
    try {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        this.router.navigate(['/login']);
        return;
      }

      const user = JSON.parse(userStr);

      // Load vehicles
      const allVehicles: any = await this.http.get(`${this.apiUrl}/Vehicles`).toPromise();
      this.ownerVehicles = allVehicles.filter((v: any) => v.tenantId === user.tenantId);
      const ownerVehicles = this.ownerVehicles;

      // Load service history
      const allServiceHistory: any = await this.http.get(`${this.apiUrl}/ServiceHistory`).toPromise();
      const ownerServices = allServiceHistory.filter((s: any) => 
        ownerVehicles.some((v: any) => v.id === s.vehicleId)
      );

      // Load maintenance history
      const allMaintenanceHistory: any = await this.http.get(`${this.apiUrl}/MaintenanceHistory`).toPromise();
      const ownerMaintenance = allMaintenanceHistory.filter((m: any) => 
        ownerVehicles.some((v: any) => v.id === m.vehicleId)
      );

      // Build service history with vehicle info
      this.serviceHistory = ownerServices.map((s: any) => {
        const vehicle = ownerVehicles.find((v: any) => v.id === s.vehicleId);
        return {
          ...s,
          vehicleName: vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown',
          registration: vehicle?.registration || 'N/A'
        };
      }).sort((a: any, b: any) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime());

      // Build maintenance history with vehicle info
      this.maintenanceHistory = ownerMaintenance.map((m: any) => {
        const vehicle = ownerVehicles.find((v: any) => v.id === m.vehicleId);
        return {
          ...m,
          vehicleName: vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown',
          registration: vehicle?.registration || 'N/A'
        };
      }).sort((a: any, b: any) => new Date(b.maintenanceDate).getTime() - new Date(a.maintenanceDate).getTime());

      // Load actual maintenance requests from API
      const allRequests: any = await this.http.get(`${this.apiUrl}/MechanicalRequests`).toPromise();
      this.maintenanceRequests = allRequests.filter((r: any) => 
        ownerVehicles.some((v: any) => v.id === r.vehicleId)
      ).map((r: any) => {
        const vehicle = ownerVehicles.find((v: any) => v.id === r.vehicleId);
        return {
          ...r,
          vehicleName: vehicle ? `${vehicle.make} ${vehicle.model}` : 'Unknown',
          registration: vehicle?.registration || 'N/A',
          requestType: r.category,
          requestDate: r.createdAt,
          status: r.state
        };
      }).sort((a: any, b: any) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      // Calculate stats
      this.totalServices = ownerServices.length + ownerMaintenance.length;
      this.activeRequests = this.maintenanceRequests.filter((r: any) => 
        r.state === 'Pending' || r.state === 'Approved' || r.state === 'Scheduled'
      ).length;
      this.totalCost = ownerServices.reduce((sum: number, s: any) => sum + (s.cost || 0), 0) +
                      ownerMaintenance.reduce((sum: number, m: any) => sum + (m.cost || 0), 0);
      this.avgCostPerService = this.totalServices > 0 ? this.totalCost / this.totalServices : 0;

      // Calculate vehicle stats
      this.vehicleStats = ownerVehicles.map((vehicle: any) => {
        const vehicleServices = ownerServices.filter((s: any) => s.vehicleId === vehicle.id);
        const vehicleMaintenance = ownerMaintenance.filter((m: any) => m.vehicleId === vehicle.id);
        const lastService = vehicleServices.length > 0 ? 
          vehicleServices.sort((a: any, b: any) => new Date(b.serviceDate).getTime() - new Date(a.serviceDate).getTime())[0] : null;
        
        const daysSinceService = lastService ? 
          Math.floor((Date.now() - new Date(lastService.serviceDate).getTime()) / (1000 * 60 * 60 * 24)) : null;

        return {
          vehicleName: `${vehicle.make} ${vehicle.model}`,
          registration: vehicle.registration,
          totalServices: vehicleServices.length,
          totalMaintenance: vehicleMaintenance.length,
          totalCost: vehicleServices.reduce((sum: number, s: any) => sum + (s.cost || 0), 0) +
                    vehicleMaintenance.reduce((sum: number, m: any) => sum + (m.cost || 0), 0),
          lastServiceDate: lastService?.serviceDate || null,
          daysSinceService
        };
      });

      // Calculate service type distribution
      const typeMap = new Map<string, { count: number, cost: number }>();
      
      ownerServices.forEach((s: any) => {
        const type = s.serviceType || 'Other';
        if (!typeMap.has(type)) {
          typeMap.set(type, { count: 0, cost: 0 });
        }
        const data = typeMap.get(type)!;
        data.count++;
        data.cost += s.cost || 0;
      });

      const total = ownerServices.length;
      this.serviceTypeDistribution = Array.from(typeMap.entries()).map(([type, data]) => ({
        type,
        count: data.count,
        totalCost: data.cost,
        percentage: (data.count / total) * 100
      })).sort((a, b) => b.count - a.count);

    } catch (error) {
      console.error('Error loading maintenance data:', error);
    } finally {
      this.loading = false;
    }
  }

  generateMockRequests(vehicles: any[]): any[] {
    // Generate some mock requests for demonstration
    const requests = [];
    const types = ['Service', 'Repair', 'Inspection', 'Tire Change'];
    const priorities = ['High', 'Medium', 'Low'];
    const statuses = ['Pending', 'In Progress', 'Completed'];

    for (let i = 0; i < Math.min(5, vehicles.length); i++) {
      const vehicle = vehicles[i];
      requests.push({
        vehicleName: `${vehicle.make} ${vehicle.model}`,
        registration: vehicle.registration,
        requestType: types[Math.floor(Math.random() * types.length)],
        description: 'Routine maintenance check required',
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        requestDate: new Date(Date.now() - Math.floor(Math.random() * 7) * 24 * 60 * 60 * 1000)
      });
    }

    return requests;
  }

  async approveRequest(request: any) {
    try {
      await this.http.put(`${this.apiUrl}/MechanicalRequests/${request.id}/approve`, {}).toPromise();
      this.snackBar.open('Request approved successfully', 'Close', { duration: 3000 });
      await this.loadMaintenanceData();
    } catch (error) {
      console.error('Error approving request:', error);
      this.snackBar.open('Error approving request', 'Close', { duration: 3000 });
    }
  }

  async declineRequest(request: any) {
    const reason = prompt('Please provide a reason for declining this request:');
    if (!reason) return;

    try {
      await this.http.put(`${this.apiUrl}/MechanicalRequests/${request.id}/decline`, { reason }).toPromise();
      this.snackBar.open('Request declined', 'Close', { duration: 3000 });
      await this.loadMaintenanceData();
    } catch (error) {
      console.error('Error declining request:', error);
      this.snackBar.open('Error declining request', 'Close', { duration: 3000 });
    }
  }

  scheduleService(request: any) {
    const dialogRef = this.dialog.open(ScheduleServiceDialogComponent, {
      width: '800px',
      maxWidth: '90vw',
      data: { request },
      disableClose: false
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        await this.confirmSchedule(request, result);
      }
    });
  }

  async confirmSchedule(request: any, scheduleData: any) {
    try {
      const userStr = localStorage.getItem('user');
      const user = JSON.parse(userStr!);

      const payload = {
        requestId: request.id,
        serviceProvider: scheduleData.providerName,
        scheduledDate: scheduleData.scheduledDate,
        scheduledBy: user.role === 'Owner' ? 'Owner' : 'Driver',
        notes: scheduleData.notes
      };

      await this.http.put(`${this.apiUrl}/MechanicalRequests/${request.id}/schedule`, payload).toPromise();
      this.snackBar.open(
        `Service scheduled with ${scheduleData.providerName} on ${new Date(scheduleData.scheduledDate).toLocaleDateString()} at ${scheduleData.timeSlot}`, 
        'Close', 
        { duration: 5000 }
      );
      await this.loadMaintenanceData();
    } catch (error) {
      console.error('Error scheduling service:', error);
      this.snackBar.open('Error scheduling service', 'Close', { duration: 3000 });
    }
  }

  async submitOwnerRequest() {
    if (this.submittingRequest) return;

    this.submittingRequest = true;
    try {
      const userStr = localStorage.getItem('user');
      const user = JSON.parse(userStr!);

      const payload = {
        ownerId: user.tenantId,
        vehicleId: this.newRequest.vehicleId,
        location: this.newRequest.location,
        category: this.newRequest.category,
        description: this.newRequest.description,
        mediaUrls: '',
        preferredTime: this.newRequest.preferredTime,
        callOutRequired: this.newRequest.callOutRequired,
        state: 'Approved', // Owners can auto-approve their own requests
        priority: this.newRequest.priority,
        requestedBy: user.id,
        requestedByType: 'Owner'
      };

      await this.http.post(`${this.apiUrl}/MechanicalRequests`, payload).toPromise();

      this.snackBar.open('Maintenance request created successfully!', 'Close', { duration: 3000 });
      
      // Reset form
      this.newRequest = {
        vehicleId: null,
        category: '',
        priority: 'Medium',
        description: '',
        location: '',
        preferredTime: null,
        callOutRequired: false
      };
      this.showNewRequestForm = false;

      // Reload data
      await this.loadMaintenanceData();

    } catch (error) {
      console.error('Error submitting request:', error);
      this.snackBar.open('Error submitting request', 'Close', { duration: 3000 });
    } finally {
      this.submittingRequest = false;
    }
  }
}
