import { Component, OnInit, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatTabsModule } from '@angular/material/tabs';
import { FormsModule } from '@angular/forms';
import { RoadsideAssistanceService } from '../../services/roadside-assistance.service';
import { RoadsideAssistanceRequest } from '../../models/roadside-assistance.model';
import { interval } from 'rxjs';
import { startWith, switchMap } from 'rxjs/operators';

@Component({
  selector: 'app-roadside-assistance-marketplace',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule
  ],
  template: `
    <div class="marketplace-container">
      <div class="page-header">
        <h1><mat-icon>local_shipping</mat-icon> Roadside Assistance</h1>
        <p>First to accept gets the job!</p>
        <div class="auto-refresh">
          <mat-icon>refresh</mat-icon>
          <span>Auto-refreshing every 10 seconds</span>
        </div>
      </div>

      <mat-tab-group>
        <!-- Available Jobs Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>inbox</mat-icon>
            Available Jobs
            <span class="tab-badge" *ngIf="pendingRequests.length > 0">{{ pendingRequests.length }}</span>
          </ng-template>

          <div class="tab-content">
            <div *ngIf="loading" class="loading-container">
              <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
              <p>Loading available requests...</p>
            </div>

            <div *ngIf="!loading && pendingRequests.length === 0" class="empty-state">
              <mat-icon>inbox</mat-icon>
              <h2>No Available Requests</h2>
              <p>New roadside assistance requests will appear here automatically</p>
            </div>

            <div class="requests-grid">
              <mat-card *ngFor="let request of pendingRequests" 
                        class="request-card"
                        [class.emergency]="request.priority === 'Emergency'"
                        [class.high-priority]="request.priority === 'High'">
                <mat-card-header>
                  <div class="header-content">
                    <div>
                      <mat-card-title>
                        <mat-icon>{{ getAssistanceIcon(request.assistanceType) }}</mat-icon>
                        {{ request.assistanceType }}
                      </mat-card-title>
                      <mat-card-subtitle>{{ getTimeAgo(request.requestedAt) }}</mat-card-subtitle>
                    </div>
                    <div class="badges">
                      <mat-chip class="status-pending">Available</mat-chip>
                      <mat-chip *ngIf="request.priority === 'Emergency'" class="priority-emergency">
                        <mat-icon>warning</mat-icon>
                        Emergency
                      </mat-chip>
                      <mat-chip *ngIf="request.priority === 'High'" class="priority-high">
                        <mat-icon>priority_high</mat-icon>
                        High Priority
                      </mat-chip>
                    </div>
                  </div>
                </mat-card-header>
                
                <mat-card-content>
                  <div class="info-section">
                    <div class="info-item">
                      <mat-icon>person</mat-icon>
                      <div>
                        <strong>{{ request.userName }}</strong>
                        <p>{{ request.userRole }}</p>
                      </div>
                    </div>

                    <div class="info-item">
                      <mat-icon>phone</mat-icon>
                      <div>
                        <strong>Contact</strong>
                        <p>{{ request.userPhone }}</p>
                      </div>
                    </div>

                    <div class="info-item location">
                      <mat-icon>location_on</mat-icon>
                      <div>
                        <strong>Location</strong>
                        <p>{{ request.location }}</p>
                      </div>
                    </div>

                    <div class="info-item" *ngIf="request.vehicleRegistration">
                      <mat-icon>directions_car</mat-icon>
                      <div>
                        <strong>Vehicle</strong>
                        <p>{{ request.vehicleRegistration }} - {{ request.vehicleMake }} {{ request.vehicleModel }}</p>
                      </div>
                    </div>

                    <div class="issue-description">
                      <mat-icon>description</mat-icon>
                      <div>
                        <strong>Issue Description</strong>
                        <p>{{ request.issueDescription }}</p>
                      </div>
                    </div>

                    <div class="info-item" *ngIf="request.additionalNotes">
                      <mat-icon>note</mat-icon>
                      <div>
                        <strong>Additional Notes</strong>
                        <p>{{ request.additionalNotes }}</p>
                      </div>
                    </div>
                  </div>
                </mat-card-content>

                <mat-card-actions>
                  <button mat-raised-button color="primary" 
                          (click)="acceptRequest(request)"
                          [disabled]="accepting === request.id">
                    <mat-icon>{{ accepting === request.id ? 'hourglass_empty' : 'check_circle' }}</mat-icon>
                    {{ accepting === request.id ? 'Accepting...' : 'Accept Job' }}
                  </button>
                </mat-card-actions>
              </mat-card>
            </div>
          </div>
        </mat-tab>

        <!-- My Accepted Jobs Tab -->
        <mat-tab>
          <ng-template mat-tab-label>
            <mat-icon>assignment_turned_in</mat-icon>
            My Accepted Jobs
            <span class="tab-badge" *ngIf="assignedRequests.length > 0">{{ assignedRequests.length }}</span>
          </ng-template>

          <div class="tab-content">
            <div *ngIf="loadingAssigned" class="loading-container">
              <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
              <p>Loading your accepted jobs...</p>
            </div>

            <div *ngIf="!loadingAssigned && assignedRequests.length === 0" class="empty-state">
              <mat-icon>assignment</mat-icon>
              <h2>No Accepted Jobs</h2>
              <p>Jobs you accept will appear here</p>
            </div>

            <div class="requests-grid">
              <mat-card *ngFor="let request of assignedRequests" class="request-card accepted-card">
                <mat-card-header>
                  <div class="header-content">
                    <div>
                      <mat-card-title>
                        <mat-icon>{{ getAssistanceIcon(request.assistanceType) }}</mat-icon>
                        {{ request.assistanceType }}
                      </mat-card-title>
                      <mat-card-subtitle>Accepted {{ getTimeAgo(request.assignedAt!) }}</mat-card-subtitle>
                    </div>
                    <mat-chip [class]="'status-' + request.status.toLowerCase()">
                      {{ request.status }}
                    </mat-chip>
                  </div>
                </mat-card-header>
                
                <mat-card-content>
                  <div class="info-section">
                    <div class="info-item">
                      <mat-icon>person</mat-icon>
                      <div>
                        <strong>{{ request.userName }}</strong>
                        <p>{{ request.userRole }}</p>
                      </div>
                    </div>

                    <div class="info-item">
                      <mat-icon>phone</mat-icon>
                      <div>
                        <strong>Contact</strong>
                        <p>{{ request.userPhone }}</p>
                      </div>
                    </div>

                    <div class="info-item location">
                      <mat-icon>location_on</mat-icon>
                      <div>
                        <strong>Location</strong>
                        <p>{{ request.location }}</p>
                      </div>
                    </div>

                    <div class="info-item" *ngIf="request.vehicleRegistration">
                      <mat-icon>directions_car</mat-icon>
                      <div>
                        <strong>Vehicle</strong>
                        <p>{{ request.vehicleRegistration }} - {{ request.vehicleMake }} {{ request.vehicleModel }}</p>
                      </div>
                    </div>

                    <div class="info-item" *ngIf="request.technicianName">
                      <mat-icon>engineering</mat-icon>
                      <div>
                        <strong>Technician</strong>
                        <p>{{ request.technicianName }}</p>
                      </div>
                    </div>

                    <div class="info-item" *ngIf="request.estimatedArrivalTime">
                      <mat-icon>schedule</mat-icon>
                      <div>
                        <strong>ETA</strong>
                        <p>{{ request.estimatedArrivalTime }}</p>
                      </div>
                    </div>

                    <div class="info-item" *ngIf="request.estimatedCost">
                      <mat-icon>attach_money</mat-icon>
                      <div>
                        <strong>Estimated Cost</strong>
                        <p>R{{ request.estimatedCost }}</p>
                      </div>
                    </div>

                    <div class="issue-description">
                      <mat-icon>description</mat-icon>
                      <div>
                        <strong>Issue Description</strong>
                        <p>{{ request.issueDescription }}</p>
                      </div>
                    </div>
                  </div>
                </mat-card-content>

                <mat-card-actions>
                  <button mat-button color="primary" 
                          (click)="updateStatus(request, 'InProgress')"
                          *ngIf="request.status === 'Assigned'">
                    <mat-icon>play_arrow</mat-icon>
                    Start Work
                  </button>
                  <button mat-raised-button color="accent" 
                          (click)="updateStatus(request, 'Completed')"
                          *ngIf="request.status === 'InProgress'">
                    <mat-icon>check_circle</mat-icon>
                    Complete Job
                  </button>
                  <div *ngIf="request.status === 'Completed'" class="completed-badge">
                    <mat-icon>check_circle</mat-icon>
                    <span>Completed {{ getTimeAgo(request.completedAt!) }}</span>
                  </div>
                </mat-card-actions>
              </mat-card>
            </div>
          </div>
        </mat-tab>
      </mat-tab-group>
    </div>
  `,
  styles: [`
    .marketplace-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      margin-bottom: 2rem;
    }

    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 0 0.5rem 0;
      color: #1976d2;
    }

    .page-header p {
      margin: 0 0 0.5rem 0;
      color: #666;
      font-size: 1.1rem;
    }

    .auto-refresh {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #4caf50;
      font-size: 0.9rem;
      margin-top: 0.5rem;
    }

    .auto-refresh mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .loading-container, .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      color: #999;
    }

    .empty-state mat-icon {
      font-size: 72px;
      width: 72px;
      height: 72px;
      margin-bottom: 1rem;
    }

    .empty-state h2 {
      color: #666;
      margin: 0 0 0.5rem 0;
    }

    .tab-content {
      padding: 2rem 0;
    }

    .tab-badge {
      margin-left: 0.5rem;
      padding: 2px 8px;
      background: #1976d2;
      color: white;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .requests-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
      gap: 1.5rem;
    }

    .request-card {
      height: fit-content;
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .request-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
    }

    .request-card.emergency {
      border-left: 6px solid #d32f2f;
      background: linear-gradient(135deg, #ffebee 0%, white 100%);
    }

    .request-card.high-priority {
      border-left: 6px solid #f57c00;
      background: linear-gradient(135deg, #fff3e0 0%, white 100%);
    }

    .request-card.accepted-card {
      border-left: 6px solid #4caf50;
      background: linear-gradient(135deg, #e8f5e9 0%, white 100%);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      width: 100%;
      gap: 1rem;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-size: 1.2rem !important;
    }

    mat-card-title mat-icon {
      color: #1976d2;
    }

    mat-card-subtitle {
      color: #999 !important;
      font-size: 0.85rem !important;
      margin-top: 0.25rem !important;
    }

    .badges {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      align-items: flex-end;
    }

    mat-chip {
      font-size: 0.75rem;
      min-height: 28px;
    }

    .status-pending {
      background: #4caf50;
      color: white;
    }

    .priority-emergency {
      background: #d32f2f;
      color: white;
    }

    .priority-emergency mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .priority-high {
      background: #f57c00;
      color: white;
    }

    .priority-high mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .info-section {
      display: flex;
      flex-direction: column;
      gap: 1rem;
      margin-top: 1rem;
    }

    .info-item {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
    }

    .info-item mat-icon {
      color: #666;
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-top: 2px;
    }

    .info-item strong {
      display: block;
      font-size: 0.85rem;
      color: #666;
      margin-bottom: 0.25rem;
    }

    .info-item p {
      margin: 0;
      color: #333;
      font-size: 0.95rem;
    }

    .location {
      color: #d32f2f;
    }

    .location mat-icon {
      color: #d32f2f;
    }

    .issue-description {
      display: flex;
      gap: 0.75rem;
      padding: 1rem;
      background: #f5f5f5;
      border-radius: 8px;
      border-left: 3px solid #1976d2;
    }

    .issue-description mat-icon {
      color: #1976d2;
      font-size: 20px;
      width: 20px;
      height: 20px;
      margin-top: 2px;
    }

    .issue-description strong {
      display: block;
      font-size: 0.85rem;
      color: #1976d2;
      margin-bottom: 0.5rem;
    }

    .issue-description p {
      margin: 0;
      color: #333;
      line-height: 1.5;
    }

    mat-card-actions {
      padding: 1rem;
      background: #fafafa;
    }

    mat-card-actions button {
      width: 100%;
      height: 48px;
      font-size: 1rem;
      font-weight: 500;
    }

    .completed-badge {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      padding: 1rem;
      color: #4caf50;
      font-weight: 500;
    }

    .completed-badge mat-icon {
      color: #4caf50;
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

    @media (max-width: 768px) {
      .marketplace-container {
        padding: 1rem;
      }

      .requests-grid {
        grid-template-columns: 1fr;
      }

      .header-content {
        flex-direction: column;
      }

      .badges {
        flex-direction: row;
        align-items: flex-start;
      }
    }
  `]
})
export class RoadsideAssistanceMarketplaceComponent implements OnInit {
  pendingRequests: RoadsideAssistanceRequest[] = [];
  assignedRequests: RoadsideAssistanceRequest[] = [];
  loading = false;
  loadingAssigned = false;
  accepting: string | null = null;
  private refreshSubscription: any;

