import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { IdentityService } from '../../services';
import { DriverProfile } from '../../models';

@Component({
  selector: 'app-drivers',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="drivers-container">
      <!-- Header Section -->
      <div class="header-section">
        <div class="header-content">
          <div class="title-section">
            <h1>Fleet Drivers</h1>
            <p class="subtitle">Manage your driver profiles and assignments</p>
          </div>
          <button class="btn-add" (click)="toggleForm()">
            <span class="btn-icon">{{ showForm ? '✕' : '+' }}</span>
            <span>{{ showForm ? 'Cancel' : 'Add Driver' }}</span>
          </button>
        </div>
        
        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon active">👤</div>
            <div class="stat-details">
              <div class="stat-value">{{ getActiveDrivers().length }}</div>
              <div class="stat-label">Active Drivers</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon available">🟢</div>
            <div class="stat-details">
              <div class="stat-value">{{ getAvailableDrivers().length }}</div>
              <div class="stat-label">Available</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon assigned">🚗</div>
            <div class="stat-details">
              <div class="stat-value">{{ getAssignedDrivers().length }}</div>
              <div class="stat-label">Assigned</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon total">📊</div>
            <div class="stat-details">
              <div class="stat-value">{{ drivers.length }}</div>
              <div class="stat-label">Total Drivers</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add/Edit Form -->
      <div class="form-modal" *ngIf="showForm">
        <div class="form-card">
          <h2>{{ editingDriver ? 'Edit Driver' : 'Add New Driver' }}</h2>
          
          <div class="error-banner" *ngIf="error">
            <span class="error-icon">⚠️</span>
            {{ error }}
          </div>
          
          <form (ngSubmit)="saveDriver()">
            <div class="form-grid">
              <div class="form-group">
                <label>Name *</label>
                <input type="text" [(ngModel)]="currentDriver.name" name="name" required placeholder="Full name">
              </div>
              
              <div class="form-group">
                <label>ID/Passport Number *</label>
                <input type="text" [(ngModel)]="currentDriver.idNumber" name="idNumber" required placeholder="ID or Passport number">
              </div>
              
              <div class="form-group">
                <label>Phone</label>
                <input type="tel" [(ngModel)]="currentDriver.phone" name="phone" placeholder="+27 12 345 6789">
              </div>
              
              <div class="form-group">
                <label>Email</label>
                <input type="email" [(ngModel)]="currentDriver.email" name="email" placeholder="driver@example.com">
              </div>

              <div class="form-group">
                <label>License Category *</label>
                <select [(ngModel)]="currentDriver.category" name="category" required>
                  <option value="">Select category</option>
                  <option value="Light Vehicle">Light Vehicle (Code B)</option>
                  <option value="Taxi">Taxi/Minibus (Code C1)</option>
                  <option value="Truck">Truck/Heavy Vehicle (Code C/EC)</option>
                </select>
              </div>
              
              <div class="form-group full-width">
                <label>Profile Photo</label>
                <div class="file-upload-area">
                  <input type="file" (change)="onPhotoSelected($event)" accept="image/*" #photoInput id="photoInput">
                  <label for="photoInput" class="file-upload-label">
                    <span class="upload-icon">📷</span>
                    <span>Click to upload profile photo</span>
                  </label>
                  <div class="photo-preview" *ngIf="currentDriver.photoUrl">
                    <img [src]="currentDriver.photoUrl" alt="Preview">
                    <button type="button" class="btn-remove-photo" (click)="removePhoto()">✕</button>
                  </div>
                </div>
              </div>

              <div class="form-group full-width">
                <label>License Copy *</label>
                <div class="file-upload-area">
                  <input type="file" (change)="onLicenseSelected($event)" accept="image/*,application/pdf" #licenseInput id="licenseInput">
                  <label for="licenseInput" class="file-upload-label">
                    <span class="upload-icon">📄</span>
                    <span>Click to upload license copy</span>
                  </label>
                  <div class="file-preview" *ngIf="currentDriver.licenseCopy">
                    <span class="file-name">✓ License uploaded</span>
                    <button type="button" class="btn-remove-photo" (click)="removeLicense()">✕</button>
                  </div>
                </div>
              </div>

              <div class="form-group full-width">
                <label>Experience Summary</label>
                <textarea [(ngModel)]="currentDriver.experience" name="experience" 
                  placeholder="Brief summary of driving experience (e.g., years of experience, types of vehicles driven)"
                  rows="3"></textarea>
              </div>

              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="currentDriver.hasPdp" name="hasPdp">
                  <span class="checkbox-text">
                    <span class="checkbox-icon">✓</span>
                    Has PDP (Professional Driving Permit)
                  </span>
                </label>
              </div>

              <div class="form-group full-width" *ngIf="currentDriver.hasPdp">
                <label>PDP Copy *</label>
                <div class="file-upload-area">
                  <input type="file" (change)="onPdpSelected($event)" accept="image/*,application/pdf" #pdpInput id="pdpInput">
                  <label for="pdpInput" class="file-upload-label">
                    <span class="upload-icon">📄</span>
                    <span>Click to upload PDP copy</span>
                  </label>
                  <div class="file-preview" *ngIf="currentDriver.pdpCopy">
                    <span class="file-name">✓ PDP uploaded</span>
                    <button type="button" class="btn-remove-photo" (click)="removePdp()">✕</button>
                  </div>
                </div>
              </div>
              
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="currentDriver.isActive" name="isActive">
                  <span class="checkbox-text">
                    <span class="checkbox-icon">✓</span>
                    Active Status
                  </span>
                </label>
              </div>
              
              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input type="checkbox" [(ngModel)]="currentDriver.isAvailable" name="isAvailable">
                  <span class="checkbox-text">
                    <span class="checkbox-icon">✓</span>
                    Available for Assignment
                  </span>
                </label>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn-cancel" (click)="cancelEdit()">Cancel</button>
              <button type="submit" class="btn-save">
                <span>{{ editingDriver ? 'Update' : 'Save' }} Driver</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Drivers Grid -->
      <div class="drivers-content">
        <div class="loading-state" *ngIf="loading">
          <div class="spinner"></div>
          <p>Loading drivers...</p>
        </div>
        
        <div class="drivers-grid" *ngIf="!loading && drivers.length > 0">
          <div class="driver-card" *ngFor="let driver of drivers">
            <div class="driver-header">
              <div class="driver-avatar">
                <img *ngIf="driver.photoUrl" [src]="driver.photoUrl" alt="{{ driver.name }}">
                <span *ngIf="!driver.photoUrl" class="avatar-placeholder">{{ getInitials(driver.name || 'N/A') }}</span>
              </div>
              <div class="status-badges">
                <span class="status-badge" [class.active]="driver.isActive" [class.inactive]="!driver.isActive">
                  {{ driver.isActive ? '✓ Active' : '✗ Inactive' }}
                </span>
                <span class="availability-badge" [class.available]="driver.isAvailable" [class.unavailable]="!driver.isAvailable">
                  {{ driver.isAvailable ? '🟢 Available' : '🔴 Busy' }}
                </span>
              </div>
            </div>
            
            <div class="driver-details">
              <h3>{{ driver.name || 'N/A' }}</h3>
              <div class="driver-info">
                <div class="info-row" *ngIf="driver.idNumber">
                  <span class="info-icon">🆔</span>
                  <span class="info-text">{{ driver.idNumber }}</span>
                </div>
                <div class="info-row" *ngIf="driver.category">
                  <span class="info-icon">📋</span>
                  <span class="info-text">{{ driver.category }}</span>
                </div>
                <div class="info-row" *ngIf="driver.hasPdp">
                  <span class="info-icon">✅</span>
                  <span class="info-text pdp-badge">Has PDP</span>
                </div>
                <div class="info-row" *ngIf="driver.email">
                  <span class="info-icon">📧</span>
                  <span class="info-text">{{ driver.email }}</span>
                </div>
                <div class="info-row" *ngIf="driver.phone">
                  <span class="info-icon">📱</span>
                  <span class="info-text">{{ driver.phone }}</span>
                </div>
                <div class="info-row" *ngIf="driver.experience">
                  <span class="info-icon">💼</span>
                  <span class="info-text">{{ driver.experience }}</span>
                </div>
                <div class="info-row" *ngIf="driver.assignedVehicleId">
                  <span class="info-icon">🚗</span>
                  <span class="info-text assigned-vehicle">Assigned to Vehicle</span>
                </div>
                <div class="info-row" *ngIf="!driver.assignedVehicleId">
                  <span class="info-icon">⭕</span>
                  <span class="info-text">No vehicle assigned</span>
                </div>
              </div>
              
              <div class="driver-actions">
                <button 
                  *ngIf="!driver.isActive" 
                  class="btn-activate" 
                  (click)="activateDriver(driver)"
                  title="Activate this driver account">
                  <span>✅</span> Activate
                </button>
                <button class="btn-edit" (click)="editDriver(driver)">
                  <span>✏️</span> Edit
                </button>
                <button class="btn-delete" (click)="deleteDriver(driver.id)">
                  <span>🗑️</span> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div *ngIf="!loading && drivers.length === 0" class="empty-state">
          <div class="empty-icon">👤</div>
          <h3>No drivers yet</h3>
          <p>Add your first driver to get started</p>
          <button class="btn-add-first" (click)="showForm = true">
            <span>+</span> Add Driver
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .drivers-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
      padding: 2rem;
    }

    /* Header Section */
    .header-section {
      margin-bottom: 2rem;
    }

    .header-content {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .title-section h1 {
      font-size: 2.5rem;
      font-weight: 700;
      color: #000000;
      margin: 0;
      background: linear-gradient(135deg, #000000 0%, #D4AF37 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }

    .subtitle {
      color: #666;
      font-size: 1rem;
      margin-top: 0.5rem;
    }

    .btn-add {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 2rem;
      background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%);
      color: #000000;
      border: none;
      border-radius: 50px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
      transition: all 0.3s ease;
    }

    .btn-add:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(212, 175, 55, 0.4);
    }

    .btn-icon {
      font-size: 1.5rem;
      font-weight: bold;
    }

    /* Stats Grid */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      border-radius: 16px;
      padding: 1.5rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
    }

    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
    }

    .stat-icon {
      width: 60px;
      height: 60px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
    }

    .stat-icon.active {
      background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
    }

    .stat-icon.available {
      background: linear-gradient(135deg, #22c55e 0%, #4ade80 100%);
    }

    .stat-icon.assigned {
      background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
    }

    .stat-icon.total {
      background: linear-gradient(135deg, #000000 0%, #D4AF37 100%);
    }

    .stat-details {
      flex: 1;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 700;
      color: #000000;
    }

    .stat-label {
      font-size: 0.875rem;
      color: #666;
      margin-top: 0.25rem;
    }

    /* Form Modal */
    .form-modal {
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
      padding: 2rem;
      overflow-y: auto;
    }

    .form-card {
      background: white;
      border-radius: 20px;
      padding: 2.5rem;
      max-width: 800px;
      width: 100%;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      max-height: 90vh;
      overflow-y: auto;
    }

    .form-card h2 {
      margin: 0 0 1.5rem 0;
      color: #000000;
      font-size: 1.75rem;
      font-weight: 700;
    }

    .error-banner {
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
      color: #991b1b;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      margin-bottom: 1.5rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .error-icon {
      font-size: 1.5rem;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group label {
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #374151;
      font-size: 0.875rem;
    }

    .form-group input[type="text"],
    .form-group input[type="email"],
    .form-group input[type="tel"],
    .form-group select,
    .form-group textarea {
      padding: 0.75rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      font-size: 1rem;
      transition: all 0.3s ease;
      font-family: inherit;
    }

    .form-group select {
      cursor: pointer;
      background-color: white;
    }

    .form-group textarea {
      resize: vertical;
      min-height: 80px;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #D4AF37;
      box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
    }

    .checkbox-group {
      display: flex;
      align-items: center;
    }

    .checkbox-label {
      display: flex;
      align-items: center;
      cursor: pointer;
      margin: 0;
    }

    .checkbox-label input[type="checkbox"] {
      width: 20px;
      height: 20px;
      margin-right: 0.75rem;
      cursor: pointer;
      accent-color: #D4AF37;
    }

    .checkbox-text {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      font-weight: 500;
      color: #374151;
    }

    .checkbox-icon {
      color: #D4AF37;
    }

    .full-width {
      grid-column: 1 / -1;
    }

    .file-upload-area {
      margin-top: 0.5rem;
    }

    .file-upload-area input[type="file"] {
      display: none;
    }

    .file-upload-label {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.75rem;
      padding: 2rem;
      border: 2px dashed #D4AF37;
      border-radius: 12px;
      background: #fefce8;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .file-upload-label:hover {
      background: #fef9c3;
      border-color: #ca8a04;
    }

    .upload-icon {
      font-size: 2rem;
    }

    .photo-preview {
      margin-top: 1rem;
      position: relative;
      width: 150px;
      height: 150px;
      border-radius: 50%;
      overflow: hidden;
      border: 3px solid #D4AF37;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    }

    .photo-preview img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .file-preview {
      margin-top: 1rem;
      padding: 1rem;
      background: #f0fdf4;
      border: 2px solid #22c55e;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .file-name {
      color: #16a34a;
      font-weight: 600;
      font-size: 0.875rem;
    }

    .btn-remove-photo {
      position: absolute;
      top: 5px;
      right: 5px;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #ef4444;
      color: white;
      border: none;
      cursor: pointer;
      font-size: 1.2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
    }

    .file-preview .btn-remove-photo {
      position: relative;
      top: 0;
      right: 0;
    }

    .btn-remove-photo:hover {
      background: #dc2626;
      transform: scale(1.1);
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      padding-top: 1.5rem;
      border-top: 2px solid #f3f4f6;
    }

    .btn-cancel {
      padding: 0.875rem 2rem;
      background: #f3f4f6;
      color: #374151;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-cancel:hover {
      background: #e5e7eb;
    }

    .btn-save {
      padding: 0.875rem 2rem;
      background: linear-gradient(135deg, #000000 0%, #D4AF37 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-save:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    /* Drivers Grid */
    .drivers-content {
      margin-top: 2rem;
    }

    .loading-state {
      text-align: center;
      padding: 4rem 2rem;
      background: white;
      border-radius: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .spinner {
      width: 50px;
      height: 50px;
      margin: 0 auto 1rem;
      border: 4px solid #f3f4f6;
      border-top-color: #D4AF37;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .drivers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 1.5rem;
    }

    .driver-card {
      background: white;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
    }

    .driver-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
    }

    .driver-header {
      background: linear-gradient(135deg, #000000 0%, #2d2d2d 100%);
      padding: 2rem;
      text-align: center;
      position: relative;
    }

    .driver-avatar {
      width: 100px;
      height: 100px;
      margin: 0 auto 1rem;
      border-radius: 50%;
      overflow: hidden;
      border: 4px solid #D4AF37;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .driver-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .avatar-placeholder {
      font-size: 2rem;
      font-weight: 700;
      color: #D4AF37;
    }

    .status-badges {
      display: flex;
      gap: 0.5rem;
      justify-content: center;
      flex-wrap: wrap;
    }

    .status-badge {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .status-badge.active {
      background: #10b981;
      color: white;
    }

    .status-badge.inactive {
      background: #6b7280;
      color: white;
    }

    .availability-badge {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 600;
    }

    .availability-badge.available {
      background: #22c55e;
      color: white;
    }

    .availability-badge.unavailable {
      background: #ef4444;
      color: white;
    }

    .driver-details {
      padding: 1.5rem;
    }

    .driver-details h3 {
      margin: 0 0 1rem 0;
      color: #000000;
      font-size: 1.5rem;
      font-weight: 700;
    }

    .driver-info {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.5rem;
      background: #f9fafb;
      border-radius: 8px;
    }

    .info-icon {
      font-size: 1.25rem;
    }

    .info-text {
      flex: 1;
      color: #374151;
      font-size: 0.875rem;
    }

    .assigned-vehicle {
      color: #D4AF37;
      font-weight: 600;
    }

    .pdp-badge {
      color: #16a34a;
      font-weight: 600;
    }

    .driver-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .btn-activate,
    .btn-edit,
    .btn-delete {
      flex: 1;
      min-width: 100px;
      padding: 0.75rem;
      border: none;
      border-radius: 12px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
    }

    .btn-activate {
      background: linear-gradient(135deg, #22c55e 0%, #4ade80 100%);
      color: white;
    }

    .btn-activate:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(34, 197, 94, 0.3);
    }

    .btn-edit {
      background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
      color: white;
    }

    .btn-edit:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
    }

    .btn-delete {
      background: linear-gradient(135deg, #ef4444 0%, #f87171 100%);
      color: white;
    }

    .btn-delete:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }

    /* Empty State */
    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: white;
      border-radius: 20px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .empty-icon {
      font-size: 5rem;
      margin-bottom: 1rem;
      opacity: 0.5;
    }

    .empty-state h3 {
      color: #000000;
      font-size: 1.5rem;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      color: #6b7280;
      margin-bottom: 2rem;
    }

    .btn-add-first {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 1rem 2rem;
      background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%);
      color: #000000;
      border: none;
      border-radius: 50px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);
      transition: all 0.3s ease;
    }

    .btn-add-first:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(212, 175, 55, 0.4);
    }

    /* Responsive */
    @media (max-width: 768px) {
      .drivers-container {
        padding: 1rem;
      }

      .title-section h1 {
        font-size: 2rem;
      }

      .stats-grid {
        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      }

      .drivers-grid {
        grid-template-columns: 1fr;
      }

      .form-card {
        padding: 1.5rem;
      }

      .form-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DriversComponent implements OnInit {
  drivers: DriverProfile[] = [];
  currentDriver: Partial<DriverProfile> = this.getEmptyDriver();
  editingDriver = false;
  showForm = false;
  loading = false;
  error = '';

  constructor(
    private identityService: IdentityService,
    private http: HttpClient
  ) {}

  ngOnInit() {
    this.loadDrivers();
  }

  loadDrivers() {
    this.loading = true;
    this.error = '';
    this.identityService.getAllDriverProfiles().subscribe({
      next: (data) => {
        // Map data to handle PascalCase/camelCase
        this.drivers = data.map(d => ({
          ...d,
          id: d.id || (d as any).Id,
          userId: d.userId || (d as any).UserId,
          name: d.name || (d as any).Name,
          idNumber: d.idNumber || (d as any).IdNumber,
          phone: d.phone || (d as any).Phone,
          email: d.email || (d as any).Email,
          photoUrl: d.photoUrl || (d as any).PhotoUrl,
          licenseCopy: d.licenseCopy || (d as any).LicenseCopy,
          experience: d.experience || (d as any).Experience,
          category: d.category || (d as any).Category,
          hasPdp: d.hasPdp !== undefined ? d.hasPdp : (d as any).HasPdp,
          pdpCopy: d.pdpCopy || (d as any).PdpCopy,
          isActive: d.isActive !== undefined ? d.isActive : (d as any).IsActive,
          isAvailable: d.isAvailable !== undefined ? d.isAvailable : (d as any).IsAvailable,
          assignedVehicleId: d.assignedVehicleId || (d as any).AssignedVehicleId
        }));
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load drivers: ' + (err?.message || JSON.stringify(err));
        this.loading = false;
      }
    });
  }

  saveDriver() {
    if (this.editingDriver && this.currentDriver.id) {
      this.identityService.updateDriverProfile(this.currentDriver.id, this.currentDriver as DriverProfile).subscribe({
        next: () => {
          this.loadDrivers();
          this.cancelEdit();
        },
        error: (err) => this.error = 'Failed to update driver: ' + (err?.message || JSON.stringify(err))
      });
    } else {
      // Get tenant ID from logged-in user
      let tenantId = '00000000-0000-0000-0000-000000000000';
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          const userInfo = JSON.parse(userStr);
          tenantId = userInfo.tenantId || tenantId;
        } catch (e) {
          console.error('Failed to parse user info:', e);
        }
      }

      // First create a user account for the driver
      const newUser = {
        email: this.currentDriver.email || `driver${Date.now()}@mzansifleet.com`,
        phone: this.currentDriver.phone || '',
        password: 'Driver@123', // Default password - driver should change on first login
        role: 'Driver',
        tenantId: tenantId,
        isActive: true
      };

      this.identityService.createUser(newUser).subscribe({
        next: (user) => {
          // Now create the driver profile with the user ID
          const driverProfile = {
            ...this.currentDriver,
            userId: user.id
          };

          this.identityService.createDriverProfile(driverProfile).subscribe({
            next: () => {
              this.loadDrivers();
              this.cancelEdit();
            },
            error: (err) => this.error = 'Failed to create driver profile: ' + (err?.message || JSON.stringify(err))
          });
        },
        error: (err) => this.error = 'Failed to create driver user account: ' + (err?.message || JSON.stringify(err))
      });
    }
  }

  editDriver(driver: DriverProfile) {
    this.currentDriver = { ...driver };
    this.editingDriver = true;
    this.showForm = true;
  }

  activateDriver(driver: DriverProfile) {
    if (confirm(`Activate ${driver.name}? This will allow them to login and access the system.`)) {
      const updatedDriver = { ...driver, isActive: true };
      this.identityService.updateDriverProfile(driver.id, updatedDriver).subscribe({
        next: () => {
          // Also activate the user account
          this.identityService.getDriverProfileById(driver.id).subscribe({
            next: (profile: any) => {
              if (profile.userId) {
                // Update user to active
                const userUpdate = { isActive: true };
                this.http.put(`http://localhost:5000/api/Identity/users/${profile.userId}/activate`, userUpdate).subscribe({
                  next: () => {
                    this.loadDrivers();
                    alert(`${driver.name} has been activated successfully!`);
                  },
                  error: (err) => console.error('Failed to activate user account:', err)
                });
              } else {
                this.loadDrivers();
              }
            },
            error: (err) => console.error('Failed to fetch driver profile:', err)
          });
        },
        error: (err) => {
          this.error = 'Failed to activate driver: ' + (err?.message || JSON.stringify(err));
        }
      });
    }
  }

  deleteDriver(id: string) {
    if (confirm('Are you sure you want to delete this driver?')) {
      this.identityService.deleteDriverProfile(id).subscribe({
        next: () => this.loadDrivers(),
        error: (err) => this.error = 'Failed to delete driver: ' + (err?.message || JSON.stringify(err))
      });
    }
  }

  cancelEdit() {
    this.currentDriver = this.getEmptyDriver();
    this.editingDriver = false;
    this.showForm = false;
  }

  toggleForm() {
    if (this.showForm) {
      this.cancelEdit();
    } else {
      this.showForm = true;
    }
  }

  getInitials(name: string): string {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }

  getActiveDrivers(): DriverProfile[] {
    return this.drivers.filter(d => d.isActive);
  }

  getAvailableDrivers(): DriverProfile[] {
    return this.drivers.filter(d => d.isAvailable && d.isActive);
  }

  getAssignedDrivers(): DriverProfile[] {
    return this.drivers.filter(d => d.assignedVehicleId);
  }

  onPhotoSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.currentDriver.photoUrl = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removePhoto(): void {
    this.currentDriver.photoUrl = '';
  }

  onLicenseSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.currentDriver.licenseCopy = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removeLicense(): void {
    this.currentDriver.licenseCopy = '';
  }

  onPdpSelected(event: any): void {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.currentDriver.pdpCopy = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  removePdp(): void {
    this.currentDriver.pdpCopy = '';
  }

  private getEmptyDriver(): Partial<DriverProfile> {
    return {
      userId: '00000000-0000-0000-0000-000000000000',
      name: '',
      idNumber: '',
      phone: '',
      email: '',
      photoUrl: '',
      licenseCopy: '',
      experience: '',
      category: '',
      hasPdp: false,
      pdpCopy: '',
      isActive: true,
      isAvailable: true
    };
  }
}
