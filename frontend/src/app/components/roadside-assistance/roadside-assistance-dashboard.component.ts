import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { RoadsideAssistanceService } from '../../services/roadside-assistance.service';
import { RoadsideAssistanceRequest } from '../../models/roadside-assistance.model';

@Component({
  selector: 'app-roadside-assistance-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule,
    MatFormFieldModule,
    MatInputModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  template: `
    <div class="dashboard-container">
      <div class="page-header">
        <h1><mat-icon>local_shipping</mat-icon> Roadside Assistance Dashboard</h1>
        <p>Manage assistance requests</p>
      </div>

      <mat-tab-group>
        <mat-tab label="Pending Requests">
          <div class="tab-content">
            <div *ngIf="loadingPending" class="loading">
              <mat-icon class="spinning">refresh</mat-icon>
              <p>Loading requests...</p>
            </div>

            <div *ngIf="!loadingPending && pendingRequests.length === 0" class="empty-state">
              <mat-icon>inbox</mat-icon>
              <p>No pending requests</p>
            </div>

            <div class="requests-grid">
              <mat-card *ngFor="let request of pendingRequests" class="request-card"
                        [class.emergency]="request.priority === 'Emergency'">
                <mat-card-header>
                  <div class="header-content">
                    <mat-card-title>{{ request.assistanceType }}</mat-card-title>
                    <div class="badges">
                      <mat-chip class="status-pending">Pending</mat-chip>
                      <mat-chip *ngIf="request.priority !== 'Normal'" 
                                [class]="'priority-' + request.priority.toLowerCase()">
                        {{ request.priority }}
                      </mat-chip>
                    </div>
                  </div>
                </mat-card-header>
                <mat-card-content>
                  <p><mat-icon>person</mat-icon> <strong>{{ request.userName }}</strong></p>
                  <p><mat-icon>phone</mat-icon> {{ request.userPhone }}</p>
                  <p><mat-icon>location_on</mat-icon> {{ request.location }}</p>
                  <p *ngIf="request.vehicleRegistration">
                    <mat-icon>directions_car</mat-icon>
                    {{ request.vehicleRegistration }} - {{ request.vehicleMake }} {{ request.vehicleModel }}
                  </p>
                  <p class="issue"><mat-icon>description</mat-icon> {{ request.issueDescription }}</p>
                  <p class="date">Requested: {{ formatDate(request.requestedAt) }}</p>
                </mat-card-content>
                <mat-card-actions>
                  <button mat-raised-button color="primary" (click)="assignRequest(request)">
                    <mat-icon>assignment_ind</mat-icon>
                    Accept & Assign
                  </button>
                </mat-card-actions>
              </mat-card>
            </div>
          </div>
        </mat-tab>

        <mat-tab label="My Assigned Requests">
          <div class="tab-content">
            <div *ngIf="loadingAssigned" class="loading">
              <mat-icon class="spinning">refresh</mat-icon>
              <p>Loading requests...</p>
            </div>

            <div *ngIf="!loadingAssigned && assignedRequests.length === 0" class="empty-state">
              <mat-icon>inbox</mat-icon>
              <p>No assigned requests</p>
            </div>

            <div class="requests-grid">
              <mat-card *ngFor="let request of assignedRequests" class="request-card">
                <mat-card-header>
                  <div class="header-content">
                    <mat-card-title>{{ request.assistanceType }}</mat-card-title>
                    <mat-chip [class]="'status-' + request.status.toLowerCase()">
                      {{ request.status }}
                    </mat-chip>
                  </div>
                </mat-card-header>
                <mat-card-content>
                  <p><mat-icon>person</mat-icon> <strong>{{ request.userName }}</strong></p>
                  <p><mat-icon>phone</mat-icon> {{ request.userPhone }}</p>
                  <p><mat-icon>location_on</mat-icon> {{ request.location }}</p>
                  <p *ngIf="request.serviceProviderName"><strong>Service Provider:</strong> {{ request.serviceProviderName }}</p>
                  <p *ngIf="request.serviceProviderRating">
                    <mat-icon>star</mat-icon>
                    <strong>{{ request.serviceProviderRating.toFixed(1) }}</strong>
                    <span class="reviews">({{ request.serviceProviderReviews }} reviews)</span>
                  </p>
                  <p *ngIf="request.technicianName"><strong>Technician:</strong> {{ request.technicianName }}</p>
                  <p *ngIf="request.estimatedArrivalTime"><strong>ETA:</strong> {{ request.estimatedArrivalTime }}</p>
                  <p *ngIf="request.estimatedCost"><strong>Estimated Cost:</strong> R{{ request.estimatedCost }}</p>
                  <p class="date">Assigned: {{ formatDate(request.assignedAt!) }}</p>
                </mat-card-content>
                <mat-card-actions>
                  <button mat-button color="primary" (click)="updateStatus(request, 'InProgress')"
                          *ngIf="request.status === 'Assigned'">
                    <mat-icon>play_arrow</mat-icon>
                    Start Work
                  </button>
                  <button mat-raised-button color="accent" (click)="updateStatus(request, 'Completed')"
                          *ngIf="request.status === 'InProgress'">
                    <mat-icon>check_circle</mat-icon>
                    Complete
                  </button>
                </mat-card-actions>
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

    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 0 0.5rem 0;
      color: #1976d2;
    }

    .page-header p {
      margin: 0 0 2rem 0;
      color: #666;
    }

    .tab-content {
      padding: 2rem 0;
    }

    .requests-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
    }

    .request-card {
      height: fit-content;
    }

    .request-card.emergency {
      border-left: 4px solid #d32f2f;
      background: #ffebee;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }

    .badges {
      display: flex;
      gap: 0.5rem;
    }

    mat-card-content p {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0.5rem 0;
      font-size: 0.9rem;
    }

    mat-card-content mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #666;
    }

    .issue {
      color: #d32f2f;
      font-weight: 500;
      margin-top: 0.75rem;
      padding-top: 0.75rem;
      border-top: 1px solid #e0e0e0;
    }

    .date {
      font-size: 0.85rem;
      color: #999;
      margin-top: 0.75rem;
    }

    .reviews {
      color: #999;
      font-size: 0.85rem;
      margin-left: 0.25rem;
    }

    mat-card-actions {
      padding: 0 1rem 1rem 1rem;
    }

    .loading, .empty-state {
      text-align: center;
      padding: 3rem;
      color: #999;
    }

    .loading mat-icon, .empty-state mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }

    .spinning {
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(360deg); }
    }

    mat-chip {
      font-size: 0.75rem;
      min-height: 24px;
    }

    .status-pending {
      background: #fff3e0;
      color: #f57c00;
    }

    .status-assigned {
      background: #e3f2fd;
      color: #1976d2;
    }

    .status-inprogress {
      background: #f3e5f5;
      color: #7b1fa2;
    }

    .status-completed {
      background: #e8f5e9;
      color: #388e3c;
    }

    .priority-high {
      background: #ffe0b2;
      color: #e65100;
    }

    .priority-emergency {
      background: #ffcdd2;
      color: #c62828;
    }
  `]
})
export class RoadsideAssistanceDashboardComponent implements OnInit {
  pendingRequests: RoadsideAssistanceRequest[] = [];
  assignedRequests: RoadsideAssistanceRequest[] = [];
  loadingPending = false;
  loadingAssigned = false;

