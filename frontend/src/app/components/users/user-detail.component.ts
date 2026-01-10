import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { IdentityService } from '../../services';
import { User } from '../../models';

@Component({
  selector: 'app-user-detail',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="user-detail">
      <div class="flex-between mb-2">
        <h1>User Details</h1>
        <button class="btn btn-secondary" (click)="goBack()">Back to List</button>
      </div>

      <div class="error" *ngIf="error">{{ error }}</div>
      
      <div class="card" *ngIf="loading">
        <div class="loading">Loading user details...</div>
      </div>

      <div class="card" *ngIf="!loading && user">
        <div class="detail-section">
          <h2>{{ user.email }}</h2>
          
          <div class="detail-row">
            <label>ID:</label>
            <span>{{ user.id }}</span>
          </div>
          
          <div class="detail-row">
            <label>Email:</label>
            <span>{{ user.email }}</span>
          </div>
          
          <div class="detail-row">
            <label>Phone:</label>
            <span>{{ user.phone }}</span>
          </div>
          
          <div class="detail-row">
            <label>Role:</label>
            <span>{{ user.role }}</span>
          </div>
          
          <div class="detail-row">
            <label>Tenant ID:</label>
            <span>{{ user.tenantId }}</span>
          </div>
          
          <div class="detail-row">
            <label>Status:</label>
            <span [class]="user.isActive ? 'badge badge-success' : 'badge badge-danger'">
              {{ user.isActive ? 'Active' : 'Inactive' }}
            </span>
          </div>
        </div>

        <div class="detail-section" *ngIf="user.tenant">
          <h3>Tenant Information</h3>
          
          <div class="detail-row">
            <label>Tenant Name:</label>
            <span>{{ user.tenant.name }}</span>
          </div>
          
          <div class="detail-row">
            <label>Tenant Email:</label>
            <span>{{ user.tenant.contactEmail }}</span>
          </div>
          
          <div class="detail-row">
            <label>Tenant Phone:</label>
            <span>{{ user.tenant.contactPhone }}</span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .user-detail {
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
    
    .badge {
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      display: inline-block;
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
export class UserDetailComponent implements OnInit {
  user: User | null = null;
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
      this.loadUser(id);
    }
  }

  loadUser(id: string): void {
    this.loading = true;
    this.error = '';
    
    this.identityService.getUserById(id).subscribe({
      next: (user) => {
        this.user = user;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load user: ' + err.message;
        this.loading = false;
      }
    });
  }

  goBack(): void {
    this.router.navigate(['/identity/users']);
  }
}
