import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

interface SystemStats {
  totalUsers: number;
  totalTenants: number;
  activeUsers: number;
  inactiveUsers: number;
  usersByRole: { [key: string]: number };
  recentUsers: any[];
  recentTenants: any[];
}

@Component({
  selector: 'app-admin-system-overview',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  template: `
    <div class="system-overview">
      <div class="page-header">
        <h1><mat-icon>dashboard</mat-icon> System Administration</h1>
        <p>Manage users, tenants, and system settings</p>
      </div>

      <div *ngIf="loading" class="loading-container">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        <p>Loading system data...</p>
      </div>

      <div *ngIf="!loading && stats" class="dashboard-content">
        <!-- Statistics Cards -->
        <div class="stats-grid">
          <mat-card class="stat-card users-card">
            <mat-card-content>
              <div class="stat-icon"><mat-icon>people</mat-icon></div>
              <div class="stat-info">
                <h3>{{stats.totalUsers}}</h3>
                <p>Total Users</p>
                <div class="stat-detail">
                  <span class="active">{{stats.activeUsers}} Active</span>
                  <span class="inactive">{{stats.inactiveUsers}} Inactive</span>
                </div>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card tenants-card">
            <mat-card-content>
              <div class="stat-icon"><mat-icon>business</mat-icon></div>
              <div class="stat-info">
                <h3>{{stats.totalTenants}}</h3>
                <p>Tenants/Associations</p>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card owners-card">
            <mat-card-content>
              <div class="stat-icon"><mat-icon>account_circle</mat-icon></div>
              <div class="stat-info">
                <h3>{{stats.usersByRole['Owner'] || 0}}</h3>
                <p>Vehicle Owners</p>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card drivers-card">
            <mat-card-content>
              <div class="stat-icon"><mat-icon>local_taxi</mat-icon></div>
              <div class="stat-info">
                <h3>{{stats.usersByRole['Driver'] || 0}}</h3>
                <p>Drivers</p>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card providers-card">
            <mat-card-content>
              <div class="stat-icon"><mat-icon>build</mat-icon></div>
              <div class="stat-info">
                <h3>{{stats.usersByRole['ServiceProvider'] || 0}}</h3>
                <p>Service Providers</p>
              </div>
            </mat-card-content>
          </mat-card>

          <mat-card class="stat-card admins-card">
            <mat-card-content>
              <div class="stat-icon"><mat-icon>admin_panel_settings</mat-icon></div>
              <div class="stat-info">
                <h3>{{(stats.usersByRole['Admin'] || 0) + (stats.usersByRole['TaxiRankAdmin'] || 0)}}</h3>
                <p>Administrators</p>
              </div>
            </mat-card-content>
          </mat-card>
        </div>

        <!-- User Distribution -->
        <mat-card class="distribution-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>pie_chart</mat-icon>
            <mat-card-title>User Distribution by Role</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="role-chips">
              <mat-chip-set>
                <mat-chip *ngFor="let role of getRoles()" [class]="'role-' + role.key">
                  {{role.key}}: {{role.value}} users
                </mat-chip>
              </mat-chip-set>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Quick Actions -->
        <mat-card class="actions-card">
          <mat-card-header>
            <mat-icon mat-card-avatar>flash_on</mat-icon>
            <mat-card-title>Quick Actions</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <div class="action-buttons">
              <button mat-raised-button color="primary" routerLink="/admin/users">
                <mat-icon>person_add</mat-icon>
                Manage Users
              </button>
              <button mat-raised-button color="accent" routerLink="/admin/tenants">
                <mat-icon>business</mat-icon>
                Manage Tenants
              </button>
              <button mat-raised-button routerLink="/admin/settings">
                <mat-icon>settings</mat-icon>
                System Settings
              </button>
              <button mat-raised-button routerLink="/admin/reports">
                <mat-icon>assessment</mat-icon>
                View Reports
              </button>
            </div>
          </mat-card-content>
        </mat-card>

        <!-- Recent Activity -->
        <div class="recent-activity-grid">
          <mat-card class="recent-users-card">
            <mat-card-header>
              <mat-icon mat-card-avatar>people</mat-icon>
              <mat-card-title>Recent Users</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="recent-list">
                <div *ngFor="let user of stats.recentUsers" class="recent-item">
                  <div class="recent-icon">
                    <mat-icon>account_circle</mat-icon>
                  </div>
                  <div class="recent-info">
                    <p class="recent-title">{{user.email}}</p>
                    <p class="recent-subtitle">
                      <mat-chip class="role-chip">{{user.role}}</mat-chip>
                      <span class="status" [class.active]="user.isActive">{{user.isActive ? 'Active' : 'Inactive'}}</span>
                    </p>
                  </div>
                </div>
                <div *ngIf="!stats.recentUsers.length" class="no-data">
                  <p>No recent users</p>
                </div>
              </div>
              <button mat-button color="primary" routerLink="/admin/users" class="view-all">
                View All Users <mat-icon>arrow_forward</mat-icon>
              </button>
            </mat-card-content>
          </mat-card>

          <mat-card class="recent-tenants-card">
            <mat-card-header>
              <mat-icon mat-card-avatar>business</mat-icon>
              <mat-card-title>Recent Tenants</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              <div class="recent-list">
                <div *ngFor="let tenant of stats.recentTenants" class="recent-item">
                  <div class="recent-icon">
                    <mat-icon>business</mat-icon>
                  </div>
                  <div class="recent-info">
                    <p class="recent-title">{{tenant.name}}</p>
                    <p class="recent-subtitle">Code: {{tenant.code}}</p>
                  </div>
                </div>
                <div *ngIf="!stats.recentTenants.length" class="no-data">
                  <p>No recent tenants</p>
                </div>
              </div>
              <button mat-button color="primary" routerLink="/admin/tenants" class="view-all">
                View All Tenants <mat-icon>arrow_forward</mat-icon>
              </button>
            </mat-card-content>
          </mat-card>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .system-overview {
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
      margin: 0;
      color: #666;
    }

    .loading-container {
      text-align: center;
      padding: 4rem 2rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .stat-card.users-card { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    .stat-card.tenants-card { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
    .stat-card.owners-card { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
    .stat-card.drivers-card { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }
    .stat-card.providers-card { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
    .stat-card.admins-card { background: linear-gradient(135deg, #30cfd0 0%, #330867 100%); }

    .stat-card mat-card-content {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .stat-icon mat-icon {
      font-size: 3rem;
      width: 3rem;
      height: 3rem;
      opacity: 0.8;
    }

    .stat-info h3 {
      font-size: 2.5rem;
      margin: 0;
      font-weight: 300;
    }

    .stat-info p {
      margin: 0.25rem 0 0 0;
      opacity: 0.9;
      font-size: 0.9rem;
    }

    .stat-detail {
      display: flex;
      gap: 1rem;
      font-size: 0.85rem;
      margin-top: 0.5rem;
    }

    .stat-detail span {
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.2);
    }

    .distribution-card,
    .actions-card {
      margin-bottom: 2rem;
    }

    .role-chips {
      padding: 1rem 0;
    }

    .role-chips mat-chip {
      margin: 0.25rem;
    }

    .action-buttons {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      padding: 1rem 0;
    }

    .action-buttons button {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .recent-activity-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
      gap: 1.5rem;
    }

    .recent-list {
      max-height: 300px;
      overflow-y: auto;
    }

    .recent-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      border-bottom: 1px solid #eee;
    }

    .recent-item:last-child {
      border-bottom: none;
    }

    .recent-icon mat-icon {
      color: #1976d2;
      font-size: 2rem;
      width: 2rem;
      height: 2rem;
    }

    .recent-info {
      flex: 1;
    }

    .recent-title {
      margin: 0;
      font-weight: 500;
    }

    .recent-subtitle {
      margin: 0.25rem 0 0 0;
      font-size: 0.9rem;
      color: #666;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .role-chip {
      font-size: 0.75rem;
      height: 20px;
      line-height: 20px;
    }

    .status {
      font-size: 0.8rem;
    }

    .status.active {
      color: #4caf50;
    }

    .no-data {
      text-align: center;
      padding: 2rem;
      color: #999;
    }

    .view-all {
      width: 100%;
      margin-top: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    @media (max-width: 768px) {
      .system-overview {
        padding: 1rem;
      }

      .stats-grid,
      .recent-activity-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class AdminSystemOverviewComponent implements OnInit {
  stats: SystemStats | null = null;
  loading = true;

  private apiUrl = 'http://localhost:5000/api/Identity';

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.loadSystemStats();
  }

  async loadSystemStats(): Promise<void> {
    try {
      // Load users and tenants
      const [users, tenants] = await Promise.all([
        this.http.get<any[]>(`${this.apiUrl}/users`).toPromise(),
        this.http.get<any[]>(`${this.apiUrl}/tenants`).toPromise()
      ]);

      // Calculate statistics
      const usersByRole: { [key: string]: number } = {};
      let activeUsers = 0;
      let inactiveUsers = 0;

      users?.forEach(user => {
        // Count by role
        usersByRole[user.role] = (usersByRole[user.role] || 0) + 1;

        // Count active/inactive
        if (user.isActive) {
          activeUsers++;
        } else {
          inactiveUsers++;
        }
      });

      // Get recent users (last 5)
      const recentUsers = users?.slice(0, 5) || [];

      // Get recent tenants (last 5)
      const recentTenants = tenants?.slice(0, 5) || [];

      this.stats = {
        totalUsers: users?.length || 0,
        totalTenants: tenants?.length || 0,
        activeUsers,
        inactiveUsers,
        usersByRole,
        recentUsers,
        recentTenants
      };

      this.loading = false;
    } catch (error) {
      console.error('Error loading system stats:', error);
      this.loading = false;
    }
  }

  getRoles(): Array<{ key: string; value: number }> {
    if (!this.stats) return [];
    return Object.entries(this.stats.usersByRole)
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => b.value - a.value);
  }
}
