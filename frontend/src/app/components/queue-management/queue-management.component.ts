import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';

import { QueueManagementService, QueueOverview, RouteQueue, AvailableVehicle, AssignVehicleDto, Route } from '../../services/queue-management.service';
import { ThemeService } from '../../services/theme.service';
import { DispatchDialogComponent } from './dispatch-dialog.component';
import { Subject } from 'rxjs';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'app-queue-management',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatTableModule,
    MatTabsModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatSnackBarModule,
    MatDialogModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatButtonToggleModule,
    MatTooltipModule,
    FormsModule,
    DispatchDialogComponent
  ],
  templateUrl: './queue-management.component.html',
  styleUrls: ['./queue-management.component.scss']
})
export class QueueManagementComponent implements OnInit, OnDestroy {
  queueOverview: QueueOverview | null = null;
  availableVehicles: AvailableVehicle[] = [];
  availableRoutes: Route[] = [];
  selectedDate: Date = new Date();
  loading = false;
  selectedTaxiRankId: string | undefined = undefined;
  selectedRouteId: string | undefined = undefined;
  estimatedDepartureTime: string = '';
  activeTabIndex = 0;
  selectedPeriod = 'today';
  isDarkTheme = false;
  
  private destroy$ = new Subject<void>();

  // Table columns
  displayedColumns = ['position', 'vehicle', 'driver', 'joinedAt', 'status', 'actions'];
  
  constructor(
    private queueService: QueueManagementService,
    private snackBar: MatSnackBar,
    private route: ActivatedRoute,
    private router: Router,
    private dialog: MatDialog,
    private themeService: ThemeService
  ) {}

  ngOnInit(): void {
    this.initializeTheme();
    this.initializeSignalR();
    this.loadInitialData();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.queueService.leaveQueueGroup(this.selectedTaxiRankId);
    this.queueService.stopConnection();
  }

  private initializeTheme(): void {
    this.themeService.isDarkTheme$.subscribe((isDark: boolean) => {
      this.isDarkTheme = isDark;
    });
  }

  private initializeSignalR(): void {
    this.queueService.startConnection();
    this.setupSignalRListeners();
  }

  private setupSignalRListeners(): void {
    this.queueService.getQueueUpdates().subscribe(update => {
      console.log('Queue update received:', update);
      this.refreshQueueData();
    });

    this.queueService.getPriorityDispatches().subscribe(dispatch => {
      console.log('Priority dispatch received:', dispatch);
      this.snackBar.open(`Priority dispatch: ${dispatch.vehicleRegistration}`, 'Close', { 
        duration: 5000,
        panelClass: ['priority-dispatch']
      });
      this.refreshQueueData();
    });
  }

