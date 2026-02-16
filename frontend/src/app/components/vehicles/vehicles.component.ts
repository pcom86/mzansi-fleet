import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { VehicleService } from '../../services';
import { IdentityService } from '../../services/identity.service';
import { Vehicle, CreateVehicleCommand, UpdateVehicleCommand } from '../../models';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-vehicles',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="vehicles-container">
      <!-- Header Section -->
      <div class="header-section">
        <div class="header-content">
          <div class="title-section">
            <h1>Fleet Vehicles</h1>
            <p class="subtitle">Manage your entire vehicle fleet</p>
          </div>
          <button class="btn-add" (click)="toggleForm()">
            <span class="btn-icon">{{ showForm ? '✕' : '+' }}</span>
            <span>{{ showForm ? 'Cancel' : 'Add Vehicle' }}</span>
          </button>
        </div>
        
        <!-- Stats Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-icon available">🚗</div>
            <div class="stat-details">
              <div class="stat-value">{{ getVehiclesByStatus('Available').length }}</div>
              <div class="stat-label">Available</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon in-use">🔑</div>
            <div class="stat-details">
              <div class="stat-value">{{ getVehiclesByStatus('In Use').length }}</div>
              <div class="stat-label">In Use</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon maintenance">🔧</div>
            <div class="stat-details">
              <div class="stat-value">{{ getVehiclesByStatus('Maintenance').length }}</div>
              <div class="stat-label">Maintenance</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon total">📊</div>
            <div class="stat-details">
              <div class="stat-value">{{ vehicles.length }}</div>
              <div class="stat-label">Total Fleet</div>
            </div>
          </div>
        </div>
      </div>

      <!-- Add/Edit Form -->
      <div class="form-modal" *ngIf="showForm">
        <div class="form-card">
          <h2>{{ editingVehicle ? 'Edit Vehicle' : 'Add New Vehicle' }}</h2>
          
          <div class="error-banner" *ngIf="error">
            <span class="error-icon">⚠️</span>
            {{ error }}
          </div>
          
          <form (ngSubmit)="saveVehicle()">
            <div class="form-grid">
              <div class="form-group">
                <label>Make *</label>
                <input type="text" [(ngModel)]="currentVehicle.make" name="make" required placeholder="e.g., Toyota">
              </div>
              
              <div class="form-group">
                <label>Model *</label>
                <input type="text" [(ngModel)]="currentVehicle.model" name="model" required placeholder="e.g., Corolla">
              </div>
              
              <div class="form-group">
                <label>Registration Number</label>
                <input type="text" [(ngModel)]="currentVehicle.registration" name="registration" placeholder="e.g., ABC-123-GP">
              </div>
              
              <div class="form-group">
                <label>Year *</label>
                <input type="number" [(ngModel)]="currentVehicle.year" name="year" required placeholder="2024">
              </div>
              
              <div class="form-group">
                <label>VIN</label>
                <input type="text" [(ngModel)]="currentVehicle.vin" name="vin" placeholder="Vehicle Identification Number">
              </div>
              
              <div class="form-group">
                <label>Engine Number</label>
                <input type="text" [(ngModel)]="currentVehicle.engineNumber" name="engineNumber" placeholder="Engine Number">
              </div>
              
              <div class="form-group">
                <label>Mileage (km)</label>
                <input type="number" [(ngModel)]="currentVehicle.mileage" name="mileage" placeholder="Current mileage">
              </div>
              
              <div class="form-group">
                <label>Odometer (km)</label>
                <input type="number" [(ngModel)]="currentVehicle.odometer" name="odometer" placeholder="Odometer reading">
              </div>
              
              <div class="form-group">
                <label>Service Interval (km)</label>
                <input type="number" [(ngModel)]="currentVehicle.serviceIntervalKm" name="serviceIntervalKm" placeholder="10000">
              </div>
              
              <div class="form-group">
                <label>Capacity</label>
                <input type="number" [(ngModel)]="currentVehicle.capacity" name="capacity" placeholder="4">
              </div>
              
              <div class="form-group">
                <label>Type</label>
                <input type="text" [(ngModel)]="currentVehicle.type" name="type" placeholder="e.g., Sedan, SUV">
              </div>
              
              <div class="form-group">
                <label>Base Location</label>
                <input type="text" [(ngModel)]="currentVehicle.baseLocation" name="baseLocation" placeholder="e.g., Johannesburg">
              </div>
              
              <div class="form-group">
                <label>Last Service Date</label>
                <input type="date" [(ngModel)]="currentVehicle.lastServiceDate" name="lastServiceDate">
              </div>
              
              <div class="form-group">
                <label>Next Service Date</label>
                <input type="date" [(ngModel)]="currentVehicle.nextServiceDate" name="nextServiceDate">
              </div>
              
              <div class="form-group">
                <label>Last Maintenance Date</label>
                <input type="date" [(ngModel)]="currentVehicle.lastMaintenanceDate" name="lastMaintenanceDate">
              </div>
              
              <div class="form-group">
                <label>Next Maintenance Date</label>
                <input type="date" [(ngModel)]="currentVehicle.nextMaintenanceDate" name="nextMaintenanceDate">
              </div>
              
              <div class="form-group">
                <label>Status</label>
                <select [(ngModel)]="currentVehicle.status" name="status">
                  <option value="Available">Available</option>
                  <option value="In Use">In Use</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Out of Service">Out of Service</option>
                </select>
              </div>
            </div>
            
            <div class="form-group full-width">
              <label>Vehicle Photos</label>
              <div class="file-upload-area">
                <input type="file" (change)="onFileSelected($event)" accept="image/*" multiple #fileInput id="fileInput">
                <label for="fileInput" class="file-upload-label">
                  <span class="upload-icon">📷</span>
                  <span>Click to upload vehicle photos (multiple)</span>
                </label>
                <div class="photos-grid" *ngIf="getAllVehiclePhotos().length > 0">
                  <div class="photo-item" *ngFor="let photo of getAllVehiclePhotos(); let i = index">
                    <img [src]="photo" alt="Vehicle photo {{ i + 1 }}">
                    <button type="button" class="btn-remove-photo" (click)="removePhoto(i)">✕</button>
                    <div class="photo-label" *ngIf="i === 0">Main</div>
                  </div>
                </div>
              </div>
            </div>
            
            <div class="form-actions">
              <button type="button" class="btn-cancel" (click)="cancelEdit()">Cancel</button>
              <button type="submit" class="btn-save">
                <span>{{ editingVehicle ? 'Update' : 'Save' }} Vehicle</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- Vehicles Grid -->
      <div class="vehicles-content">
        <div class="loading-state" *ngIf="loading">
          <div class="spinner"></div>
          <p>Loading vehicles...</p>
        </div>
        
        <div class="vehicles-grid" *ngIf="!loading && vehicles.length > 0">
          <div class="vehicle-card" *ngFor="let vehicle of vehicles">
            <div class="vehicle-image">
              <img [src]="vehicle.photoBase64 || 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 200 150%22%3E%3Crect fill=%22%23ddd%22 width=%22200%22 height=%22150%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 dominant-baseline=%22middle%22 text-anchor=%22middle%22 fill=%22%23999%22 font-size=%2218%22%3ENo Image%3C/text%3E%3C/svg%3E'" 
                   alt="{{ vehicle.make }} {{ vehicle.model }}">
              <div class="status-badge" [class]="'status-' + (vehicle.status || 'available').toLowerCase().replace(' ', '-')">
                {{ vehicle.status || 'Available' }}
              </div>
            </div>
            <div class="vehicle-details">
              <h3>{{ vehicle.make }} {{ vehicle.model }}</h3>
              <div class="vehicle-info">
                <div class="info-row">
                  <span class="info-icon">🔖</span>
                  <span class="info-text">{{ vehicle.registration || 'N/A' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-icon">📅</span>
                  <span class="info-text">{{ vehicle.year }}</span>
                </div>
                <div class="info-row">
                  <span class="info-icon">�️</span>
                  <span class="info-text">{{ vehicle.mileage ? (vehicle.mileage | number) + ' km' : 'N/A' }}</span>
                </div>
                <div class="info-row">
                  <span class="info-icon">�</span>
                  <span class="info-text">{{ driverAssignments[vehicle.id] || 'Loading...' }}</span>
                </div>
                <div class="info-row" *ngIf="vehicle.type">
                  <span class="info-icon">🚙</span>
                  <span class="info-text">{{ vehicle.type }}</span>
                </div>
                <div class="info-row" *ngIf="vehicle.lastServiceDate">
                  <span class="info-icon">🔧</span>
                  <span class="info-text">Service: {{ vehicle.lastServiceDate | date:'shortDate' }}</span>
                </div>
                <div class="info-row" *ngIf="vehicle.lastMaintenanceDate">
                  <span class="info-icon">⚙️</span>
                  <span class="info-text">Maintenance: {{ vehicle.lastMaintenanceDate | date:'shortDate' }}</span>
                </div>
              </div>
              <div class="vehicle-actions">
                <button class="btn-view" (click)="viewVehicleDetails(vehicle.id)">
                  <span>👁️</span> View Details
                </button>
                <button class="btn-edit" (click)="editVehicle(vehicle)">
                  <span>✏️</span> Edit
                </button>
                <button class="btn-delete" (click)="deleteVehicle(vehicle.id)">
                  <span>🗑️</span> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div *ngIf="!loading && vehicles.length === 0" class="empty-state">
          <div class="empty-icon">🚗</div>
          <h3>No vehicles yet</h3>
          <p>Add your first vehicle to get started</p>
          <button class="btn-add-first" (click)="showForm = true">
            <span>+</span> Add Vehicle
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .vehicles-container {
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

    .stat-icon.available {
      background: linear-gradient(135deg, #10b981 0%, #34d399 100%);
    }

    .stat-icon.in-use {
      background: linear-gradient(135deg, #3b82f6 0%, #60a5fa 100%);
    }

    .stat-icon.maintenance {
      background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%);
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

    /* Error Banner */
    .error-banner {
      background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
      color: #991b1b;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      margin-bottom: 2rem;
      display: flex;
      align-items: center;
      gap: 0.75rem;
      box-shadow: 0 2px 8px rgba(220, 38, 38, 0.1);
    }

    .error-icon {
      font-size: 1.5rem;
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
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
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

    .form-card h2 {
      font-size: 1.75rem;
      font-weight: 700;
      color: #000000;
      margin: 0 0 2rem 0;
    }

    .form-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
      margin-bottom: 1.5rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
    }

    .form-group.full-width {
      grid-column: 1 / -1;
    }

    .form-group label {
      font-weight: 600;
      color: #000000;
      margin-bottom: 0.5rem;
      font-size: 0.875rem;
    }

    .form-group input,
    .form-group select {
      padding: 0.75rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 1rem;
      transition: all 0.3s ease;
    }

    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #D4AF37;
      box-shadow: 0 0 0 3px rgba(212, 175, 55, 0.1);
    }

    .file-upload-area {
      position: relative;
    }

    .file-upload-area input[type="file"] {
      display: none;
    }

    .file-upload-label {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5rem;
      padding: 2rem;
      border: 2px dashed #D4AF37;
      border-radius: 12px;
      background: #fffbf0;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .file-upload-label:hover {
      background: #fff8e1;
      border-color: #FFD700;
    }

    .upload-icon {
      font-size: 2.5rem;
    }

    .photos-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 1rem;
      margin-top: 1rem;
    }

    .photo-item {
      position: relative;
      border-radius: 12px;
      overflow: hidden;
      aspect-ratio: 4/3;
      border: 2px solid transparent;
      transition: all 0.3s ease;
    }

    .photo-item:hover {
      border-color: #FFD700;
      transform: scale(1.05);
    }

    .photo-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .btn-remove-photo {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      width: 30px;
      height: 30px;
      border-radius: 50%;
      background: #ef4444;
      color: white;
      border: none;
      cursor: pointer;
      font-size: 1rem;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(239, 68, 68, 0.5);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .photo-item:hover .btn-remove-photo {
      opacity: 1;
    }

    .photo-label {
      position: absolute;
      bottom: 0.5rem;
      left: 0.5rem;
      background: rgba(0, 0, 0, 0.7);
      color: #FFD700;
      padding: 0.25rem 0.75rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .form-actions {
      display: flex;
      gap: 1rem;
      justify-content: flex-end;
      margin-top: 2rem;
    }

    .btn-cancel, .btn-save {
      padding: 0.75rem 2rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
      border: none;
    }

    .btn-cancel {
      background: #f3f4f6;
      color: #374151;
    }

    .btn-cancel:hover {
      background: #e5e7eb;
    }

    .btn-save {
      background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%);
      color: #000000;
      box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
    }

    .btn-save:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(212, 175, 55, 0.4);
    }

    /* Vehicles Grid */
    .vehicles-content {
      background: transparent;
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
      border: 4px solid #f3f4f6;
      border-top: 4px solid #D4AF37;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .vehicles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 2rem;
    }

    .vehicle-card {
      background: white;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
    }

    .vehicle-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 12px 24px rgba(0, 0, 0, 0.15);
    }

    .vehicle-image {
      position: relative;
      width: 100%;
      height: 200px;
      overflow: hidden;
    }

    .vehicle-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .status-badge {
      position: absolute;
      top: 1rem;
      right: 1rem;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      backdrop-filter: blur(10px);
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    }

    .status-available {
      background: rgba(16, 185, 129, 0.9);
      color: white;
    }

    .status-in-use {
      background: rgba(59, 130, 246, 0.9);
      color: white;
    }

    .status-maintenance {
      background: rgba(245, 158, 11, 0.9);
      color: white;
    }

    .status-out-of-service {
      background: rgba(239, 68, 68, 0.9);
      color: white;
    }

    .vehicle-details {
      padding: 1.5rem;
    }

    .vehicle-details h3 {
      font-size: 1.25rem;
      font-weight: 700;
      color: #000000;
      margin: 0 0 1rem 0;
    }

    .vehicle-info {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      margin-bottom: 1.5rem;
    }

    .info-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      color: #4b5563;
      font-size: 0.875rem;
    }

    .info-icon {
      font-size: 1.25rem;
    }

    .vehicle-actions {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .btn-view, .btn-edit, .btn-delete {
      flex: 1;
      padding: 0.75rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.875rem;
      cursor: pointer;
      border: none;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      transition: all 0.3s ease;
      min-width: 120px;
    }

    .btn-view {
      background: linear-gradient(135deg, #D4AF37 0%, #FFD700 100%);
      color: #000000;
      flex-basis: 100%;
    }

    .btn-view:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
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
      font-size: 1.5rem;
      font-weight: 700;
      color: #000000;
      margin: 0 0 0.5rem 0;
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
      .vehicles-container {
        padding: 1rem;
      }

      .header-content {
        flex-direction: column;
        gap: 1rem;
        align-items: flex-start;
      }

      .title-section h1 {
        font-size: 2rem;
      }

      .stats-grid {
        grid-template-columns: repeat(2, 1fr);
      }

      .form-grid {
        grid-template-columns: 1fr;
      }

      .vehicles-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class VehiclesComponent implements OnInit {
  vehicles: Vehicle[] = [];
  currentVehicle: Partial<Vehicle> = this.getEmptyVehicle();
  editingVehicle = false;
  showForm = false;
  loading = false;
  error = '';
  driverAssignments: { [vehicleId: string]: string } = {}; // vehicleId -> driverName

  constructor(
    private vehicleService: VehicleService,
    private identityService: IdentityService,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadVehicles();
  }

  loadVehicles() {
    // Get tenant ID from logged-in user for owner filtering
    const userInfoStr = localStorage.getItem('user');
    let tenantId = '';

    if (userInfoStr) {
      try {
        const userInfo = JSON.parse(userInfoStr);
        tenantId = userInfo.tenantId || '';
      } catch (error) {
        console.error('Error parsing user info:', error);
      }
    }

    // If user is an owner, filter vehicles by tenantId
    if (tenantId) {
      this.vehicleService.getByTenantId(tenantId).subscribe({
        next: (vehicles) => {
          this.vehicles = vehicles;
          this.loadDriverAssignments(); // Load driver assignments after vehicles are loaded
        },
        error: (err) => {
          console.error('Error loading vehicles:', err);
          this.error = 'Failed to load vehicles: ' + err.message;
        }
      });
    } else {
      // For admin users, load all vehicles
      this.vehicleService.getAll().subscribe({
        next: (vehicles) => {
          this.vehicles = vehicles;
          this.loadDriverAssignments(); // Load driver assignments after vehicles are loaded
        },
        error: (err) => {
          console.error('Error loading vehicles:', err);
          this.error = 'Failed to load vehicles: ' + err.message;
        }
      });
    }
  }

  onFileSelected(event: any): void {
    const files: FileList = event.target.files;
    if (files && files.length > 0) {
      // Process all selected files
      Array.from(files).forEach(file => {
        const reader = new FileReader();
        reader.onload = (e: any) => {
          const base64 = e.target.result;
          if (!this.currentVehicle.photos) {
            this.currentVehicle.photos = [];
          }
          // If no main photo, set it as main, otherwise add to gallery
          if (!this.currentVehicle.photoBase64) {
            this.currentVehicle.photoBase64 = base64;
          } else {
            this.currentVehicle.photos.push(base64);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  }

  removePhoto(index: number): void {
    const allPhotos = this.getAllVehiclePhotos();
    if (index === 0) {
      // Removing main photo
      this.currentVehicle.photoBase64 = undefined;
      // Promote first gallery photo to main if available
      if (this.currentVehicle.photos && this.currentVehicle.photos.length > 0) {
        this.currentVehicle.photoBase64 = this.currentVehicle.photos[0];
        this.currentVehicle.photos = this.currentVehicle.photos.slice(1);
      }
    } else {
      // Removing from gallery
      if (this.currentVehicle.photos) {
        this.currentVehicle.photos.splice(index - 1, 1);
      }
    }
  }

  getAllVehiclePhotos(): string[] {
    const photos: string[] = [];
    if (this.currentVehicle.photoBase64) {
      photos.push(this.currentVehicle.photoBase64);
    }
    if (this.currentVehicle.photos && this.currentVehicle.photos.length > 0) {
      photos.push(...this.currentVehicle.photos);
    }
    return photos;
  }

  loadDriverAssignments() {
    if (this.vehicles.length === 0) return;

    // Get vehicle IDs
    const vehicleIds = this.vehicles.map(v => v.id).join(',');
    
    // Get recent trips for these vehicles to determine current driver assignments
    this.http.get<any[]>(`${environment.apiUrl}/TripDetails?vehicleIds=${vehicleIds}`).subscribe({
      next: (trips) => {
        // Group trips by vehicle and get the most recent one with a driver
        const vehicleTrips = new Map<string, any[]>();
        
        trips.forEach(trip => {
          if (!vehicleTrips.has(trip.vehicleId)) {
            vehicleTrips.set(trip.vehicleId, []);
          }
          vehicleTrips.get(trip.vehicleId)!.push(trip);
        });

        // For each vehicle, find the most recent trip with a driver
        vehicleTrips.forEach((trips, vehicleId) => {
          const recentTrip = trips
            .filter(t => t.driverId)
            .sort((a, b) => new Date(b.tripDate).getTime() - new Date(a.tripDate).getTime())[0];
          
          if (recentTrip) {
            // Get driver name from the trip (assuming it's included) or fetch it
            this.getDriverName(recentTrip.driverId, vehicleId);
          } else {
            this.driverAssignments[vehicleId] = 'Unassigned';
          }
        });

        // Mark unassigned vehicles
        this.vehicles.forEach(vehicle => {
          if (!this.driverAssignments[vehicle.id]) {
            this.driverAssignments[vehicle.id] = 'Unassigned';
          }
        });
      },
      error: (error) => {
        console.error('Error loading driver assignments:', error);
        // Mark all vehicles as unassigned if we can't load assignments
        this.vehicles.forEach(vehicle => {
          this.driverAssignments[vehicle.id] = 'Unassigned';
        });
      }
    });
  }

  getDriverName(driverId: string, vehicleId: string) {
    // Try to get driver name from Identity API using the driver profile service
    this.identityService.getDriverProfileById(driverId).subscribe({
      next: (profile) => {
        const driverName = profile.name || profile.email || 'Unknown Driver';
        this.driverAssignments[vehicleId] = driverName;
      },
      error: (error) => {
        console.error('Error getting driver profile:', error);
        this.driverAssignments[vehicleId] = 'Unknown Driver';
      }
    });
  }

  async saveVehicle() {
    // Get tenant ID from logged-in user
    const userInfoStr = localStorage.getItem('user');
    let tenantId = '00000000-0000-0000-0000-000000000000';
    
    if (userInfoStr) {
      try {
        const userInfo = JSON.parse(userInfoStr);
        tenantId = userInfo.tenantId || tenantId;
      } catch (error) {
        console.error('Error parsing user info:', error);
      }
    }

    this.performSave(tenantId);
  }

  private performSave(tenantId: string) {
    if (this.editingVehicle && this.currentVehicle.id) {
      // Update existing vehicle with full entity
      const vehicle: any = {
        id: this.currentVehicle.id,
        tenantId: this.currentVehicle.tenantId || tenantId,
        registration: this.currentVehicle.registration || '',
        make: this.currentVehicle.make || '',
        model: this.currentVehicle.model || '',
        year: this.currentVehicle.year || new Date().getFullYear(),
        vin: this.currentVehicle.vin || '',
        engineNumber: this.currentVehicle.engineNumber || '',
        odometer: this.currentVehicle.odometer || 0,
        mileage: this.currentVehicle.mileage || 0,
        serviceIntervalKm: this.currentVehicle.serviceIntervalKm || 10000,
        capacity: this.currentVehicle.capacity || 4,
        type: this.currentVehicle.type || '',
        baseLocation: this.currentVehicle.baseLocation || '',
        status: this.currentVehicle.status || 'Available',
        photoBase64: this.currentVehicle.photoBase64 || '',
        photos: this.currentVehicle.photos || []
      };
      
      // Add date fields - convert to ISO string if they exist
      vehicle.lastServiceDate = this.formatDateForBackend(this.currentVehicle.lastServiceDate);
      vehicle.nextServiceDate = this.formatDateForBackend(this.currentVehicle.nextServiceDate);
      vehicle.lastMaintenanceDate = this.formatDateForBackend(this.currentVehicle.lastMaintenanceDate);
      vehicle.nextMaintenanceDate = this.formatDateForBackend(this.currentVehicle.nextMaintenanceDate);
      
      this.vehicleService.update(this.currentVehicle.id, vehicle).subscribe({
        next: () => {
          this.loadVehicles();
          this.cancelEdit();
        },
        error: (err) => this.error = 'Failed to update vehicle: ' + err.message
      });
    } else {
      // Create a proper Vehicle entity
      const vehicle = {
        id: '00000000-0000-0000-0000-000000000000', // Backend will generate
        tenantId: tenantId,
        registration: this.currentVehicle.registration || '',
        make: this.currentVehicle.make || '',
        model: this.currentVehicle.model || '',
        year: this.currentVehicle.year || new Date().getFullYear(),
        vin: this.currentVehicle.vin || '',
        engineNumber: this.currentVehicle.engineNumber || '',
        odometer: this.currentVehicle.odometer || 0,
        mileage: this.currentVehicle.mileage || 0,
        lastServiceDate: this.formatDateForBackend(this.currentVehicle.lastServiceDate),
        nextServiceDate: this.formatDateForBackend(this.currentVehicle.nextServiceDate),
        lastMaintenanceDate: this.formatDateForBackend(this.currentVehicle.lastMaintenanceDate),
        nextMaintenanceDate: this.formatDateForBackend(this.currentVehicle.nextMaintenanceDate),
        serviceIntervalKm: this.currentVehicle.serviceIntervalKm || 10000,
        capacity: this.currentVehicle.capacity || 4,
        type: this.currentVehicle.type || '',
        baseLocation: this.currentVehicle.baseLocation || '',
        status: this.currentVehicle.status || 'Available',
        photoBase64: this.currentVehicle.photoBase64 || '',
        photos: this.currentVehicle.photos || []
      };
      
      this.vehicleService.create(vehicle).subscribe({
        next: () => {
          this.loadVehicles();
          this.cancelEdit();
        },
        error: (err) => this.error = 'Failed to create vehicle: ' + err.message
      });
    }
  }
  
  private formatDateForBackend(date: any): string | null {
    if (!date) return null;
    
    // If it's already a valid date string or Date object, convert to ISO
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    
    // Return ISO string for backend
    return d.toISOString();
  }

  toggleForm() {
    if (this.showForm) {
      this.cancelEdit();
    } else {
      this.showForm = true;
      this.error = '';
    }
  }

  viewVehicleDetails(vehicleId: string) {
    // Check if user is an owner to determine the correct route
    const userStr = localStorage.getItem('user');
    let isOwner = false;
    
    if (userStr) {
      try {
        const userInfo = JSON.parse(userStr);
        isOwner = userInfo.role === 'Owner';
      } catch (e) {
        // Ignore parsing errors
      }
    }
    
    if (isOwner) {
      this.router.navigate(['/owner-dashboard/vehicles', vehicleId]);
    } else {
      this.router.navigate(['/vehicles', vehicleId]);
    }
  }

  editVehicle(vehicle: Vehicle) {
    this.currentVehicle = { ...vehicle };
    
    // Convert date strings to YYYY-MM-DD format for date inputs
    if (this.currentVehicle.lastServiceDate) {
      this.currentVehicle.lastServiceDate = this.formatDateForInput(this.currentVehicle.lastServiceDate);
    }
    if (this.currentVehicle.nextServiceDate) {
      this.currentVehicle.nextServiceDate = this.formatDateForInput(this.currentVehicle.nextServiceDate);
    }
    if (this.currentVehicle.lastMaintenanceDate) {
      this.currentVehicle.lastMaintenanceDate = this.formatDateForInput(this.currentVehicle.lastMaintenanceDate);
    }
    if (this.currentVehicle.nextMaintenanceDate) {
      this.currentVehicle.nextMaintenanceDate = this.formatDateForInput(this.currentVehicle.nextMaintenanceDate);
    }
    
    this.editingVehicle = true;
    this.showForm = true;
    this.error = '';
  }
  
  private formatDateForInput(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  deleteVehicle(id: string) {
    if (confirm('Are you sure you want to delete this vehicle?')) {
      this.vehicleService.delete(id).subscribe({
        next: () => this.loadVehicles(),
        error: (err) => this.error = 'Failed to delete vehicle: ' + err.message
      });
    }
  }

  cancelEdit() {
    this.currentVehicle = this.getEmptyVehicle();
    this.editingVehicle = false;
    this.showForm = false;
    this.error = '';
  }

  private getEmptyVehicle(): Partial<Vehicle> {
    return {
      tenantId: '00000000-0000-0000-0000-000000000000',
      make: '',
      model: '',
      registration: '',
      year: new Date().getFullYear(),
      capacity: 4,
      type: '',
      status: 'Available',
      photoBase64: ''
    };
  }

  getVehiclesByStatus(status: string): Vehicle[] {
    return this.vehicles.filter(v => v.status === status);
  }
}