  constructor(
    private assistanceService: RoadsideAssistanceService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit() {
    this.loadPendingRequests();
    this.loadAssignedRequests();
  }

  loadPendingRequests() {
    this.loadingPending = true;
    this.assistanceService.getPendingRequests().subscribe({
      next: (requests) => {
        this.pendingRequests = requests;
        this.loadingPending = false;
      },
      error: (error) => {
        console.error('Error loading pending requests:', error);
        this.loadingPending = false;
      }
    });
  }

  loadAssignedRequests() {
    this.loadingAssigned = true;
    this.assistanceService.getAssignedRequests().subscribe({
      next: (requests) => {
        this.assignedRequests = requests;
        this.loadingAssigned = false;
      },
      error: (error) => {
        console.error('Error loading assigned requests:', error);
        this.loadingAssigned = false;
      }
    });
  }

  assignRequest(request: RoadsideAssistanceRequest) {
    const technicianName = prompt('Enter technician name:');
    const eta = prompt('Estimated arrival time (e.g., "30 minutes"):');
    const costStr = prompt('Estimated cost (R):');
    
    if (!technicianName || !eta) return;

    const assignment = {
      requestId: request.id,
      technicianName,
      estimatedArrivalTime: eta,
      estimatedCost: costStr ? parseFloat(costStr) : undefined
    };

    this.assistanceService.assignRequest(assignment).subscribe({
      next: () => {
        this.snackBar.open('Request assigned successfully!', 'Close', { duration: 3000 });
        this.loadPendingRequests();
        this.loadAssignedRequests();
      },
      error: (error) => {
        console.error('Error assigning request:', error);
        this.snackBar.open('Failed to assign request', 'Close', { duration: 3000 });
      }
    });
  }

  updateStatus(request: RoadsideAssistanceRequest, status: string) {
    let actualCost: number | undefined;
    
    if (status === 'Completed') {
      const costStr = prompt('Enter actual cost (R):');
      if (costStr) {
        actualCost = parseFloat(costStr);
      }
    }

    const update = {
      requestId: request.id,
      status,
      actualCost
    };

    this.assistanceService.updateStatus(update).subscribe({
      next: () => {
        this.snackBar.open('Status updated!', 'Close', { duration: 3000 });
        this.loadAssignedRequests();
      },
      error: (error) => {
        console.error('Error updating status:', error);
        this.snackBar.open('Failed to update status', 'Close', { duration: 3000 });
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