  private loadInitialData(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      this.selectedTaxiRankId = user.taxiRankId;
      
      if (this.selectedTaxiRankId) {
        this.loadQueueData();
        this.loadAvailableVehicles();
        this.loadAvailableRoutes();
        this.queueService.joinQueueGroup(this.selectedTaxiRankId);
      }
    }
  }

  private refreshQueueData(): void {
    if (this.selectedTaxiRankId) {
      this.loadQueueData();
    }
  }

  loadQueueData(): void {
    if (!this.selectedTaxiRankId) return;

    this.loading = true;
    const dateString = this.selectedDate.toISOString().split('T')[0];
    
    this.queueService.getQueueOverview(this.selectedTaxiRankId, dateString)
      .subscribe({
        next: (overview) => {
          this.queueOverview = overview;
          this.loading = false;
        },
        error: (error: unknown) => {
          console.error('Error loading queue data:', error);
          this.snackBar.open('Failed to load queue data', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  loadAvailableVehicles(): void {
    if (!this.selectedTaxiRankId) return;

    this.queueService.getAvailableVehicles(this.selectedTaxiRankId)
      .subscribe({
        next: (vehicles) => {
          this.availableVehicles = vehicles;
        },
        error: (error: unknown) => {
          console.error('Error loading available vehicles:', error);
        }
      });
  }

  loadAvailableRoutes(): void {
    if (!this.selectedTaxiRankId) return;

    this.queueService.getRoutesForTaxiRank(this.selectedTaxiRankId)
      .subscribe({
        next: (routes) => {
          this.availableRoutes = routes;
        },
        error: (error: unknown) => {
          console.error('Error loading available routes:', error);
        }
      });
  }

  onDateChange(): void {
    this.loadQueueData();
  }

  assignVehicle(vehicle: AvailableVehicle): void {
    if (!this.selectedTaxiRankId || !this.selectedRouteId) {
      this.snackBar.open('Please select a route first', 'Close', { duration: 3000 });
      return;
    }

    const assignment: AssignVehicleDto = {
      taxiRankId: this.selectedTaxiRankId,
      routeId: this.selectedRouteId,
      vehicleId: vehicle.vehicleId,
      tenantId: this.getCurrentTenantId(),
      estimatedDepartureTime: this.estimatedDepartureTime || undefined,
      notes: `Assigned via queue management`
    };

    this.queueService.assignVehicleToQueue(assignment)
      .subscribe({
        next: (response) => {
          this.snackBar.open(`${vehicle.registration} assigned to queue`, 'Close', { duration: 3000 });
          this.loadQueueData();
          this.loadAvailableVehicles();
        },
        error: (error: unknown) => {
          console.error('Error assigning vehicle:', error);
          this.snackBar.open('Failed to assign vehicle', 'Close', { duration: 3000 });
        }
      });
  }

  dispatchVehicle(queueId: string, vehicleRegistration: string): void {
    const dialogRef = this.dialog.open(DispatchDialogComponent, {
      width: '400px',
      data: { vehicleRegistration }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.queueService.priorityDispatch(queueId, result)
          .subscribe({
            next: (response) => {
              this.snackBar.open(`${vehicleRegistration} dispatched successfully`, 'Close', { duration: 3000 });
              this.loadQueueData();
            },
            error: (error: unknown) => {
              console.error('Error dispatching vehicle:', error);
              this.snackBar.open('Failed to dispatch vehicle', 'Close', { duration: 3000 });
            }
          });
      }
    });
  }

  removeVehicle(queueId: string, vehicleRegistration: string): void {
    if (confirm(`Remove ${vehicleRegistration} from the queue?`)) {
      // This would call the remove endpoint from the existing DailyTaxiQueueController
      this.snackBar.open(`${vehicleRegistration} removed from queue`, 'Close', { duration: 3000 });
      this.loadQueueData();
    }
  }

  getStatusColor(status: string): string {
    switch (status.toLowerCase()) {
      case 'waiting': return 'primary';
      case 'loading': return 'accent';
      case 'dispatched': return 'warn';
      default: return '';
    }
  }

  getWaitingPercentage(): number {
    if (!this.queueOverview) return 0;
    const { waiting, loading, dispatched } = this.queueOverview.totalStats;
    const total = waiting + loading + dispatched;
    return total === 0 ? 0 : Math.round((waiting / total) * 100);
  }

  getLoadingPercentage(): number {
    if (!this.queueOverview) return 0;
    const { waiting, loading, dispatched } = this.queueOverview.totalStats;
    const total = waiting + loading + dispatched;
    return total === 0 ? 0 : Math.round((loading / total) * 100);
  }

  getDispatchedPercentage(): number {
    if (!this.queueOverview) return 0;
    const { waiting, loading, dispatched } = this.queueOverview.totalStats;
    const total = waiting + loading + dispatched;
    return total === 0 ? 0 : Math.round((dispatched / total) * 100);
  }

  getTotalVehicles(): number {
    if (!this.queueOverview) return 0;
    const { waiting, loading, dispatched } = this.queueOverview.totalStats;
    return waiting + loading + dispatched;
  }

  onTabChange(index: number): void {
    this.activeTabIndex = index;
    if (index === 0) {
      this.loadQueueData();
    }
  }

  getRouteStatusColor(routeQueue: RouteQueue): string {
    if (routeQueue.dispatchedVehicles > 0) {
      return 'warn';
    }
    if (routeQueue.loadingVehicles > 0) {
      return 'accent';
    }
    if (routeQueue.waitingVehicles > 0) {
      return 'primary';
    }
    return '';
  }

  getRouteStatus(routeQueue: RouteQueue): string {
    if (routeQueue.dispatchedVehicles > 0) return 'Dispatched';
    if (routeQueue.loadingVehicles > 0) return 'Loading';
    if (routeQueue.waitingVehicles > 0) return 'Waiting';
    return 'Idle';
  }

  getWaitTimeColor(waitTime: number): string {
    if (waitTime < 5) return 'green';
    if (waitTime < 15) return 'orange';
    return 'red';
  }

  private getCurrentTenantId(): string {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      return user.tenantId;
    }
    return '';
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  private cleanup(): void {
    if (this.selectedTaxiRankId) {
      this.queueService.leaveQueueGroup(this.selectedTaxiRankId);
    }
    this.queueService.stopConnection();
  }
}
