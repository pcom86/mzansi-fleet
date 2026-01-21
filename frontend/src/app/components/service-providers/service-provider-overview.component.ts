import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-service-provider-overview',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule
  ],
  template: `
    <div class="overview-container">
      <h1><mat-icon>dashboard</mat-icon> Dashboard Overview</h1>
      <p class="welcome-message">Welcome to your Service Provider Dashboard</p>

      <div class="stats-grid">
        <mat-card class="stat-card">
          <mat-card-content>
            <mat-icon class="stat-icon">pending_actions</mat-icon>
            <h3>Pending Jobs</h3>
            <p class="stat-value">0</p>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <mat-icon class="stat-icon">check_circle</mat-icon>
            <h3>Completed Jobs</h3>
            <p class="stat-value">0</p>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <mat-icon class="stat-icon">attach_money</mat-icon>
            <h3>Total Earnings</h3>
            <p class="stat-value">R 0.00</p>
          </mat-card-content>
        </mat-card>

        <mat-card class="stat-card">
          <mat-card-content>
            <mat-icon class="stat-icon">star</mat-icon>
            <h3>Average Rating</h3>
            <p class="stat-value">0.0</p>
          </mat-card-content>
        </mat-card>
      </div>

      <mat-card class="info-card">
        <mat-card-content>
          <mat-icon>info</mat-icon>
          <p>Your dashboard is being set up. More features will be available soon!</p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .overview-container {
      padding: 2rem;
    }

    h1 {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin: 0 0 0.5rem 0;
      color: #1976d2;
    }

    .welcome-message {
      color: #666;
      margin: 0 0 2rem 0;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      text-align: center;
    }

    .stat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #1976d2;
      margin-bottom: 1rem;
    }

    .stat-card h3 {
      margin: 0.5rem 0;
      color: #666;
      font-size: 0.9rem;
      font-weight: 500;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: bold;
      color: #333;
      margin: 0;
    }

    .info-card {
      background: #e3f2fd;
    }

    .info-card mat-card-content {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .info-card mat-icon {
      color: #1976d2;
      font-size: 32px;
      width: 32px;
      height: 32px;
    }

    @media (max-width: 768px) {
      .overview-container {
        padding: 1rem;
      }

      .stats-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class ServiceProviderOverviewComponent {}