  constructor(
    private assistanceService: RoadsideAssistanceService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadPendingRequests();
    this.loadAssignedRequests();
    
    // Auto-refresh every 10 seconds
    this.refreshSubscription = interval(10000)
      .pipe(
        startWith(0),
        switchMap(() => this.assistanceService.getPendingRequests())
      )
      .subscribe({
        next: (requests) => {
          this.pendingRequests = requests;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading requests:', error);
          this.loading = false;
        }
      });
  }

  ngOnDestroy() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  loadPendingRequests() {
    this.loading = true;
    this.assistanceService.getPendingRequests().subscribe({
      next: (requests) => {
        this.pendingRequests = requests;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading requests:', error);
        this.snackBar.open('Failed to load requests', 'Close', { duration: 3000 });
        this.loading = false;
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

  acceptRequest(request: RoadsideAssistanceRequest) {
    const dialogRef = this.dialog.open(AcceptJobDialogComponent, {
      width: '500px',
      data: { request }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.accepting = request.id;
        
        const assignment = {
          requestId: request.id,
          technicianName: result.technicianName,
          estimatedArrivalTime: result.estimatedArrivalTime,
          estimatedCost: result.estimatedCost ? parseFloat(result.estimatedCost) : undefined
        };

        this.assistanceService.assignRequest(assignment).subscribe({
          next: () => {
            this.snackBar.open('✓ Job accepted! Customer has been notified.', 'Close', { 
              duration: 5000,
              panelClass: 'success-snackbar'
            });
            this.accepting = null;
            this.loadPendingRequests();
            this.loadAssignedRequests();
          },
          error: (error) => {
            this.accepting = null;
            if (error.status === 400 && error.error?.message?.includes('no longer available')) {
              this.snackBar.open('⚠ Sorry, another service provider already accepted this job!', 'Close', { 
                duration: 5000,
                panelClass: 'warning-snackbar'
              });
              this.loadPendingRequests(); // Refresh to remove the accepted request
            } else {
              this.snackBar.open('Failed to accept job. Please try again.', 'Close', { duration: 3000 });
            }
          }
        });
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
        this.snackBar.open('Status updated successfully!', 'Close', { duration: 3000 });
        this.loadAssignedRequests();
      },
      error: (error) => {
        console.error('Error updating status:', error);
        this.snackBar.open('Failed to update status', 'Close', { duration: 3000 });
      }
    });
  }

  getAssistanceIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'Towing': 'local_shipping',
      'Tire Change': 'settings',
      'Fuel Delivery': 'local_gas_station',
      'Jump Start': 'flash_on',
      'Lockout Service': 'lock_open',
      'Battery Replacement': 'battery_charging_full',
      'Minor Repair': 'build',
      'Accident Recovery': 'emergency',
      'Other': 'help_outline'
    };
    return icons[type] || 'help_outline';
  }

  getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
  }
}

