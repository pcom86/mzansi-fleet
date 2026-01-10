import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { IdentityService } from '../../services';
import { Tenant, User, OwnerProfile } from '../../models';

@Component({
  selector: 'app-identity-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="identity-container">
      <!-- Header -->
      <div class="page-header">
        <div class="header-content">
          <h1>🏢 Identity Management</h1>
          <p class="subtitle">Manage Organizations, Users, and Owner Profiles</p>
        </div>
        <button class="btn-add-org" (click)="openOnboarding()">
          <span>+</span> New Organization Setup
        </button>
      </div>

      <!-- Hierarchy Info Banner -->
      <div class="hierarchy-banner">
        <div class="hierarchy-step">
          <div class="hierarchy-icon">🏢</div>
          <div class="hierarchy-text">
            <strong>Organization</strong>
            <span>Top-level entity</span>
          </div>
        </div>
        <div class="hierarchy-arrow">→</div>
        <div class="hierarchy-step">
          <div class="hierarchy-icon">👥</div>
          <div class="hierarchy-text">
            <strong>Users</strong>
            <span>Belong to organization</span>
          </div>
        </div>
        <div class="hierarchy-arrow">→</div>
        <div class="hierarchy-step">
          <div class="hierarchy-icon">📋</div>
          <div class="hierarchy-text">
            <strong>Owner Profiles</strong>
            <span>Linked to specific users</span>
          </div>
        </div>
      </div>

      <!-- Tab Navigation -->
      <div class="tab-navigation">
        <button 
          class="tab-button" 
          [class.active]="activeTab === 'unified'"
          (click)="activeTab = 'unified'">
          <span class="tab-icon">📊</span>
          Unified View
        </button>
        <button 
          class="tab-button" 
          [class.active]="activeTab === 'tenants'"
          (click)="activeTab = 'tenants'">
          <span class="tab-icon">🏢</span>
          Organizations ({{ tenants.length }})
        </button>
        <button 
          class="tab-button" 
          [class.active]="activeTab === 'users'"
          (click)="activeTab = 'users'">
          <span class="tab-icon">👥</span>
          Users ({{ users.length }})
        </button>
        <button 
          class="tab-button" 
          [class.active]="activeTab === 'owners'"
          (click)="activeTab = 'owners'">
          <span class="tab-icon">📋</span>
          Owner Profiles ({{ ownerProfiles.length }})
        </button>
      </div>

      <!-- Error Banner -->
      <div class="error-banner" *ngIf="error">
        <span class="error-icon">⚠️</span>
        {{ error }}
      </div>

      <!-- Loading State -->
      <div class="loading-overlay" *ngIf="loading">
        <div class="spinner"></div>
        <p>Loading data...</p>
      </div>

      <!-- Unified View Tab -->
      <div class="tab-content" *ngIf="activeTab === 'unified' && !loading">
        <div class="unified-view">
          <div class="unified-header">
            <h2>Hierarchical Organization View</h2>
            <p class="subtitle">View all organizations, their users, and associated owner profiles</p>
          </div>

          <div class="organization-hierarchy" *ngFor="let tenant of tenants">
            <!-- Organization Card -->
            <div class="hierarchy-level organization-level">
              <div class="level-card org-card">
                <div class="card-header-unified">
                  <div class="header-left">
                    <div class="entity-icon org-icon">🏢</div>
                    <div class="entity-info">
                      <h3>{{ tenant.name }}</h3>
                      <span class="entity-type">Organization</span>
                    </div>
                  </div>
                  <div class="entity-stats">
                    <span class="stat-badge">{{ getUsersForTenant(tenant.id).length }} Users</span>
                  </div>
                </div>
                <div class="card-details">
                  <div class="detail-row">
                    <span class="label">📧 Email:</span>
                    <span>{{ tenant.contactEmail }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">📞 Phone:</span>
                    <span>{{ tenant.contactPhone }}</span>
                  </div>
                </div>
                <div class="card-actions-unified">
                  <button class="btn-sm btn-edit-sm" (click)="editTenant(tenant)">✏️ Edit</button>
                  <button class="btn-sm btn-delete-sm" (click)="deleteTenant(tenant.id)">🗑️ Delete</button>
                </div>
              </div>

              <!-- Users for this Organization -->
              <div class="users-container" *ngIf="getUsersForTenant(tenant.id).length > 0">
                <div class="connector-line"></div>
                <div class="hierarchy-level user-level" *ngFor="let user of getUsersForTenant(tenant.id)">
                  <div class="level-card user-card">
                    <div class="card-header-unified">
                      <div class="header-left">
                        <div class="entity-icon user-icon">👤</div>
                        <div class="entity-info">
                          <h4>{{ user.email }}</h4>
                          <span class="entity-type">User</span>
                        </div>
                      </div>
                      <div class="entity-stats">
                        <span class="role-badge-sm">{{ user.role }}</span>
                        <span class="status-badge" [class.active]="user.isActive" [class.inactive]="!user.isActive">
                          {{ user.isActive ? 'Active' : 'Inactive' }}
                        </span>
                      </div>
                    </div>
                    <div class="card-details">
                      <div class="detail-row">
                        <span class="label">📞 Phone:</span>
                        <span>{{ user.phone || 'N/A' }}</span>
                      </div>
                    </div>
                    <div class="card-actions-unified">
                      <button class="btn-sm btn-edit-sm" (click)="editUser(user)">✏️ Edit</button>
                      <button class="btn-sm btn-delete-sm" (click)="deleteUser(user.id)">🗑️ Delete</button>
                    </div>
                  </div>

                  <!-- Owner Profile for this User -->
                  <div class="owner-container" *ngIf="getOwnerProfileForUser(user.id)">
                    <div class="connector-line-sm"></div>
                    <div class="hierarchy-level profile-level">
                      <div class="level-card profile-card">
                        <div class="card-header-unified">
                          <div class="header-left">
                            <div class="entity-icon profile-icon">
                              <div class="avatar-sm">{{ getInitials(getOwnerProfileForUser(user.id)?.contactName || '') }}</div>
                            </div>
                            <div class="entity-info">
                              <h5>{{ getOwnerProfileForUser(user.id)?.companyName }}</h5>
                              <span class="entity-type">Owner Profile</span>
                            </div>
                          </div>
                        </div>
                        <div class="card-details">
                          <div class="detail-row">
                            <span class="label">👤 Contact:</span>
                            <span>{{ getOwnerProfileForUser(user.id)?.contactName }}</span>
                          </div>
                          <div class="detail-row">
                            <span class="label">📧 Email:</span>
                            <span>{{ getOwnerProfileForUser(user.id)?.contactEmail }}</span>
                          </div>
                          <div class="detail-row">
                            <span class="label">📞 Phone:</span>
                            <span>{{ getOwnerProfileForUser(user.id)?.contactPhone }}</span>
                          </div>
                          <div class="detail-row" *ngIf="getOwnerProfileForUser(user.id)?.address">
                            <span class="label">📍 Address:</span>
                            <span>{{ getOwnerProfileForUser(user.id)?.address }}</span>
                          </div>
                        </div>
                        <div class="card-actions-unified">
                          <button class="btn-sm btn-dashboard-sm" (click)="viewDashboard(getOwnerProfileForUser(user.id)!.id)">📊 Dashboard</button>
                          <button class="btn-sm btn-edit-sm" (click)="editOwnerProfile(getOwnerProfileForUser(user.id)!)">✏️ Edit</button>
                          <button class="btn-sm btn-delete-sm" (click)="deleteOwnerProfile(getOwnerProfileForUser(user.id)!.id)">🗑️ Delete</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Empty State for Organization -->
              <div class="empty-users" *ngIf="getUsersForTenant(tenant.id).length === 0">
                <p>No users in this organization</p>
              </div>
            </div>
          </div>

          <!-- Overall Empty State -->
          <div class="empty-state" *ngIf="tenants.length === 0">
            <div class="empty-icon">🏢</div>
            <h3>No organizations yet</h3>
            <p>Create your first organization to get started</p>
            <button class="btn-add-org" (click)="openOnboarding()">
              <span>+</span> New Organization Setup
            </button>
          </div>
        </div>
      </div>

      <!-- Tenants Tab -->
      <div class="tab-content" *ngIf="activeTab === 'tenants' && !loading">
        <div class="content-header">
          <h2>Organizations</h2>
          <button class="btn-add" (click)="createTenant()">
            <span>+</span> Add Organization
          </button>
        </div>

        <div class="data-grid">
          <div class="data-card" *ngFor="let tenant of tenants">
            <div class="card-header">
              <div class="card-icon">🏢</div>
              <h3>{{ tenant.name }}</h3>
            </div>
            <div class="card-body">
              <div class="info-row">
                <span class="label">Email:</span>
                <span>{{ tenant.contactEmail }}</span>
              </div>
              <div class="info-row">
                <span class="label">Phone:</span>
                <span>{{ tenant.contactPhone }}</span>
              </div>
              <div class="info-row">
                <span class="label">Users:</span>
                <span class="badge">{{ getUserCountForTenant(tenant.id) }}</span>
              </div>
            </div>
            <div class="card-actions">
              <button class="btn-view" (click)="viewTenantDetails(tenant.id)">
                <span>👁️</span> View
              </button>
              <button class="btn-edit" (click)="editTenant(tenant)">
                <span>✏️</span> Edit
              </button>
              <button class="btn-delete" (click)="deleteTenant(tenant.id)">
                <span>🗑️</span> Delete
              </button>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="tenants.length === 0">
          <div class="empty-icon">🏢</div>
          <h3>No organizations yet</h3>
          <p>Create your first organization to get started</p>
        </div>
      </div>

      <!-- Users Tab -->
      <div class="tab-content" *ngIf="activeTab === 'users' && !loading">
        <div class="content-header">
          <h2>Users</h2>
          <div class="filter-section">
            <label>Filter by Organization:</label>
            <select [(ngModel)]="selectedTenantFilter" (change)="filterUsers()">
              <option value="">All Organizations</option>
              <option *ngFor="let tenant of tenants" [value]="tenant.id">
                {{ tenant.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="data-grid">
          <div class="data-card" *ngFor="let user of filteredUsers">
            <div class="card-header">
              <div class="card-icon">👤</div>
              <h3>{{ user.email }}</h3>
              <span class="role-badge">{{ user.role }}</span>
            </div>
            <div class="card-body">
              <div class="info-row">
                <span class="label">Organization:</span>
                <span>{{ getTenantName(user.tenantId) }}</span>
              </div>
              <div class="info-row">
                <span class="label">Phone:</span>
                <span>{{ user.phone || 'N/A' }}</span>
              </div>
              <div class="info-row">
                <span class="label">Status:</span>
                <span [class.active-status]="user.isActive" [class.inactive-status]="!user.isActive">
                  {{ user.isActive ? 'Active' : 'Inactive' }}
                </span>
              </div>
              <div class="info-row">
                <span class="label">Owner Profile:</span>
                <span class="badge">{{ hasOwnerProfile(user.id) ? 'Yes' : 'No' }}</span>
              </div>
            </div>
            <div class="card-actions">
              <button class="btn-view" (click)="viewUserDetails(user.id)" *ngIf="hasOwnerProfile(user.id)">
                <span>📋</span> View Profile
              </button>
              <button class="btn-edit" (click)="editUser(user)">
                <span>✏️</span> Edit
              </button>
              <button class="btn-delete" (click)="deleteUser(user.id)">
                <span>🗑️</span> Delete
              </button>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="filteredUsers.length === 0">
          <div class="empty-icon">👥</div>
          <h3>No users found</h3>
          <p>{{ selectedTenantFilter ? 'No users in this organization' : 'Create users to manage access' }}</p>
        </div>
      </div>

      <!-- Owner Profiles Tab -->
      <div class="tab-content" *ngIf="activeTab === 'owners' && !loading">
        <div class="content-header">
          <h2>Owner Profiles</h2>
          <div class="filter-section">
            <label>Filter by Organization:</label>
            <select [(ngModel)]="selectedTenantFilter" (change)="filterOwnerProfiles()">
              <option value="">All Organizations</option>
              <option *ngFor="let tenant of tenants" [value]="tenant.id">
                {{ tenant.name }}
              </option>
            </select>
          </div>
        </div>

        <div class="data-grid">
          <div class="data-card" *ngFor="let profile of filteredOwnerProfiles">
            <div class="card-header">
              <div class="card-icon">
                <div class="avatar-circle">{{ getInitials(profile.contactName || '') }}</div>
              </div>
              <div>
                <h3>{{ profile.contactName || 'N/A' }}</h3>
                <p class="company-subtitle">{{ profile.companyName || 'N/A' }}</p>
              </div>
            </div>
            <div class="card-body">
              <div class="info-row">
                <span class="label">Email:</span>
                <span>{{ profile.contactEmail }}</span>
              </div>
              <div class="info-row">
                <span class="label">Phone:</span>
                <span>{{ profile.contactPhone }}</span>
              </div>
              <div class="info-row">
                <span class="label">Address:</span>
                <span>{{ profile.address || 'N/A' }}</span>
              </div>
              <div class="info-row">
                <span class="label">User:</span>
                <span>{{ getUserEmail(profile.userId) }}</span>
              </div>
            </div>
            <div class="card-actions">
              <button class="btn-dashboard" (click)="viewDashboard(profile.id)">
                <span>📊</span> Dashboard
              </button>
              <button class="btn-edit" (click)="editOwnerProfile(profile)">
                <span>✏️</span> Edit
              </button>
              <button class="btn-delete" (click)="deleteOwnerProfile(profile.id)">
                <span>🗑️</span> Delete
              </button>
            </div>
          </div>
        </div>

        <div class="empty-state" *ngIf="filteredOwnerProfiles.length === 0">
          <div class="empty-icon">📋</div>
          <h3>No owner profiles found</h3>
          <p>{{ selectedTenantFilter ? 'No profiles in this organization' : 'Create owner profiles for fleet management' }}</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .identity-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      min-height: 100vh;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      background: white;
      padding: 2rem;
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .header-content h1 {
      font-size: 2rem;
      font-weight: 700;
      color: #000000;
      margin-bottom: 0.5rem;
    }

    .subtitle {
      color: #6b7280;
      margin: 0;
    }

    .btn-add-org {
      background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%);
      color: #000000;
      border: none;
      padding: 1rem 2rem;
      border-radius: 10px;
      font-weight: 700;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
    }

    .btn-add-org:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(212, 175, 55, 0.4);
    }

    .btn-add-org span {
      font-size: 1.5rem;
    }

    .hierarchy-banner {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 2rem;
      background: linear-gradient(135deg, #FFF9E5 0%, #FFECB3 100%);
      padding: 1.5rem;
      border-radius: 15px;
      margin-bottom: 2rem;
      border: 2px solid #D4AF37;
    }

    .hierarchy-step {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .hierarchy-icon {
      font-size: 2rem;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      border-radius: 50%;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }

    .hierarchy-text {
      display: flex;
      flex-direction: column;
    }

    .hierarchy-text strong {
      color: #000000;
      font-size: 1rem;
    }

    .hierarchy-text span {
      color: #6b7280;
      font-size: 0.875rem;
    }

    .hierarchy-arrow {
      font-size: 2rem;
      color: #D4AF37;
      font-weight: 700;
    }

    .tab-navigation {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
      background: white;
      padding: 1rem;
      border-radius: 15px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }

    .tab-button {
      flex: 1;
      padding: 1rem 1.5rem;
      border: 2px solid #e5e7eb;
      background: white;
      border-radius: 10px;
      cursor: pointer;
      transition: all 0.3s ease;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      color: #6b7280;
    }

    .tab-button:hover {
      border-color: #D4AF37;
      transform: translateY(-2px);
    }

    .tab-button.active {
      background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
      color: #FFD700;
      border-color: #000000;
    }

    .tab-icon {
      font-size: 1.25rem;
    }

    .tab-content {
      animation: fadeIn 0.3s ease;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .content-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      background: white;
      padding: 1.5rem;
      border-radius: 15px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }

    .content-header h2 {
      font-size: 1.5rem;
      font-weight: 700;
      color: #000000;
      margin: 0;
    }

    .filter-section {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .filter-section label {
      font-weight: 600;
      color: #374151;
    }

    .filter-section select {
      padding: 0.5rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 1rem;
    }

    .btn-add {
      background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
      color: #FFD700;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
    }

    .btn-add:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
    }

    .data-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .data-card {
      background: white;
      border-radius: 15px;
      overflow: hidden;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    }

    .data-card:hover {
      transform: translateY(-5px);
      box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
    }

    .card-header {
      background: linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%);
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      border-bottom: 2px solid #e5e7eb;
    }

    .card-icon {
      font-size: 2rem;
      width: 50px;
      height: 50px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: white;
      border-radius: 50%;
    }

    .avatar-circle {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%);
      color: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.25rem;
    }

    .card-header h3 {
      font-size: 1.125rem;
      font-weight: 700;
      color: #000000;
      margin: 0;
    }

    .company-subtitle {
      color: #6b7280;
      font-size: 0.875rem;
      margin: 0.25rem 0 0;
    }

    .role-badge {
      background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%);
      color: #000000;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      margin-left: auto;
    }

    .card-body {
      padding: 1.5rem;
    }

    .info-row {
      display: flex;
      justify-content: space-between;
      padding: 0.5rem 0;
      border-bottom: 1px solid #f3f4f6;
    }

    .info-row:last-child {
      border-bottom: none;
    }

    .info-row .label {
      font-weight: 600;
      color: #6b7280;
      font-size: 0.875rem;
    }

    .badge {
      background: #e5e7eb;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .active-status {
      color: #10b981;
      font-weight: 600;
    }

    .inactive-status {
      color: #ef4444;
      font-weight: 600;
    }

    .card-actions {
      display: flex;
      gap: 0.5rem;
      padding: 1rem;
      background: #f9fafb;
      border-top: 2px solid #e5e7eb;
    }

    .btn-view,
    .btn-edit,
    .btn-delete,
    .btn-dashboard {
      flex: 1;
      padding: 0.75rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      font-size: 0.875rem;
    }

    .btn-view {
      background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
      color: white;
    }

    .btn-dashboard {
      background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%);
      color: #000000;
    }

    .btn-edit {
      background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
      color: white;
    }

    .btn-delete {
      background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
      color: white;
    }

    .btn-view:hover,
    .btn-edit:hover,
    .btn-delete:hover,
    .btn-dashboard:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: white;
      border-radius: 15px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      font-size: 1.5rem;
      color: #374151;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      color: #6b7280;
    }

    .error-banner {
      background: #fee2e2;
      border-left: 4px solid #ef4444;
      color: #991b1b;
      padding: 1rem 1.5rem;
      border-radius: 10px;
      margin-bottom: 2rem;
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .error-icon {
      font-size: 1.5rem;
    }

    .loading-overlay {
      text-align: center;
      padding: 4rem 2rem;
      background: white;
      border-radius: 15px;
      box-shadow: 0 4px 15px rgba(0, 0, 0, 0.05);
    }

    .spinner {
      width: 50px;
      height: 50px;
      border: 4px solid #f3f4f6;
      border-top: 4px solid #D4AF37;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .identity-container {
        padding: 1rem;
      }

      .page-header {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
      }

      .hierarchy-banner {
        flex-direction: column;
        gap: 1rem;
      }

      .hierarchy-arrow {
        transform: rotate(90deg);
      }

      .tab-navigation {
        flex-direction: column;
      }

      .content-header {
        flex-direction: column;
        align-items: flex-start;
        gap: 1rem;
      }

      .data-grid {
        grid-template-columns: 1fr;
      }

      .card-actions {
        flex-wrap: wrap;
      }
    }

    /* Unified View Styles */
    .unified-view {
      animation: fadeIn 0.3s ease;
    }

    .unified-header {
      background: white;
      padding: 2rem;
      border-radius: 15px;
      margin-bottom: 2rem;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }

    .unified-header h2 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #000000;
      margin: 0 0 0.5rem;
    }

    .organization-hierarchy {
      margin-bottom: 3rem;
    }

    .hierarchy-level {
      position: relative;
    }

    .organization-level {
      background: white;
      border-radius: 20px;
      padding: 2rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
      margin-bottom: 2rem;
    }

    .level-card {
      background: white;
      border-radius: 15px;
      overflow: hidden;
      transition: all 0.3s ease;
      border: 2px solid #e5e7eb;
    }

    .org-card {
      border-left: 5px solid #D4AF37;
      background: linear-gradient(135deg, #FFFEF7 0%, #FFF9E5 100%);
    }

    .user-card {
      border-left: 5px solid #3b82f6;
      background: linear-gradient(135deg, #F7FBFF 0%, #EBF5FF 100%);
      margin-bottom: 1.5rem;
    }

    .profile-card {
      border-left: 5px solid #10b981;
      background: linear-gradient(135deg, #F7FEF9 0%, #ECFDF5 100%);
    }

    .card-header-unified {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 2px solid #f3f4f6;
    }

    .header-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .entity-icon {
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 50%;
      font-size: 2rem;
    }

    .org-icon {
      background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%);
    }

    .user-icon {
      background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
    }

    .profile-icon {
      background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
    }

    .avatar-sm {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%);
      color: #000000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 1.25rem;
    }

    .entity-info h3,
    .entity-info h4,
    .entity-info h5 {
      margin: 0 0 0.25rem;
      color: #000000;
    }

    .entity-info h3 {
      font-size: 1.5rem;
    }

    .entity-info h4 {
      font-size: 1.25rem;
    }

    .entity-info h5 {
      font-size: 1.125rem;
    }

    .entity-type {
      font-size: 0.75rem;
      color: #6b7280;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.05em;
    }

    .entity-stats {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .stat-badge {
      background: #e5e7eb;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 600;
      color: #374151;
    }

    .role-badge-sm {
      background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%);
      color: #000000;
      padding: 0.375rem 0.875rem;
      border-radius: 15px;
      font-size: 0.75rem;
      font-weight: 700;
    }

    .status-badge {
      padding: 0.375rem 0.875rem;
      border-radius: 15px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-badge.active {
      background: #d1fae5;
      color: #065f46;
    }

    .status-badge.inactive {
      background: #fee2e2;
      color: #991b1b;
    }

    .card-details {
      padding: 1.5rem;
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
    }

    .detail-row {
      display: flex;
      gap: 0.75rem;
      font-size: 0.95rem;
    }

    .detail-row .label {
      color: #6b7280;
      font-weight: 600;
      min-width: 100px;
    }

    .card-actions-unified {
      display: flex;
      gap: 0.5rem;
      padding: 1rem 1.5rem;
      background: rgba(0, 0, 0, 0.02);
      border-top: 2px solid #f3f4f6;
    }

    .btn-sm {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.875rem;
      display: flex;
      align-items: center;
      gap: 0.25rem;
    }

    .btn-dashboard-sm {
      background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%);
      color: #000000;
    }

    .btn-edit-sm {
      background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
      color: white;
    }

    .btn-delete-sm {
      background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
      color: white;
    }

    .btn-sm:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .users-container {
      margin-top: 2rem;
      margin-left: 3rem;
      position: relative;
    }

    .owner-container {
      margin-top: 1.5rem;
      margin-left: 3rem;
      position: relative;
    }

    .connector-line {
      position: absolute;
      left: -2rem;
      top: 0;
      bottom: 0;
      width: 3px;
      background: linear-gradient(180deg, #D4AF37 0%, #3b82f6 100%);
      border-radius: 2px;
    }

    .connector-line-sm {
      position: absolute;
      left: -2rem;
      top: 0;
      bottom: 0;
      width: 3px;
      background: linear-gradient(180deg, #3b82f6 0%, #10b981 100%);
      border-radius: 2px;
    }

    .user-level::before {
      content: '';
      position: absolute;
      left: -2rem;
      top: 50%;
      width: 2rem;
      height: 3px;
      background: #D4AF37;
      border-radius: 2px;
    }

    .profile-level::before {
      content: '';
      position: absolute;
      left: -2rem;
      top: 50%;
      width: 2rem;
      height: 3px;
      background: #3b82f6;
      border-radius: 2px;
    }

    .empty-users {
      margin-top: 1rem;
      padding: 2rem;
      text-align: center;
      background: #f9fafb;
      border-radius: 10px;
      color: #6b7280;
      font-style: italic;
    }

    @media (max-width: 768px) {
      .users-container,
      .owner-container {
        margin-left: 1rem;
      }

      .connector-line,
      .connector-line-sm {
        left: -0.75rem;
      }

      .user-level::before,
      .profile-level::before {
        left: -0.75rem;
        width: 0.75rem;
      }

      .card-actions-unified {
        flex-wrap: wrap;
      }

      .entity-icon {
        width: 50px;
        height: 50px;
        font-size: 1.5rem;
      }

      .avatar-sm {
        width: 50px;
        height: 50px;
        font-size: 1rem;
      }
    }
  `]
})
export class IdentityManagementComponent implements OnInit {
  activeTab: 'unified' | 'tenants' | 'users' | 'owners' = 'unified';
  loading = false;
  error: string | null = null;

  tenants: Tenant[] = [];
  users: User[] = [];
  ownerProfiles: OwnerProfile[] = [];

  filteredUsers: User[] = [];
  filteredOwnerProfiles: OwnerProfile[] = [];
  selectedTenantFilter = '';

  constructor(
    private identityService: IdentityService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.loadAllData();
  }

  loadAllData(): void {
    this.loading = true;
    this.error = null;

    Promise.all([
      this.identityService.getAllTenants().toPromise(),
      this.identityService.getAllUsers().toPromise(),
      this.identityService.getAllOwnerProfiles().toPromise()
    ]).then(([tenants, users, profiles]) => {
      this.tenants = tenants || [];
      this.users = users || [];
      this.ownerProfiles = profiles || [];
      this.filteredUsers = this.users;
      this.filteredOwnerProfiles = this.ownerProfiles;
      this.loading = false;
    }).catch(err => {
      this.error = 'Failed to load data: ' + err.message;
      this.loading = false;
    });
  }

  // Tenant methods
  createTenant(): void {
    // TODO: Open create tenant modal
    console.log('Create tenant');
  }

  editTenant(tenant: Tenant): void {
    // TODO: Open edit tenant modal
    console.log('Edit tenant:', tenant);
  }

  deleteTenant(id: string): void {
    if (confirm('Are you sure? This will delete all associated users and profiles.')) {
      this.identityService.deleteTenant(id).subscribe({
        next: () => this.loadAllData(),
        error: (err) => this.error = 'Failed to delete tenant: ' + err.message
      });
    }
  }

  viewTenantDetails(id: string): void {
    this.router.navigate(['/identity/tenants', id]);
  }

  getUserCountForTenant(tenantId: string): number {
    return this.users.filter(u => u.tenantId === tenantId).length;
  }

  // User methods
  editUser(user: User): void {
    // TODO: Open edit user modal
    console.log('Edit user:', user);
  }

  deleteUser(id: string): void {
    if (confirm('Are you sure? This will delete the associated owner profile if any.')) {
      this.identityService.deleteUser(id).subscribe({
        next: () => this.loadAllData(),
        error: (err) => this.error = 'Failed to delete user: ' + err.message
      });
    }
  }

  viewUserDetails(userId: string): void {
    const profile = this.ownerProfiles.find(p => p.userId === userId);
    if (profile) {
      this.viewDashboard(profile.id);
    }
  }

  filterUsers(): void {
    if (this.selectedTenantFilter) {
      this.filteredUsers = this.users.filter(u => u.tenantId === this.selectedTenantFilter);
    } else {
      this.filteredUsers = this.users;
    }
  }

  getTenantName(tenantId: string): string {
    const tenant = this.tenants.find(t => t.id === tenantId);
    return tenant ? tenant.name || 'N/A' : 'Unknown';
  }

  hasOwnerProfile(userId: string): boolean {
    return this.ownerProfiles.some(p => p.userId === userId);
  }

  // Owner Profile methods
  editOwnerProfile(profile: OwnerProfile): void {
    // TODO: Open edit owner profile modal
    console.log('Edit owner profile:', profile);
  }

  deleteOwnerProfile(id: string): void {
    if (confirm('Are you sure you want to delete this owner profile?')) {
      this.identityService.deleteOwnerProfile(id).subscribe({
        next: () => this.loadAllData(),
        error: (err) => this.error = 'Failed to delete owner profile: ' + err.message
      });
    }
  }

  viewDashboard(profileId: string): void {
    this.router.navigate(['/owner-dashboard'], { queryParams: { profileId } });
  }

  filterOwnerProfiles(): void {
    if (this.selectedTenantFilter) {
      const userIds = this.users
        .filter(u => u.tenantId === this.selectedTenantFilter)
        .map(u => u.id);
      this.filteredOwnerProfiles = this.ownerProfiles.filter(p => userIds.includes(p.userId));
    } else {
      this.filteredOwnerProfiles = this.ownerProfiles;
    }
  }

  getUserEmail(userId: string): string {
    const user = this.users.find(u => u.id === userId);
    return user ? user.email || 'N/A' : 'Unknown';
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  openOnboarding(): void {
    this.router.navigate(['/onboarding']);
  }

  // Helper methods for unified view
  getUsersForTenant(tenantId: string): User[] {
    return this.users.filter(u => u.tenantId === tenantId);
  }

  getOwnerProfileForUser(userId: string): OwnerProfile | undefined {
    return this.ownerProfiles.find(p => p.userId === userId);
  }
}
