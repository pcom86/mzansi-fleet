import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IdentityService } from '../../services';
import { Tenant } from '../../models';

@Component({
  selector: 'app-tenant-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="tenant-detail">
      <div class="flex-between mb-2">
        <h1>Tenant Details</h1>
        <button class="btn btn-secondary" (click)="goBack()">Back to List</button>
      </div>

      <div class="error" *ngIf="error">{{ error }}</div>
      
      <div class="card" *ngIf="loading">
        <div class="loading">Loading tenant details...</div>
      </div>

      <div class="card" *ngIf="!loading && tenant">
        <div class="detail-section">
          <h2>{{ tenant.name }}</h2>
          
          <div class="detail-row">
            <label>ID:</label>
            <span>{{ tenant.id }}</span>
          </div>
          
          <div class="detail-row">
            <label>Name:</label>
            <span>{{ tenant.name }}</span>
          </div>
          
          <div class="detail-row">
            <label>Contact Email:</label>
            <span>{{ tenant.contactEmail }}</span>
          </div>
          
          <div class="detail-row">
            <label>Contact Phone:</label>
            <span>{{ tenant.contactPhone }}</span>
          </div>
        </div>

        <div class="detail-section" *ngIf="tenant.users && tenant.users.length > 0">
          <h3>Associated Users ({{ tenant.users.length }})</h3>
          <table>
            <thead>
              <tr>
                <th>Email</th>
                <th>Phone</th>
                <th>Role</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of tenant.users">
                <td>{{ user.email }}</td>
                <td>{{ user.phone }}</td>
                <td>{{ user.role }}</td>
                <td>
                  <span [class]="user.isActive ? 'badge badge-success' : 'badge badge-danger'">
                    {{ user.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .tenant-detail {
      padding: 20px;
    }
    
    .flex-between {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .mb-2 {
      margin-bottom: 20px;
    }
    
    .card {
      background: white;
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 20px;
    }
    
    .detail-section {
      margin-bottom: 30px;
    }
    
    .detail-section:last-child {
      margin-bottom: 0;
    }
    
    .detail-section h2 {
      margin-top: 0;
      margin-bottom: 20px;
      color: #333;
    }
    
    .detail-section h3 {
      margin-top: 0;
      margin-bottom: 15px;
      color: #555;
    }
    
    .detail-row {
      display: flex;
      padding: 10px 0;
      border-bottom: 1px solid #eee;
    }
    
    .detail-row:last-child {
      border-bottom: none;
    }
    
    .detail-row label {
      font-weight: 600;
      width: 180px;
      color: #666;
    }
    
    .detail-row span {
      flex: 1;
      color: #333;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    
    th {
      background-color: #f8f9fa;
      font-weight: 600;
    }
    
    .badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    
    .badge-success {
      background-color: #d4edda;
      color: #155724;
    }
    
    .badge-danger {
      background-color: #f8d7da;
      color: #721c24;
    }
    
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: background-color 0.3s;
    }
    
    .btn-secondary {
      background-color: #6c757d;
      color: white;
    }
    
    .btn-secondary:hover {
      background-color: #5a6268;
    }
    
    .error {
      background-color: #f8d7da;
      color: #721c24;
      padding: 12px;
      border-radius: 4px;
      margin-bottom: 20px;
    }
    
    .loading {
      text-align: center;
      padding: 40px;
      color: #6c757d;
    }
  `]
})
export class TenantDetailComponent implements OnInit {
  tenant: Tenant | null = null;
  loading: boolean = false;
  error: string = '';

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private identityService: IdentityService
  ) {}

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.loadTenant(id);
    }
  }

  loadTenant(id: string): void {
    this.loading = true;
    this.error = '';
    
    this.identityService.getTenantById(id).subscribe({
      next: (tenant) => {
        this.tenant = tenant;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load tenant: ' + err.message;
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/identity/tenants']);
  }
}
