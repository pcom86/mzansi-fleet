import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IdentityService } from '../../services';
import { User, Tenant } from '../../models';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="users-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <div class="header-left">
            <h1>User Management</h1>
            <p class="subtitle">Manage users, roles, and permissions</p>
          </div>
          <div class="header-actions">
            <button class="btn btn-primary" (click)="showForm = !showForm">
              <span class="btn-icon">{{ showForm ? 'âœ•' : '+' }}</span>
              {{ showForm ? 'Cancel' : 'Add New User' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Alert -->
      <div class="alert alert-error" *ngIf="error">
        <span class="alert-icon">âš </span>
        <span>{{ error }}</span>
        <button class="alert-close" (click)="error = ''">&times;</button>
      </div>

      <!-- Success Message -->
      <div class="alert alert-success" *ngIf="successMessage">
        <span class="alert-icon">âœ“</span>
        <span>{{ successMessage }}</span>
        <button class="alert-close" (click)="successMessage = ''">&times;</button>
      </div>

      <!-- Filter Bar -->
      <div class="filter-bar" *ngIf="!showForm && !showPasswordDialog">
        <div class="filter-bar-header">
          <h3>Filters</h3>
          <button class="btn-text" (click)="clearFilters()" *ngIf="hasActiveFilters()">
            Clear All
          </button>
        </div>
        <div class="filter-grid">
          <div class="filter-item">
            <input 
              type="text" 
              [(ngModel)]="filters.searchTerm" 
              (ngModelChange)="applyFilters()"
              placeholder="ðŸ” Search by email or phone..."
              class="filter-input">
          </div>
          
          <div class="filter-item">
            <select [(ngModel)]="filters.role" (ngModelChange)="applyFilters()" class="filter-select">
              <option value="">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="TaxiRankAdmin">Taxi Rank Admin</option>
              <option value="TaxiMarshal">Taxi Marshal</option>
              <option value="Owner">Owner</option>
              <option value="Driver">Driver</option>
              <option value="ServiceProvider">Service Provider</option>
              <option value="Customer">Customer</option>
              <option value="Passenger">Passenger</option>
              <option value="Staff">Staff</option>
              <option value="Mechanic">Mechanic</option>
              <option value="Shop">Shop</option>
            </select>
          </div>
          
          <div class="filter-item">
            <select [(ngModel)]="filters.status" (ngModelChange)="applyFilters()" class="filter-select">
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          
          <div class="filter-item">
            <select [(ngModel)]="filters.tenantId" (ngModelChange)="applyFilters()" class="filter-select">
              <option value="">All Tenants</option>
              <option *ngFor="let tenant of tenants" [value]="tenant.id">
                {{ tenant.name }}
              </option>
            </select>
          </div>
        </div>
        <div class="filter-results">
          Showing <strong>{{ filteredUsers.length }}</strong> of <strong>{{ users.length }}</strong> users
        </div>
      </div>

      <!-- Password Change Modal -->
      <div class="modal-overlay" *ngIf="showPasswordDialog" (click)="cancelPasswordChange()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal-header">
            <h2>Change Password</h2>
            <button class="modal-close" (click)="cancelPasswordChange()">&times;</button>
          </div>
          <div class="modal-body">
            <div class="user-info-card">
              <div class="user-avatar">{{ selectedUserForPassword?.email?.charAt(0)?.toUpperCase() || 'U' }}</div>
              <div>
                <div class="user-email">{{ selectedUserForPassword?.email }}</div>
                <div class="user-role">{{ selectedUserForPassword?.role }}</div>
              </div>
            </div>
            
            <form (ngSubmit)="changePassword()">
              <div class="form-group">
                <label>New Password</label>
                <input 
                  type="password" 
                  [(ngModel)]="passwordChange.newPassword" 
                  name="newPassword" 
                  placeholder="Enter new password"
                  required 
                  minlength="8">
                <small class="form-hint">Must be at least 8 characters long</small>
              </div>
              
              <div class="form-group">
                <label>Confirm New Password</label>
                <input 
                  type="password" 
                  [(ngModel)]="passwordChange.confirmPassword" 
                  name="confirmPassword" 
                  placeholder="Confirm new password"
                  required>
                <small 
                  *ngIf="passwordChange.newPassword && passwordChange.confirmPassword && passwordChange.newPassword !== passwordChange.confirmPassword" 
                  class="form-error">
                  Passwords do not match
                </small>
              </div>
              
              <div class="modal-actions">
                <button type="button" class="btn btn-secondary" (click)="cancelPasswordChange()">Cancel</button>
                <button type="submit" class="btn btn-success" [disabled]="!isPasswordValid()">
                  <span class="btn-icon">&#128274;</span>
                  Update Password
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- User Form -->
      <div class="form-card" *ngIf="showForm">
        <div class="form-header">
          <h2>{{ editingUser ? 'Edit User' : 'Create New User' }}</h2>
        </div>
        <form (ngSubmit)="saveUser()">
          <div class="form-grid">
            <div class="form-group">
              <label>Tenant *</label>
              <select [(ngModel)]="currentUser.tenantId" name="tenantId" required>
                <option value="">Select a tenant</option>
                <option *ngFor="let tenant of tenants" [value]="tenant.id">
                  {{ tenant.name }}
                </option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Email Address *</label>
              <input type="email" [(ngModel)]="currentUser.email" name="email" placeholder="user@example.com" required>
            </div>
            
            <div class="form-group">
              <label>Phone Number</label>
              <input type="tel" [(ngModel)]="currentUser.phone" name="phone" placeholder="+27 XX XXX XXXX">
            </div>
            
            <div class="form-group" *ngIf="!editingUser">
              <label>Password *</label>
              <input type="password" [(ngModel)]="password" name="password" placeholder="Min. 8 characters" required>
            </div>
            
            <div class="form-group">
              <label>Role *</label>
              <select [(ngModel)]="currentUser.role" name="role">
                <option value="Admin">Admin</option>
                <option value="Driver">Driver</option>
                <option value="Owner">Owner</option>
                <option value="Passenger">Passenger</option>
                <option value="Staff">Staff</option>
              </select>
            </div>
            
            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input type="checkbox" [(ngModel)]="currentUser.isActive" name="isActive">
                <span>Active User</span>
              </label>
            </div>
          </div>
          
          <div class="form-actions">
            <button type="button" class="btn btn-secondary" (click)="cancelEdit()">Cancel</button>
            <button type="submit" class="btn btn-success">
              <span class="btn-icon">{{ editingUser ? 'âœ“' : '+' }}</span>
              {{ editingUser ? 'Update User' : 'Create User' }}
            </button>
          </div>
        </form>
      </div>

      <!-- Users Table -->
      <div class="table-card" *ngIf="!showForm">
        <div class="loading-state" *ngIf="loading">
          <div class="spinner"></div>
          <p>Loading users...</p>
        </div>
        
        <div class="table-wrapper" *ngIf="!loading && filteredUsers.length > 0">
          <table class="users-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Contact</th>
                <th>Role</th>
                <th>Tenant</th>
                <th>Status</th>
                <th class="actions-col">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let user of filteredUsers" class="table-row">
                <td>
                  <div class="user-cell">
                    <div class="user-avatar-sm">{{ user.email?.charAt(0)?.toUpperCase() || 'U' }}</div>
                    <div class="user-details">
                      <div class="user-email">{{ user.email || 'N/A' }}</div>
                      <div class="user-id">ID: {{ user.id.substring(0, 8) }}</div>
                    </div>
                  </div>
                </td>
                <td>
                  <div class="contact-info">{{ user.phone || 'No phone' }}</div>
                </td>
                <td>
                  <span class="role-badge" [class]="'role-' + user.role?.toLowerCase()">
                    {{ user.role || 'N/A' }}
                  </span>
                </td>
                <td>
                  <div class="tenant-name">{{ getTenantName(user.tenantId) }}</div>
                </td>
                <td>
                  <span class="status-badge" [class.active]="user.isActive" [class.inactive]="!user.isActive">
                    <span class="status-dot"></span>
                    {{ user.isActive ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="actions-col">
                  <div class="action-buttons">
                    <button class="btn-action btn-action-edit" (click)="editUser(user)" title="Edit user">
                      <span>✎</span>
                    </button>
                    <button class="btn-action btn-action-password" (click)="showPasswordChange(user)" title="Change password">
                      <span>&#128274;</span>
                    </button>
                    <button class="btn-action btn-action-delete" (click)="deleteUser(user.id)" title="Delete user">
                      <span>&#128465;</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div class="empty-state" *ngIf="!loading && filteredUsers.length === 0 && users.length > 0">
          <div class="empty-icon">ðŸ”</div>
          <h3>No users found</h3>
          <p>Try adjusting your filters to find what you're looking for.</p>
        </div>

        <div class="empty-state" *ngIf="!loading && users.length === 0">
          <div class="empty-icon">ðŸ‘¥</div>
          <h3>No users yet</h3>
          <p>Get started by creating your first user.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    * {
      box-sizing: border-box;
    }

    .users-container {
      min-height: 100vh;
      background: #f5f7fa;
      padding: 2rem;
    }

    /* Page Header */
    .page-header {
      background: white;
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .header-left h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #1a202c;
      margin: 0 0 0.5rem 0;
    }

    .subtitle {
      color: #718096;
      font-size: 1rem;
      margin: 0;
    }

    /* Alerts */
    .alert {
      display: flex;
      align-items: center;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      margin-bottom: 1.5rem;
      animation: slideDown 0.3s ease;
    }

    @keyframes slideDown {
      from {
        opacity: 0;
        transform: translateY(-10px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .alert-error {
      background: #fee;
      color: #c53030;
      border-left: 4px solid #f56565;
    }

    .alert-success {
      background: #e6fffa;
      color: #047857;
      border-left: 4px solid #10b981;
    }

    .alert-icon {
      font-size: 1.25rem;
      margin-right: 1rem;
    }

    .alert-close {
      margin-left: auto;
      background: none;
      border: none;
      font-size: 1.5rem;
      cursor: pointer;
      color: inherit;
      opacity: 0.6;
      transition: opacity 0.2s;
    }

    .alert-close:hover {
      opacity: 1;
    }

    /* Filter Bar */
    .filter-bar {
      background: white;
      border-radius: 16px;
      padding: 1.5rem;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .filter-bar-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .filter-bar-header h3 {
      margin: 0;
      font-size: 1.125rem;
      font-weight: 600;
      color: #2d3748;
    }

    .btn-text {
      background: none;
      border: none;
      color: #4299e1;
      font-weight: 600;
      cursor: pointer;
      font-size: 0.875rem;
      padding: 0.5rem 1rem;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .btn-text:hover {
      background: #ebf8ff;
    }

    .filter-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .filter-item {
      position: relative;
    }

    .filter-input,
    .filter-select {
      width: 100%;
      padding: 0.75rem 1rem;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      font-size: 0.95rem;
      background: white;
      transition: all 0.2s;
      outline: none;
    }

    .filter-input:focus,
    .filter-select:focus {
      border-color: #4299e1;
      box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
    }

    .filter-input::placeholder {
      color: #a0aec0;
    }

    .filter-results {
      padding-top: 1rem;
      border-top: 2px solid #f7fafc;
      color: #718096;
      font-size: 0.875rem;
      text-align: center;
    }

    .filter-results strong {
      color: #2d3748;
      font-weight: 600;
    }

    /* Modal */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      animation: fadeIn 0.2s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal {
      background: white;
      border-radius: 16px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow: auto;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      animation: slideUp 0.3s ease;
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem 2rem;
      border-bottom: 2px solid #f7fafc;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1a202c;
    }

    .modal-close {
      background: none;
      border: none;
      font-size: 2rem;
      color: #a0aec0;
      cursor: pointer;
      width: 32px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 6px;
      transition: all 0.2s;
    }

    .modal-close:hover {
      background: #f7fafc;
      color: #2d3748;
    }

    .modal-body {
      padding: 2rem;
    }

    .user-info-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: #f7fafc;
      border-radius: 12px;
      margin-bottom: 2rem;
    }

    .user-avatar {
      width: 56px;
      height: 56px;
      border-radius: 12px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .user-email {
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 0.25rem;
    }

    .user-role {
      font-size: 0.875rem;
      color: #718096;
    }

    .modal-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 2rem;
    }

    /* Form Card */
    .form-card {
      background: white;
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .form-header h2 {
      margin: 0 0 2rem 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: #1a202c;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }

    .form-group input,
    .form-group select {
      padding: 0.75rem 1rem;
      border: 2px solid #e2e8f0;
      border-radius: 10px;
      font-size: 0.95rem;
      transition: all 0.2s;
      outline: none;
    }

    .form-group input:focus,
    .form-group select:focus {
      border-color: #4299e1;
      box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
    }

    .form-hint {
      display: block;
      color: #718096;
      font-size: 0.8rem;
      margin-top: 0.375rem;
    }

    .form-error {
      display: block;
      color: #f56565;
      font-size: 0.8rem;
      margin-top: 0.375rem;
      font-weight: 600;
    }

    .checkbox-group {
      justify-content: center;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      cursor: pointer;
      padding: 0.75rem 1rem;
      border-radius: 10px;
      transition: background 0.2s;
    }

    .checkbox-label:hover {
      background: #f7fafc;
    }

    .checkbox-label input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
    }

    /* Table Card */
    .table-card {
      background: white;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.08);
    }

    .table-wrapper {
      overflow-x: auto;
    }

    .users-table {
      width: 100%;
      border-collapse: collapse;
    }

    .users-table thead {
      background: #f7fafc;
    }

    .users-table th {
      text-align: left;
      padding: 1rem 1.5rem;
      font-weight: 600;
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #718096;
      border-bottom: 2px solid #e2e8f0;
    }

    .users-table tbody tr {
      border-bottom: 1px solid #f7fafc;
      transition: background 0.2s;
    }

    .users-table tbody tr:hover {
      background: #f7fafc;
    }

    .users-table td {
      padding: 1.25rem 1.5rem;
      vertical-align: middle;
    }

    .user-cell {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .user-avatar-sm {
      width: 40px;
      height: 40px;
      border-radius: 10px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1rem;
      font-weight: 700;
      flex-shrink: 0;
    }

    .user-details {
      min-width: 0;
    }

    .user-email {
      font-weight: 600;
      color: #2d3748;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .user-id {
      font-size: 0.75rem;
      color: #a0aec0;
      margin-top: 0.125rem;
    }

    .contact-info {
      color: #4a5568;
    }

    .tenant-name {
      color: #4a5568;
    }

    .actions-col {
      width: 180px;
    }

    .action-buttons {
      display: flex;
      gap: 0.5rem;
    }

    .btn-action {
      width: 40px;
      height: 40px;
      border: none;
      border-radius: 10px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.125rem;
      transition: all 0.2s;
      background: #f7fafc;
      color: #4a5568;
    }

    .btn-action:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .btn-action-edit:hover {
      background: #bee3f8;
      color: #2c5282;
    }

    .btn-action-password:hover {
      background: #fef5e7;
      color: #975a16;
    }

    .btn-action-delete:hover {
      background: #fed7d7;
      color: #c53030;
    }

    /* Role Badges */
    .role-badge {
      display: inline-block;
      padding: 0.375rem 0.875rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      white-space: nowrap;
    }

    .role-admin {
      background: #fed7d7;
      color: #c53030;
    }

    .role-taxirankadmin {
      background: #e9d8fd;
      color: #6b46c1;
    }

    .role-taximarshal {
      background: #c6f6d5;
      color: #22543d;
    }

    .role-owner {
      background: #bee3f8;
      color: #2c5282;
    }

    .role-driver {
      background: #9ae6b4;
      color: #22543d;
    }

    .role-serviceprovider {
      background: #feebc8;
      color: #975a16;
    }

    .role-customer,
    .role-passenger {
      background: #b2f5ea;
      color: #234e52;
    }

    .role-staff,
    .role-mechanic,
    .role-shop {
      background: #e2e8f0;
      color: #2d3748;
    }

    /* Status Badge */
    .status-badge {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.375rem 0.875rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      animation: pulse 2s infinite;
    }

    @keyframes pulse {
      0%, 100% {
        opacity: 1;
      }
      50% {
        opacity: 0.5;
      }
    }

    .status-badge.active {
      background: #c6f6d5;
      color: #22543d;
    }

    .status-badge.active .status-dot {
      background: #22543d;
    }

    .status-badge.inactive {
      background: #fed7d7;
      color: #c53030;
    }

    .status-badge.inactive .status-dot {
      background: #c53030;
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 10px;
      font-size: 0.95rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
      white-space: nowrap;
    }

    .btn-icon {
      font-size: 1.125rem;
    }

    .btn-primary {
      background: #2d3748;
      color: white;
      box-shadow: 0 2px 4px rgba(45, 55, 72, 0.3);
    }

    .btn-primary:hover {
      background: #1a202c;
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(45, 55, 72, 0.4);
    }

    .btn-secondary {
      background: #e2e8f0;
      color: #2d3748;
    }

    .btn-secondary:hover {
      background: #cbd5e0;
      transform: translateY(-1px);
    }

    .btn-success {
      background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
      color: white;
      box-shadow: 0 2px 4px rgba(72, 187, 120, 0.3);
    }

    .btn-success:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 8px rgba(72, 187, 120, 0.4);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none !important;
    }

    /* Loading State */
    .loading-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 4rem 2rem;
    }

    .spinner {
      width: 48px;
      height: 48px;
      border: 4px solid #f7fafc;
      border-top-color: #4299e1;
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .loading-state p {
      margin-top: 1rem;
      color: #718096;
      font-weight: 500;
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .empty-state h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #2d3748;
      margin: 0 0 0.5rem 0;
    }

    .empty-state p {
      color: #718096;
      margin: 0;
    }

    /* Responsive */
    @media (max-width: 768px) {
      .users-container {
        padding: 1rem;
      }

      .page-header {
        padding: 1.5rem;
      }

      .header-content {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .filter-grid {
        grid-template-columns: 1fr;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .users-table th,
      .users-table td {
        padding: 0.75rem;
        font-size: 0.875rem;
      }

      .action-buttons {
        flex-direction: column;
      }

      .btn-action {
        width: 100%;
      }

      .modal {
        width: 95%;
      }

      .modal-body {
        padding: 1.5rem;
      }
    }
  `]
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  filteredUsers: User[] = [];
  tenants: Tenant[] = [];
  currentUser: Partial<User> = this.getEmptyUser();
  password: string = '';
  editingUser = false;
  showForm = false;
  loading = false;
  error = '';
  successMessage = '';
  
  filters = {
    searchTerm: '',
    role: '',
    status: '',
    tenantId: ''
  };
  
  showPasswordDialog = false;
  selectedUserForPassword: User | null = null;
  passwordChange = {
    newPassword: '',
    confirmPassword: ''
  };

  constructor(private identityService: IdentityService) {}

  ngOnInit() {
    this.loadUsers();
    this.loadTenants();
  }

  loadTenants() {
    this.identityService.getAllTenants().subscribe({
      next: (data) => {
        this.tenants = data;
      },
      error: (err) => {
        console.error('Failed to load tenants:', err);
      }
    });
  }

  async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  loadUsers() {
    this.loading = true;
    this.identityService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.filteredUsers = data;
        this.applyFilters();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load users: ' + err.message;
        this.loading = false;
      }
    });
  }
  
  applyFilters(): void {
    let filtered = [...this.users];
    
    // Apply search term filter
    if (this.filters.searchTerm) {
      const searchLower = this.filters.searchTerm.toLowerCase();
      filtered = filtered.filter(user => 
        user.email?.toLowerCase().includes(searchLower) ||
        user.phone?.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply role filter
    if (this.filters.role) {
      filtered = filtered.filter(user => user.role === this.filters.role);
    }
    
    // Apply status filter
    if (this.filters.status) {
      const isActive = this.filters.status === 'active';
      filtered = filtered.filter(user => user.isActive === isActive);
    }
    
    // Apply tenant filter
    if (this.filters.tenantId) {
      filtered = filtered.filter(user => user.tenantId === this.filters.tenantId);
    }
    
    this.filteredUsers = filtered;
  }
  
  clearFilters(): void {
    this.filters = {
      searchTerm: '',
      role: '',
      status: '',
      tenantId: ''
    };
    this.applyFilters();
  }
  
  hasActiveFilters(): boolean {
    return !!(
      this.filters.searchTerm ||
      this.filters.role ||
      this.filters.status ||
      this.filters.tenantId
    );
  }
  
  getTenantName(tenantId: string): string {
    const tenant = this.tenants.find(t => t.id === tenantId);
    return tenant?.name || 'N/A';
  }

  async saveUser() {
    if (this.editingUser && this.currentUser.id) {
      this.identityService.updateUser(this.currentUser.id, this.currentUser as User).subscribe({
        next: () => {
          this.loadUsers();
          this.cancelEdit();
        },
        error: (err) => this.error = 'Failed to update user: ' + err.message
      });
    } else {
      // Hash password for new user
      const passwordHash = await this.hashPassword(this.password);
      const userToCreate = {
        ...this.currentUser,
        passwordHash: passwordHash
      };
      
      this.identityService.createUser(userToCreate as User).subscribe({
        next: () => {
          this.loadUsers();
          this.cancelEdit();
        },
        error: (err) => this.error = 'Failed to create user: ' + err.message
      });
    }
  }

  editUser(user: User) {
    this.currentUser = { ...user };
    this.editingUser = true;
    this.showForm = true;
  }

  deleteUser(id: string) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.identityService.deleteUser(id).subscribe({
        next: () => this.loadUsers(),
        error: (err) => this.error = 'Failed to delete user: ' + err.message
      });
    }
  }

  cancelEdit() {
    this.currentUser = this.getEmptyUser();
    this.password = '';
    this.editingUser = false;
    this.showForm = false;
  }

  private getEmptyUser(): Partial<User> {
    return {
      tenantId: '',
      email: '',
      phone: '',
      role: 'Passenger',
      isActive: true
    };
  }
  
  showPasswordChange(user: User) {
    this.selectedUserForPassword = user;
    this.showPasswordDialog = true;
    this.showForm = false;
  }
  
  isPasswordValid(): boolean {
    return (
      this.passwordChange.newPassword.length >= 8 &&
      this.passwordChange.newPassword === this.passwordChange.confirmPassword
    );
  }
  
  changePassword() {
    if (!this.selectedUserForPassword || !this.isPasswordValid()) {
      return;
    }
    
    this.identityService.adminResetPassword(
      this.selectedUserForPassword.id,
      this.passwordChange.newPassword
    ).subscribe({
      next: (response) => {
        this.successMessage = response.message || 'Password reset successfully';
        this.cancelPasswordChange();
        setTimeout(() => this.successMessage = '', 5000);
      },
      error: (err) => {
        this.error = err.error?.message || 'Failed to reset password: ' + err.message;
        setTimeout(() => this.error = '', 5000);
      }
    });
  }
  
  cancelPasswordChange() {
    this.showPasswordDialog = false;
    this.selectedUserForPassword = null;
    this.passwordChange = {
      newPassword: '',
      confirmPassword: ''
    };
    this.error = '';
  }
}

