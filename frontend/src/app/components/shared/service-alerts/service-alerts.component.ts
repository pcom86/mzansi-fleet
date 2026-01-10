import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { VehicleMaintenanceService } from '../../../services';
import { VehicleServiceAlert } from '../../../models';

@Component({
  selector: 'app-service-alerts',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alerts-widget">
      <div class="widget-header">
        <h3>🔔 Service Alerts</h3>
        <span class="alert-count" *ngIf="alerts.length > 0">{{ alerts.length }}</span>
      </div>

      <div class="loading" *ngIf="loading">Loading alerts...</div>
      <div class="error" *ngIf="error">{{ error }}</div>

      <div class="alerts-list" *ngIf="!loading && !error">
        <div *ngIf="alerts.length === 0" class="no-alerts">
          <span class="no-alerts-icon">✓</span>
          <p>All vehicles are up to date!</p>
        </div>

        <div *ngFor="let alert of alerts" 
             class="alert-card" 
             [class.critical]="alert.alertLevel === 'Critical'"
             [class.warning]="alert.alertLevel === 'Warning'"
             (click)="viewVehicle(alert.vehicleId)">
          <div class="alert-icon">
            <span *ngIf="alert.alertLevel === 'Critical'">🚨</span>
            <span *ngIf="alert.alertLevel === 'Warning'">⚠️</span>
          </div>
          
          <div class="alert-content">
            <div class="vehicle-info">
              <strong>{{ alert.registration }}</strong>
              <span class="vehicle-model">{{ alert.make }} {{ alert.model }}</span>
            </div>
            <div class="alert-message">{{ alert.alertMessage }}</div>
            <div class="alert-details">
              <span *ngIf="alert.currentMileage">{{ alert.currentMileage }} km</span>
              <span *ngIf="alert.nextServiceDate">Next: {{ formatDate(alert.nextServiceDate) }}</span>
            </div>
          </div>

          <div class="alert-badge" [class.critical]="alert.alertLevel === 'Critical'">
            {{ alert.alertLevel }}
          </div>
        </div>
      </div>

      <div class="widget-footer" *ngIf="alerts.length > 3">
        <button class="btn-view-all" (click)="viewAllAlerts()">
          View All Alerts ({{ alerts.length }})
        </button>
      </div>
    </div>
  `,
  styles: [`
    .alerts-widget {
      background: white;
      border-radius: 15px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      overflow: hidden;
    }

    .widget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 2px solid #f3f4f6;
      background: linear-gradient(135deg, #1a1a1a 0%, #000000 100%);
      color: #FFD700;
    }

    .widget-header h3 {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 700;
    }

    .alert-count {
      background: #ef4444;
      color: white;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 700;
    }

    .loading, .error {
      padding: 2rem;
      text-align: center;
      color: #6b7280;
    }

    .error {
      color: #ef4444;
    }

    .alerts-list {
      max-height: 500px;
      overflow-y: auto;
    }

    .no-alerts {
      padding: 3rem 2rem;
      text-align: center;
      color: #10b981;
    }

    .no-alerts-icon {
      font-size: 3rem;
      display: block;
      margin-bottom: 1rem;
    }

    .no-alerts p {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
    }

    .alert-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.5rem;
      border-bottom: 1px solid #f3f4f6;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .alert-card:hover {
      background: #f9fafb;
      transform: translateX(5px);
    }

    .alert-card.critical {
      border-left: 4px solid #ef4444;
      background: #fef2f2;
    }

    .alert-card.warning {
      border-left: 4px solid #f59e0b;
      background: #fffbeb;
    }

    .alert-icon {
      font-size: 2rem;
      flex-shrink: 0;
    }

    .alert-content {
      flex: 1;
    }

    .vehicle-info {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 0.25rem;
    }

    .vehicle-info strong {
      color: #000000;
      font-size: 1rem;
    }

    .vehicle-model {
      color: #6b7280;
      font-size: 0.875rem;
    }

    .alert-message {
      color: #374151;
      font-size: 0.875rem;
      margin-bottom: 0.5rem;
    }

    .alert-details {
      display: flex;
      gap: 1rem;
      font-size: 0.75rem;
      color: #9ca3af;
    }

    .alert-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      background: #f59e0b;
      color: white;
    }

    .alert-badge.critical {
      background: #ef4444;
    }

    .widget-footer {
      padding: 1rem 1.5rem;
      border-top: 2px solid #f3f4f6;
      text-align: center;
    }

    .btn-view-all {
      width: 100%;
      padding: 0.75rem;
      background: #000000;
      color: #FFD700;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-view-all:hover {
      background: #1a1a1a;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    @media (max-width: 768px) {
      .widget-header {
        padding: 1rem;
      }

      .alert-card {
        padding: 0.75rem 1rem;
      }

      .alerts-list {
        max-height: 400px;
      }
    }
  `]
})
export class ServiceAlertsComponent implements OnInit {
  alerts: VehicleServiceAlert[] = [];
  loading = false;
  error: string | null = null;

  constructor(
    private maintenanceService: VehicleMaintenanceService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAlerts();
  }

  loadAlerts(): void {
    this.loading = true;
    this.error = null;

    this.maintenanceService.getVehicleServiceAlerts().subscribe({
      next: (alerts) => {
        this.alerts = alerts;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load alerts: ' + err.message;
        this.loading = false;
      }
    });
  }

  viewVehicle(vehicleId: string): void {
    this.router.navigate(['/vehicles', vehicleId]);
  }

  viewAllAlerts(): void {
    this.router.navigate(['/vehicles'], { queryParams: { filter: 'alerts' } });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