// Accept Job Dialog Component
@Component({
  selector: 'app-accept-job-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <h2 mat-dialog-title>
      <mat-icon>check_circle</mat-icon>
      Accept Job
    </h2>
    <mat-dialog-content>
      <p class="dialog-subtitle">Provide job details to customer</p>
      
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Technician Name</mat-label>
        <input matInput [(ngModel)]="technicianName" required>
        <mat-icon matSuffix>person</mat-icon>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Estimated Arrival Time</mat-label>
        <input matInput [(ngModel)]="estimatedArrivalTime" 
               placeholder="e.g., 30 minutes, 1 hour" required>
        <mat-icon matSuffix>schedule</mat-icon>
      </mat-form-field>

      <mat-form-field appearance="outline" class="full-width">
        <mat-label>Estimated Cost (R) - Optional</mat-label>
        <input matInput [(ngModel)]="estimatedCost" type="number" min="0" step="0.01">
        <mat-icon matSuffix>attach_money</mat-icon>
      </mat-form-field>

      <div class="warning-box">
        <mat-icon>info</mat-icon>
        <p>By accepting, you commit to providing this service. The customer will be notified immediately.</p>
      </div>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onCancel()">Cancel</button>
      <button mat-raised-button color="primary" 
              (click)="onAccept()"
              [disabled]="!technicianName || !estimatedArrivalTime">
        <mat-icon>check</mat-icon>
        Confirm & Accept Job
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    h2 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      color: #1976d2;
    }

    .dialog-subtitle {
      color: #666;
      margin-bottom: 1.5rem;
    }

    .full-width {
      width: 100%;
      margin-bottom: 1rem;
    }

    .warning-box {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      background: #fff3e0;
      border-left: 4px solid #f57c00;
      border-radius: 4px;
      margin-top: 1rem;
    }

    .warning-box mat-icon {
      color: #f57c00;
      font-size: 24px;
      width: 24px;
      height: 24px;
    }

    .warning-box p {
      margin: 0;
      color: #666;
      font-size: 0.9rem;
      line-height: 1.5;
    }

    mat-dialog-actions {
      padding: 1rem 1.5rem;
      justify-content: flex-end;
      gap: 1rem;
    }
  `]
})
export class AcceptJobDialogComponent {
  technicianName = '';
  estimatedArrivalTime = '';
  estimatedCost: number | null = null;

  constructor(
    public dialogRef: MatDialogRef<AcceptJobDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  onCancel(): void {
    this.dialogRef.close();
  }

  onAccept(): void {
    this.dialogRef.close({
      technicianName: this.technicianName,
      estimatedArrivalTime: this.estimatedArrivalTime,
      estimatedCost: this.estimatedCost
    });
  }
}
