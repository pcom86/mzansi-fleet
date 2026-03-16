import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatGridListModule } from '@angular/material/grid-list';
import { MatChipsModule } from '@angular/material/chips';
import { FormsModule } from '@angular/forms';

import { QueueManagementService, QueueAnalytics, HourlyStats, RoutePerformance, DailyTrend } from '../../services/queue-management.service';

@Component({
  selector: 'app-queue-analytics',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatGridListModule,
    MatChipsModule,
    FormsModule
  ],
  templateUrl: './queue-analytics.component.html',
  styleUrls: ['./queue-analytics.component.scss']
})
export class QueueAnalyticsComponent implements OnInit, OnDestroy {
  analyticsData: QueueAnalytics | null = null;
  loading = false;
  selectedTaxiRankId: string | undefined = undefined;
  startDate: Date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
  endDate: Date = new Date();

  constructor(
    private queueService: QueueManagementService,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeComponent();
  }

  ngOnDestroy(): void {
    // Cleanup if needed
  }

  private initializeComponent(): void {
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      this.selectedTaxiRankId = user.taxiRankId;
      
      if (this.selectedTaxiRankId) {
        this.loadAnalyticsData();
      }
    }
  }

  loadAnalyticsData(): void {
    if (!this.selectedTaxiRankId) return;

    this.loading = true;
    const startString = this.startDate.toISOString().split('T')[0];
    const endString = this.endDate.toISOString().split('T')[0];

    this.queueService.getQueueAnalytics(this.selectedTaxiRankId, startString, endString)
      .subscribe({
        next: (analytics) => {
          this.analyticsData = analytics;
          this.loading = false;
        },
        error: (error: unknown) => {
          console.error('Error loading analytics data:', error);
          this.snackBar.open('Failed to load analytics data', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  onDateRangeChange(): void {
    this.loadAnalyticsData();
  }

  exportAnalytics(): void {
    if (!this.analyticsData) {
      this.snackBar.open('No data available to export', 'Close', { duration: 3000 });
      return;
    }

    // Create CSV content
    const csvContent = this.generateCSV();
    this.downloadCSV(csvContent, `queue-analytics-${this.startDate.toISOString().split('T')[0]}-to-${this.endDate.toISOString().split('T')[0]}.csv`);
  }

  private generateCSV(): string {
    if (!this.analyticsData) return '';

    let csv = 'Queue Analytics Report\n';
    csv += `Period: ${this.analyticsData.periodStart} to ${this.analyticsData.periodEnd}\n\n`;

    // Summary Statistics
    csv += 'Summary Statistics\n';
    csv += 'Metric,Value\n';
    csv += `Total Vehicles Processed,${this.analyticsData.totalVehiclesProcessed}\n`;
    csv += `Average Queue Length,${this.analyticsData.averageQueueLength.toFixed(2)}\n`;
    csv += `Average Wait Time (minutes),${this.analyticsData.averageWaitTime.toFixed(2)}\n\n`;

    // Peak Hours
    csv += 'Peak Hours\n';
    csv += 'Hour,Dispatch Count,Average Wait Time\n';
    this.analyticsData.peakHours.forEach(hour => {
      csv += `${hour.hour},${hour.dispatchCount},${hour.averageWaitTime.toFixed(2)}\n`;
    });
    csv += '\n';

    // Route Performance
    csv += 'Route Performance\n';
    csv += 'Route Name,Total Dispatches,Average Wait Time,Utilization Rate\n';
    this.analyticsData.routePerformance.forEach(route => {
      csv += `"${route.routeName || 'Unknown'}",${route.totalDispatches},${route.averageWaitTime.toFixed(2)},${route.utilizationRate.toFixed(2)}%\n`;
    });
    csv += '\n';

    // Daily Trends
    csv += 'Daily Trends\n';
    csv += 'Date,Total Vehicles,Dispatched Vehicles,Average Queue Length,Peak Wait Time\n';
    this.analyticsData.dailyTrends.forEach(trend => {
      csv += `${trend.date},${trend.totalVehicles},${trend.dispatchedVehicles},${trend.averageQueueLength},${trend.peakWaitTime.toFixed(2)}\n`;
    });

    return csv;
  }

  private downloadCSV(content: string, filename: string): void {
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  getUtilizationColor(utilization: number): string {
    if (utilization >= 80) return 'high';
    if (utilization >= 60) return 'medium';
    return 'low';
  }

  getWaitTimeColor(waitTime: number): string {
    if (waitTime <= 10) return 'good';
    if (waitTime <= 20) return 'moderate';
    return 'poor';
  }

  getPeakHourColor(dispatchCount: number): string {
    if (dispatchCount >= 10) return 'high';
    if (dispatchCount >= 5) return 'medium';
    return 'low';
  }
}
