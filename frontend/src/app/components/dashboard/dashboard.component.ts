import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ServiceAlertsComponent } from '../shared/service-alerts/service-alerts.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, ServiceAlertsComponent],
  template: `
    <div class="dashboard">
      <h1>Fleet Dashboard</h1>
      
      <div class="stats-grid">
        <div class="card">
          <h3>Total Vehicles</h3>
          <p class="stat-number">0</p>
        </div>
        
        <div class="card">
          <h3>Active Drivers</h3>
          <p class="stat-number">0</p>
        </div>
        
        <div class="card">
          <h3>Today's Trips</h3>
          <p class="stat-number">0</p>
        </div>
        
        <div class="card">
          <h3>Active Tenants</h3>
          <p class="stat-number">0</p>
        </div>
      </div>

      <div class="dashboard-grid">
        <div class="main-content">
          <div class="card mt-2">
            <h2>Recent Activity</h2>
            <p>No recent activity to display.</p>
          </div>
        </div>

        <div class="sidebar">
          <app-service-alerts></app-service-alerts>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    
    .stat-number {
      font-size: 2.5rem;
      font-weight: bold;
      color: #3498db;
      margin: 0;
    }
    
    .card h3 {
      margin-bottom: 0.5rem;
      color: #666;
    }

    .dashboard-grid {
      display: grid;
      grid-template-columns: 1fr 400px;
      gap: 1.5rem;
    }

    .main-content {
      min-width: 0;
    }

    .sidebar {
      min-width: 0;
    }

    @media (max-width: 1024px) {
      .dashboard-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DashboardComponent {}
