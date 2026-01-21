import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { VehicleService, VehicleMaintenanceService, IdentityService } from '../../../services';
import { VehicleFinancialsService } from '../../../services/vehicle-financials.service';
import { VehicleDocumentsService } from '../../../services/vehicle-documents.service';
import { Vehicle, VehicleServiceAlert, VehicleEarnings, VehicleExpense, CreateVehicleEarnings, CreateVehicleExpense, VehicleProfitabilityReport, DriverProfile } from '../../../models';
import { VehicleDocument, CreateVehicleDocumentCommand } from '../../../models/vehicle-documents.model';
import { VehicleServiceHistoryComponent } from '../vehicle-service-history/vehicle-service-history.component';
import { VehicleMaintenanceHistoryComponent } from '../vehicle-maintenance-history/vehicle-maintenance-history.component';

@Component({
  selector: 'app-vehicle-details',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    VehicleServiceHistoryComponent, 
    VehicleMaintenanceHistoryComponent
  ],
  template: `
    <div class="vehicle-details-container">
      <div class="loading" *ngIf="loading">Loading vehicle details...</div>
      <div class="error" *ngIf="error">{{ error }}</div>

      <div *ngIf="vehicle && !loading" class="vehicle-details">
        <!-- Header with Back Button -->
        <div class="header">
          <button class="btn-back" (click)="goBack()">
            ← Back to Fleet
          </button>
          <h1>{{ vehicle.make }} {{ vehicle.model }}</h1>
        </div>

        <!-- Alert Banner -->
        <div class="alert-banner critical" *ngIf="hasAlert && alert?.alertLevel === 'Critical'">
          <span class="alert-icon">🚨</span>
          <div class="alert-content">
            <strong>Service Overdue!</strong>
            <p>{{ alert?.alertMessage }}</p>
          </div>
        </div>

        <div class="alert-banner warning" *ngIf="hasAlert && alert?.alertLevel === 'Warning'">
          <span class="alert-icon">⚠️</span>
          <div class="alert-content">
            <strong>Service Due Soon</strong>
            <p>{{ alert?.alertMessage }}</p>
          </div>
        </div>

        <!-- Vehicle Overview Card -->
        <div class="overview-card">
          <div class="vehicle-image-section">
            <img [src]="getCurrentPhoto()" 
                 alt="{{ vehicle.make }} {{ vehicle.model }}"
                 class="vehicle-main-image"
                 (click)="openGalleryModal()">
            <div class="status-badge" [class]="'status-' + (vehicle.status || 'available').toLowerCase().replace(' ', '-')">
              {{ vehicle.status || 'Available' }}
            </div>
            <div class="photo-gallery-preview" *ngIf="getAllPhotos().length > 1">
              <button class="gallery-btn" (click)="openGalleryModal()">
                📷 View Gallery ({{ getAllPhotos().length }} photos)
              </button>
            </div>
          </div>

          <div class="vehicle-info-section">
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Registration</span>
                <span class="info-value">{{ vehicle.registration || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Year</span>
                <span class="info-value">{{ vehicle.year }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Type</span>
                <span class="info-value">{{ vehicle.type || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Capacity</span>
                <span class="info-value">{{ vehicle.capacity }} seats</span>
              </div>
              <div class="info-item">
                <span class="info-label">VIN</span>
                <span class="info-value">{{ vehicle.vin || 'N/A' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Current Mileage</span>
                <span class="info-value">{{ vehicle.mileage.toLocaleString() || 'N/A' }} km</span>
              </div>
              <div class="info-item">
                <span class="info-label">Last Service</span>
                <span class="info-value">{{ vehicle.lastServiceDate ? formatDate(vehicle.lastServiceDate) : 'No service records' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Next Service</span>
                <span class="info-value">{{ vehicle.nextServiceDate ? formatDate(vehicle.nextServiceDate) : 'Not scheduled' }}</span>
              </div>
              <div class="info-item">
                <span class="info-label">Service Interval</span>
                <span class="info-value">{{ vehicle.serviceIntervalKm.toLocaleString() || '10,000' }} km</span>
              </div>
              <div class="info-item">
                <span class="info-label">Last Maintenance</span>
                <span class="info-value">{{ vehicle.lastMaintenanceDate ? formatDate(vehicle.lastMaintenanceDate) : 'No maintenance records' }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- Photo Gallery Modal -->
        <div class="modal-overlay" *ngIf="showGalleryModal" (click)="closeGalleryModal()">
          <div class="gallery-modal" (click)="$event.stopPropagation()">
            <button class="modal-close" (click)="closeGalleryModal()">✕</button>
            <h2>Photo Gallery</h2>
            <div class="gallery-main-image">
              <button class="gallery-nav prev" (click)="previousPhoto()" *ngIf="getAllPhotos().length > 1">‹</button>
              <img [src]="getAllPhotos()[currentPhotoIndex]" alt="Vehicle photo">
              <button class="gallery-nav next" (click)="nextPhoto()" *ngIf="getAllPhotos().length > 1">›</button>
              <div class="photo-counter">{{ currentPhotoIndex + 1 }} / {{ getAllPhotos().length }}</div>
            </div>
            <div class="gallery-thumbnails">
              <img *ngFor="let photo of getAllPhotos(); let i = index"
                   [src]="photo"
                   [class.active]="i === currentPhotoIndex"
                   (click)="currentPhotoIndex = i"
                   alt="Thumbnail {{ i + 1 }}">
            </div>
          </div>
        </div>

        <!-- Tabs Navigation -->
        <div class="tabs">
          <button 
            class="tab" 
            [class.active]="activeTab === 'service'"
            (click)="activeTab = 'service'">
            📋 Service History
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab === 'maintenance'"
            (click)="activeTab = 'maintenance'">
            🔧 Maintenance History
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab === 'financials'"
            (click)="selectFinancialsTab()">
            💰 Earnings & Expenses
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab === 'documents'"
            (click)="activeTab = 'documents'">
            📄 Documents
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab === 'gallery'"
            (click)="activeTab = 'gallery'">
            📸 Photo Gallery
          </button>
          <button 
            class="tab" 
            [class.active]="activeTab === 'driver'"
            (click)="selectDriverTab()">
            👤 Assigned Driver
          </button>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          <div *ngIf="activeTab === 'service'">
            <app-vehicle-service-history [vehicleId]="vehicle.id!"></app-vehicle-service-history>
          </div>

          <div *ngIf="activeTab === 'maintenance'">
            <app-vehicle-maintenance-history [vehicleId]="vehicle.id!"></app-vehicle-maintenance-history>
          </div>

          <div *ngIf="activeTab === 'financials'" class="financials-tab">
            <!-- Period Selector -->
            <div class="period-selector">
              <label>Report Period:</label>
              <select [(ngModel)]="selectedPeriod" (change)="onPeriodChange()">
                <option value="today">Today</option>
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="custom">Custom Range</option>
              </select>
              
              <div *ngIf="selectedPeriod === 'custom'" class="custom-range">
                <input type="date" [(ngModel)]="customStartDate" (change)="loadFinancials()">
                <span>to</span>
                <input type="date" [(ngModel)]="customEndDate" (change)="loadFinancials()">
              </div>
            </div>

            <!-- Profitability Summary -->
            <div *ngIf="profitabilityReport" class="profitability-summary">
              <div class="summary-card earnings">
                <div class="card-icon">📈</div>
                <div class="card-content">
                  <h3>Total Earnings</h3>
                  <p class="amount">R {{ profitabilityReport.totalEarnings.toLocaleString('en-ZA', {minimumFractionDigits: 2}) }}</p>
                </div>
              </div>
              <div class="summary-card expenses">
                <div class="card-icon">📉</div>
                <div class="card-content">
                  <h3>Total Expenses</h3>
                  <p class="amount">R {{ profitabilityReport.totalExpenses.toLocaleString('en-ZA', {minimumFractionDigits: 2}) }}</p>
                </div>
              </div>
              <div class="summary-card profit" [class.loss]="!profitabilityReport.isProfitable">
                <div class="card-icon">{{ profitabilityReport.isProfitable ? '✅' : '⚠️' }}</div>
                <div class="card-content">
                  <h3>Net {{ profitabilityReport.isProfitable ? 'Profit' : 'Loss' }}</h3>
                  <p class="amount">R {{ profitabilityReport.netProfit.toLocaleString('en-ZA', {minimumFractionDigits: 2}) }}</p>
                  <span class="margin">Margin: {{ profitabilityReport.profitMargin.toFixed(1) }}%</span>
                </div>
              </div>
            </div>

            <!-- Action Buttons -->
            <div class="financial-actions">
              <button class="btn-action btn-earnings" (click)="showEarningsModal = true">
                ➕ Add Earnings
              </button>
              <button class="btn-action btn-expenses" (click)="showExpensesModal = true">
                ➕ Add Expense
              </button>
            </div>

            <!-- Earnings List -->
            <div class="financial-section">
              <h3>💵 Earnings History</h3>
              <div class="financial-list">
                <div *ngFor="let earning of earnings" class="financial-item earnings-item">
                  <div class="item-info">
                    <strong>{{ earning.source }}</strong>
                    <span class="item-date">{{ formatDate(earning.date) }}</span>
                    <span class="item-period">{{ earning.period }}</span>
                    <p *ngIf="earning.description">{{ earning.description }}</p>
                  </div>
                  <div class="item-actions">
                    <span class="item-amount earnings">R {{ earning.amount.toLocaleString('en-ZA', {minimumFractionDigits: 2}) }}</span>
                    <button class="btn-delete" (click)="deleteEarning(earning.id)">🗑️</button>
                  </div>
                </div>
                <p *ngIf="earnings.length === 0" class="empty-message">No earnings recorded for this period.</p>
              </div>
            </div>

            <!-- Expenses List -->
            <div class="financial-section">
              <h3>💸 Expenses History</h3>
              <div class="financial-list">
                <div *ngFor="let expense of expenses" class="financial-item expenses-item">
                  <div class="item-info">
                    <strong>{{ expense.category }}</strong>
                    <span class="item-date">{{ formatDate(expense.date) }}</span>
                    <span *ngIf="expense.vendor" class="item-vendor">{{ expense.vendor }}</span>
                    <span *ngIf="expense.invoiceNumber" class="item-invoice">Invoice: {{ expense.invoiceNumber }}</span>
                    <p *ngIf="expense.description">{{ expense.description }}</p>
                  </div>
                  <div class="item-actions">
                    <span class="item-amount expenses">R {{ expense.amount.toLocaleString('en-ZA', {minimumFractionDigits: 2}) }}</span>
                    <button class="btn-delete" (click)="deleteExpense(expense.id)">🗑️</button>
                  </div>
                </div>
                <p *ngIf="expenses.length === 0" class="empty-message">No expenses recorded for this period.</p>
              </div>
            </div>
          </div>

          <div *ngIf="activeTab === 'documents'" class="documents-tab">
            <div class="documents-header">
              <h3>📄 Vehicle Documents</h3>
              <button class="btn-action btn-upload" (click)="docFileInput.click()" [disabled]="uploadingDocument">
                {{ uploadingDocument ? '⏳ Uploading...' : '➕ Upload Document' }}
              </button>
              <input #docFileInput type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style="display: none" (change)="handleDocumentUpload($event)">
            </div>

            <div class="error" *ngIf="documentUploadError">
              {{ documentUploadError }}
            </div>

            <div class="documents-list" *ngIf="documents.length > 0">
              <div class="document-item" *ngFor="let doc of documents">
                <div class="document-icon">
                  {{ getDocumentIcon(doc.documentType) }}
                </div>
                <div class="document-info">
                  <div class="document-type">{{ doc.documentType }}</div>
                  <div class="document-meta">
                    <span class="document-date">{{ doc.uploadedAt | date:'medium' }}</span>
                  </div>
                </div>
                <div class="document-actions">
                  <button class="btn-view" (click)="viewDocument(doc)" title="View">
                    👁️
                  </button>
                  <button class="btn-delete" (click)="deleteDocument(doc.id)" title="Delete">
                    🗑️
                  </button>
                </div>
              </div>
            </div>

            <div class="empty-state" *ngIf="documents.length === 0 && !uploadingDocument">
              <div class="empty-icon">📄</div>
              <p>No documents uploaded yet</p>
              <p class="empty-hint">Upload vehicle registration, insurance, or other documents</p>
            </div>

            <!-- Document Type Selection Modal -->
            <div class="modal-overlay" *ngIf="showDocumentTypeModal" (click)="showDocumentTypeModal = false">
              <div class="modal-content" (click)="$event.stopPropagation()">
                <div class="modal-header">
                  <h3>Select Document Type</h3>
                  <button class="close-btn" (click)="showDocumentTypeModal = false">✕</button>
                </div>
                <div class="modal-body">
                  <div class="form-group">
                    <label>Document Type:</label>
                    <select [(ngModel)]="selectedDocumentType" class="form-control">
                      <option value="">-- Select Type --</option>
                      <option value="Disc">Vehicle License Disc</option>
                      <option value="Insurance">Insurance Certificate</option>
                      <option value="Roadworthy">Roadworthy Certificate</option>
                      <option value="Registration">Registration Papers</option>
                      <option value="Service">Service Records</option>
                      <option value="Inspection">Inspection Report</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
                <div class="modal-footer">
                  <button class="btn-cancel" (click)="cancelDocumentUpload()">Cancel</button>
                  <button class="btn-save" (click)="confirmDocumentUpload()" [disabled]="!selectedDocumentType">Upload</button>
                </div>
              </div>
            </div>
          </div>

          <div *ngIf="activeTab === 'gallery'" class="gallery-tab">
            <div class="gallery-header">
              <h3>📸 Photo Gallery</h3>
              <button class="btn-action btn-upload" (click)="fileInput.click()" [disabled]="uploadingPhoto">
                {{ uploadingPhoto ? '⏳ Uploading...' : '➕ Upload Photo' }}
              </button>
              <input #fileInput type="file" accept="image/*" multiple style="display: none" (change)="handlePhotoUpload($event)">
            </div>

            <div class="error" *ngIf="photoUploadError">
              {{ photoUploadError }}
            </div>

            <div class="gallery-grid" *ngIf="getAllPhotos().length > 0">
              <div class="gallery-item" *ngFor="let photo of getAllPhotos(); let i = index">
                <img [src]="photo" alt="Vehicle photo {{ i + 1 }}" (click)="openGalleryModalAt(i)">
                <div class="gallery-item-actions">
                  <button class="btn-view" (click)="openGalleryModalAt(i)" title="View full size">
                    👁️
                  </button>
                  <button class="btn-delete-photo" (click)="deletePhoto(i)" title="Delete photo">
                    🗑️
                  </button>
                </div>
              </div>
            </div>

            <div *ngIf="getAllPhotos().length === 0" class="empty-gallery">
              <div class="empty-icon">📷</div>
              <h4>No photos yet</h4>
              <p>Upload photos to showcase this vehicle</p>
              <button class="btn-upload-large" (click)="fileInput.click()">
                📤 Upload First Photo
              </button>
            </div>
          </div>

          <!-- Driver Assignment Tab -->
          <div *ngIf="activeTab === 'driver'" class="driver-tab">
            <div class="driver-header">
              <h3>👤 Driver Assignment</h3>
            </div>

            <div class="driver-content">
              <!-- Currently Assigned Driver -->
              <div *ngIf="assignedDriver" class="assigned-driver-card">
                <div class="driver-info">
                  <div class="driver-avatar">
                    <img *ngIf="assignedDriver.photoUrl" [src]="assignedDriver.photoUrl" alt="{{assignedDriver.name}}">
                    <span *ngIf="!assignedDriver.photoUrl" class="driver-avatar-placeholder">{{getInitials(assignedDriver.name || 'N/A')}}</span>
                  </div>
                  <div class="driver-details">
                    <h4>{{assignedDriver.name || 'N/A'}}</h4>
                    <p class="driver-email">📧 {{assignedDriver.email || 'N/A'}}</p>
                    <p class="driver-phone">📱 {{assignedDriver.phone || 'N/A'}}</p>
                    <span class="driver-status" [class.active]="assignedDriver.isActive" [class.inactive]="!assignedDriver.isActive">
                      {{assignedDriver.isActive ? '✓ Active' : '✗ Inactive'}}
                    </span>
                    <span class="driver-availability" [class.available]="assignedDriver.isAvailable" [class.unavailable]="!assignedDriver.isAvailable">
                      {{assignedDriver.isAvailable ? '🟢 Available' : '🔴 Unavailable'}}
                    </span>
                  </div>
                </div>
                <button class="btn-unassign" (click)="unassignDriver()">
                  ✕ Unassign Driver
                </button>
              </div>

              <!-- No Driver Assigned -->
              <div *ngIf="!assignedDriver && !loadingDrivers" class="no-driver">
                <div class="empty-icon">👤</div>
                <h4>No driver assigned</h4>
                <p>Assign a driver to this vehicle</p>
              </div>

              <!-- Available Drivers List -->
              <div class="available-drivers">
                <h4>{{ assignedDriver ? 'Change Driver' : 'Select a Driver' }}</h4>
                
                <div *ngIf="loadingDrivers" class="loading">⏳ Loading drivers...</div>
                <div *ngIf="driverError" class="error">❌ {{ driverError }}</div>

                <div class="drivers-list" *ngIf="!loadingDrivers">
                  <div *ngIf="availableDrivers.length === 0" class="no-drivers">
                    <p>⚠️ No drivers found in the system. Please create driver profiles first.</p>
                  </div>
                  
                  <div class="driver-list-item" *ngFor="let driver of availableDrivers" 
                       [class.selected]="driver.id === assignedDriver?.id">
                    <div class="driver-info">
                      <div class="driver-avatar-small">
                        <img *ngIf="driver.photoUrl" [src]="driver.photoUrl" alt="{{driver.name}}">
                        <span *ngIf="!driver.photoUrl" class="driver-avatar-placeholder-small">{{getInitials(driver.name || 'N/A')}}</span>
                      </div>
                      <div class="driver-details-small">
                        <strong>{{driver.name || 'N/A'}}</strong>
                        <span class="driver-contact">📱 {{driver.phone || 'No phone'}}</span>
                        <span class="driver-badges">
                          <span class="badge" [class.badge-success]="driver.isActive" [class.badge-inactive]="!driver.isActive">
                            {{driver.isActive ? 'Active' : 'Inactive'}}
                          </span>
                          <span class="badge" *ngIf="driver.assignedVehicleId && driver.assignedVehicleId !== vehicle?.id" style="background: #ff9800; color: white;">
                            🚗 Assigned to another vehicle
                          </span>
                        </span>
                      </div>
                    </div>
                    <button class="btn-assign" (click)="assignDriver(driver)" 
                            [disabled]="driver.id === assignedDriver?.id || assigningDriver"
                            [style.opacity]="assigningDriver ? '0.5' : '1'">
                      {{ driver.id === assignedDriver?.id ? '✓ Currently Assigned' : (driver.assignedVehicleId ? '↔️ Reassign' : '→ Assign') }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Add Earnings Modal -->
        <div class="modal-overlay" *ngIf="showEarningsModal" (click)="showEarningsModal = false">
          <div class="form-modal" (click)="$event.stopPropagation()">
            <button class="modal-close" (click)="showEarningsModal = false">✕</button>
            <h2>Add Earnings</h2>
            <form (ngSubmit)="saveEarnings()">
              <div class="form-group">
                <label>Date *</label>
                <input type="date" [(ngModel)]="newEarnings.date" name="date" required>
              </div>
              <div class="form-group">
                <label>Amount (R) *</label>
                <input type="number" [(ngModel)]="newEarnings.amount" name="amount" step="0.01" required>
              </div>
              <div class="form-group">
                <label>Source *</label>
                <input type="text" [(ngModel)]="newEarnings.source" name="source" placeholder="e.g., Trip Revenue, Lease Payment" required>
              </div>
              <div class="form-group">
                <label>Period *</label>
                <select [(ngModel)]="newEarnings.period" name="period" required>
                  <option value="Daily">Daily</option>
                  <option value="Weekly">Weekly</option>
                  <option value="Monthly">Monthly</option>
                </select>
              </div>
              <div class="form-group">
                <label>Description</label>
                <textarea [(ngModel)]="newEarnings.description" name="description" rows="3"></textarea>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-cancel" (click)="showEarningsModal = false">Cancel</button>
                <button type="submit" class="btn-save">Save Earnings</button>
              </div>
            </form>
          </div>
        </div>

        <!-- Add Expense Modal -->
        <div class="modal-overlay" *ngIf="showExpensesModal" (click)="showExpensesModal = false">
          <div class="form-modal" (click)="$event.stopPropagation()">
            <button class="modal-close" (click)="showExpensesModal = false">✕</button>
            <h2>Add Expense</h2>
            <form (ngSubmit)="saveExpense()">
              <div class="form-group">
                <label>Date *</label>
                <input type="date" [(ngModel)]="newExpense.date" name="date" required>
              </div>
              <div class="form-group">
                <label>Amount (R) *</label>
                <input type="number" [(ngModel)]="newExpense.amount" name="amount" step="0.01" required>
              </div>
              <div class="form-group">
                <label>Category *</label>
                <select [(ngModel)]="newExpense.category" name="category" required>
                  <option value="Fuel">Fuel</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Insurance">Insurance</option>
                  <option value="License & Permits">License & Permits</option>
                  <option value="Tires">Tires</option>
                  <option value="Repairs">Repairs</option>
                  <option value="Parking & Tolls">Parking & Tolls</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div class="form-group">
                <label>Vendor</label>
                <input type="text" [(ngModel)]="newExpense.vendor" name="vendor" placeholder="e.g., Shell, Total">
              </div>
              <div class="form-group">
                <label>Invoice Number</label>
                <input type="text" [(ngModel)]="newExpense.invoiceNumber" name="invoiceNumber">
              </div>
              <div class="form-group">
                <label>Description</label>
                <textarea [(ngModel)]="newExpense.description" name="description" rows="3"></textarea>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-cancel" (click)="showExpensesModal = false">Cancel</button>
                <button type="submit" class="btn-save">Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .vehicle-details-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
      padding: 2rem;
    }

    .loading, .error {
      padding: 3rem;
      text-align: center;
      font-size: 1.25rem;
      color: #6b7280;
    }

    .error {
      color: #ef4444;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .btn-back {
      background: white;
      border: 2px solid #e5e7eb;
      padding: 0.75rem 1.5rem;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-back:hover {
      background: #f9fafb;
      transform: translateX(-5px);
    }

    .header h1 {
      font-size: 2rem;
      color: #000000;
      margin: 0;
    }

    .alert-banner {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem 1.5rem;
      border-radius: 12px;
      margin-bottom: 2rem;
    }

    .alert-banner.critical {
      background: #fef2f2;
      border-left: 4px solid #ef4444;
    }

    .alert-banner.warning {
      background: #fffbeb;
      border-left: 4px solid #f59e0b;
    }

    .alert-icon {
      font-size: 2rem;
    }

    .alert-content strong {
      display: block;
      color: #000000;
      margin-bottom: 0.25rem;
    }

    .alert-content p {
      margin: 0;
      color: #374151;
      font-size: 0.875rem;
    }

    .overview-card {
      background: white;
      border-radius: 20px;
      padding: 2rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      display: grid;
      grid-template-columns: 400px 1fr;
      gap: 2rem;
      margin-bottom: 2rem;
    }

    .vehicle-image-section {
      position: relative;
    }

    .vehicle-main-image {
      width: 100%;
      height: 300px;
      object-fit: cover;
      border-radius: 15px;
    }

    .status-badge {
      position: absolute;
      top: 1rem;
      right: 1rem;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: 700;
      font-size: 0.875rem;
      text-transform: uppercase;
    }

    .status-available {
      background: #d1fae5;
      color: #065f46;
    }

    .status-in-use {
      background: #dbeafe;
      color: #1e40af;
    }

    .status-maintenance {
      background: #fef3c7;
      color: #92400e;
    }

    .status-out-of-service {
      background: #fef2f2;
      color: #991b1b;
    }

    .info-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1.5rem;
    }

    .info-item {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .info-label {
      font-size: 0.75rem;
      color: #6b7280;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.5px;
    }

    .info-value {
      font-size: 1rem;
      color: #000000;
      font-weight: 600;
    }

    .tabs {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
      background: white;
      padding: 1rem;
      border-radius: 15px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.05);
    }

    .tab {
      flex: 1;
      padding: 1rem 2rem;
      background: transparent;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
      color: #6b7280;
    }

    .tab:hover {
      background: #f9fafb;
      color: #000000;
    }

    .tab.active {
      background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
      color: #FFD700;
    }

    .tab-content {
      min-height: 400px;
    }

    .documents-placeholder {
      background: white;
      border-radius: 20px;
      padding: 4rem;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .placeholder-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .documents-placeholder h3 {
      color: #000000;
      margin-bottom: 0.5rem;
    }

    .documents-placeholder p {
      color: #6b7280;
    }

    /* Gallery Tab Styles */
    .gallery-tab {
      background: white;
      border-radius: 20px;
      padding: 2rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .gallery-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1rem;
      border-bottom: 2px solid #f3f4f6;
    }

    .gallery-header h3 {
      margin: 0;
      color: #000000;
      font-size: 1.5rem;
    }

    .btn-upload {
      background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
      color: #000000;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-upload:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
    }

    .btn-upload:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .gallery-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
      gap: 1.5rem;
    }

    .gallery-item {
      position: relative;
      aspect-ratio: 4/3;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transition: all 0.3s ease;
    }

    .gallery-item:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    }

    .gallery-item img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      cursor: pointer;
    }

    .gallery-item-actions {
      position: absolute;
      top: 0.5rem;
      right: 0.5rem;
      display: flex;
      gap: 0.5rem;
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .gallery-item:hover .gallery-item-actions {
      opacity: 1;
    }

    .btn-view,
    .btn-delete-photo {
      background: rgba(0, 0, 0, 0.7);
      color: white;
      border: none;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      font-size: 1rem;
    }

    .btn-view:hover {
      background: #FFD700;
      color: #000;
    }

    .btn-delete-photo:hover {
      background: #ef4444;
    }

    .empty-gallery {
      text-align: center;
      padding: 4rem 2rem;
      background: #f9fafb;
      border-radius: 12px;
      border: 2px dashed #d1d5db;
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-gallery h4 {
      color: #374151;
      margin-bottom: 0.5rem;
    }

    .empty-gallery p {
      color: #6b7280;
      margin-bottom: 1.5rem;
    }

    .btn-upload-large {
      background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
      color: #000000;
      border: none;
      padding: 1rem 2rem;
      border-radius: 12px;
      font-size: 1.1rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-upload-large:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 16px rgba(255, 215, 0, 0.4);
    }

    /* Driver Assignment Styles */
    .driver-tab {
      background: white;
      border-radius: 20px;
      padding: 2rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .driver-header h3 {
      margin: 0 0 2rem 0;
      color: #000000;
      font-size: 1.5rem;
    }

    .assigned-driver-card {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border-radius: 16px;
      padding: 2rem;
      margin-bottom: 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 2px solid #bae6fd;
    }

    .driver-info {
      display: flex;
      gap: 1.5rem;
      align-items: center;
      flex: 1;
    }

    .driver-avatar {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      overflow: hidden;
      background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 2rem;
      font-weight: bold;
      color: #000;
    }

    .driver-avatar img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .driver-avatar-placeholder {
      font-size: 1.8rem;
    }

    .driver-details h4 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
      color: #000000;
    }

    .driver-email,
    .driver-phone {
      color: #64748b;
      margin: 0.25rem 0;
      font-size: 0.95rem;
    }

    .driver-status,
    .driver-availability {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      margin-right: 0.5rem;
      margin-top: 0.5rem;
    }

    .driver-status.active {
      background: #d1fae5;
      color: #065f46;
    }

    .driver-status.inactive {
      background: #fee2e2;
      color: #991b1b;
    }

    .driver-availability.available {
      background: #d1fae5;
      color: #065f46;
    }

    .driver-availability.unavailable {
      background: #fef3c7;
      color: #92400e;
    }

    .btn-unassign {
      background: #ef4444;
      color: white;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-unassign:hover {
      background: #dc2626;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.4);
    }

    .no-driver {
      text-align: center;
      padding: 3rem 2rem;
      background: #f9fafb;
      border-radius: 12px;
      border: 2px dashed #d1d5db;
      margin-bottom: 2rem;
    }

    .no-driver .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .no-driver h4 {
      color: #374151;
      margin-bottom: 0.5rem;
    }

    .no-driver p {
      color: #6b7280;
    }

    .available-drivers h4 {
      color: #000000;
      margin-bottom: 1rem;
      font-size: 1.2rem;
    }

    .drivers-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .driver-list-item {
      background: white;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      padding: 1rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.3s ease;
    }

    .driver-list-item:hover {
      border-color: #FFD700;
      box-shadow: 0 4px 12px rgba(255, 215, 0, 0.2);
    }

    .driver-list-item.selected {
      border-color: #FFD700;
      background: #fffbeb;
    }

    .driver-avatar-small {
      width: 50px;
      height: 50px;
      border-radius: 50%;
      overflow: hidden;
      background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.2rem;
      font-weight: bold;
      color: #000;
      flex-shrink: 0;
    }

    .driver-avatar-small img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .driver-avatar-placeholder-small {
      font-size: 1rem;
    }

    .driver-details-small {
      flex: 1;
      margin-left: 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .driver-details-small strong {
      color: #000000;
      font-size: 1.1rem;
    }

    .driver-contact {
      color: #64748b;
      font-size: 0.9rem;
    }

    .driver-badges {
      display: flex;
      gap: 0.5rem;
      margin-top: 0.25rem;
    }

    .badge {
      padding: 0.2rem 0.6rem;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .badge-success {
      background: #d1fae5;
      color: #065f46;
    }

    .badge-inactive {
      background: #fee2e2;
      color: #991b1b;
    }

    .badge-available {
      background: #d1fae5;
      color: #065f46;
    }

    .badge-busy {
      background: #fef3c7;
      color: #92400e;
    }

    .btn-assign {
      background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
      color: #000000;
      border: none;
      padding: 0.5rem 1.25rem;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      white-space: nowrap;
    }

    .btn-assign:hover:not(:disabled) {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
    }

    .btn-assign:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .no-drivers {
      text-align: center;
      padding: 2rem;
      color: #6b7280;
    }

    /* Financial Tracking Styles */
    .financials-tab {
      background: white;
      border-radius: 20px;
      padding: 2rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .period-selector {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 2rem;
      padding: 1rem;
      background: #f9fafb;
      border-radius: 10px;
    }

    .period-selector label {
      font-weight: 600;
      color: #374151;
    }

    .period-selector select,
    .period-selector input[type="date"] {
      padding: 0.5rem 1rem;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 0.875rem;
      cursor: pointer;
    }

    .custom-range {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .profitability-summary {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .summary-card {
      background: white;
      border-radius: 15px;
      padding: 1.5rem;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .summary-card.earnings {
      border-left: 4px solid #10b981;
    }

    .summary-card.expenses {
      border-left: 4px solid #ef4444;
    }

    .summary-card.profit {
      border-left: 4px solid #3b82f6;
    }

    .summary-card.loss {
      border-left: 4px solid #f59e0b;
    }

    .summary-card .card-icon {
      font-size: 2rem;
    }

    .summary-card .card-content h3 {
      margin: 0 0 0.5rem 0;
      font-size: 0.875rem;
      color: #6b7280;
      text-transform: uppercase;
    }

    .summary-card .amount {
      margin: 0;
      font-size: 1.5rem;
      font-weight: 700;
      color: #000000;
    }

    .summary-card .margin {
      font-size: 0.75rem;
      color: #6b7280;
    }

    .financial-actions {
      display: flex;
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .btn-action {
      flex: 1;
      padding: 1rem 1.5rem;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      font-size: 1rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-earnings {
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
    }

    .btn-earnings:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }

    .btn-expenses {
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
      color: white;
    }

    .btn-expenses:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
    }

    .financial-section {
      margin-bottom: 2rem;
    }

    .financial-section h3 {
      margin-bottom: 1rem;
      color: #000000;
    }

    .financial-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .financial-item {
      background: #f9fafb;
      padding: 1rem 1.5rem;
      border-radius: 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.3s ease;
    }

    .financial-item:hover {
      background: #f3f4f6;
      transform: translateX(5px);
    }

    .earnings-item {
      border-left: 4px solid #10b981;
    }

    .expenses-item {
      border-left: 4px solid #ef4444;
    }

    .item-info {
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .item-info strong {
      color: #000000;
      font-size: 1rem;
    }

    .item-date, .item-period, .item-vendor, .item-invoice {
      font-size: 0.75rem;
      color: #6b7280;
      display: inline-block;
      margin-right: 1rem;
    }

    .item-info p {
      margin: 0.25rem 0 0 0;
      font-size: 0.875rem;
      color: #374151;
    }

    .item-actions {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .item-amount {
      font-size: 1.125rem;
      font-weight: 700;
    }

    .item-amount.earnings {
      color: #10b981;
    }

    .item-amount.expenses {
      color: #ef4444;
    }

    .btn-delete {
      background: transparent;
      border: none;
      cursor: pointer;
      font-size: 1.25rem;
      opacity: 0.5;
      transition: all 0.3s ease;
    }

    .btn-delete:hover {
      opacity: 1;
      transform: scale(1.2);
    }

    .empty-message {
      text-align: center;
      padding: 2rem;
      color: #6b7280;
      font-style: italic;
    }

    .form-modal {
      background: white;
      padding: 2rem;
      border-radius: 20px;
      max-width: 500px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
    }

    .form-modal h2 {
      margin-top: 0;
      margin-bottom: 1.5rem;
      color: #000000;
    }

    .form-group {
      margin-bottom: 1.5rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #374151;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e5e7eb;
      border-radius: 8px;
      font-size: 1rem;
      transition: border-color 0.3s ease;
    }

    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus {
      outline: none;
      border-color: #000000;
    }

    .modal-actions {
      display: flex;
      gap: 1rem;
      margin-top: 2rem;
    }

    .btn-cancel, .btn-save {
      flex: 1;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-cancel {
      background: #e5e7eb;
      color: #374151;
    }

    .btn-cancel:hover {
      background: #d1d5db;
    }

    .btn-save {
      background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
      color: #FFD700;
    }

    .btn-save:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }


    .photo-gallery-preview {
      margin-top: 1rem;
    }

    .gallery-btn {
      width: 100%;
      padding: 0.75rem;
      background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
      color: #FFD700;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .gallery-btn:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .vehicle-main-image {
      cursor: pointer;
      transition: transform 0.3s ease;
    }

    .vehicle-main-image:hover {
      transform: scale(1.02);
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
      padding: 2rem;
    }

    .gallery-modal {
      background: white;
      border-radius: 20px;
      padding: 2rem;
      max-width: 1200px;
      width: 100%;
      max-height: 90vh;
      overflow: auto;
      position: relative;
    }

    .modal-close {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: #000;
      color: #FFD700;
      border: none;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      font-size: 1.5rem;
      cursor: pointer;
      z-index: 10;
      transition: all 0.3s ease;
    }

    .modal-close:hover {
      background: #FFD700;
      color: #000;
      transform: rotate(90deg);
    }

    .gallery-modal h2 {
      margin-bottom: 2rem;
      color: #000;
      text-align: center;
    }

    .gallery-main-image {
      position: relative;
      margin-bottom: 2rem;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 500px;
    }

    .gallery-main-image img {
      max-width: 100%;
      max-height: 600px;
      object-fit: contain;
      border-radius: 10px;
    }

    .gallery-nav {
      position: absolute;
      background: rgba(0, 0, 0, 0.7);
      color: #FFD700;
      border: none;
      width: 50px;
      height: 50px;
      border-radius: 50%;
      font-size: 2rem;
      cursor: pointer;
      transition: all 0.3s ease;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .gallery-nav:hover {
      background: #000;
      transform: scale(1.1);
    }

    .gallery-nav.prev {
      left: 1rem;
    }

    .gallery-nav.next {
      right: 1rem;
    }

    .photo-counter {
      position: absolute;
      bottom: 1rem;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.7);
      color: #FFD700;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-weight: 600;
    }

    .gallery-thumbnails {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
      gap: 1rem;
      max-height: 200px;
      overflow-y: auto;
    }

    .gallery-thumbnails img {
      width: 100%;
      height: 100px;
      object-fit: cover;
      border-radius: 8px;
      cursor: pointer;
      border: 3px solid transparent;
      transition: all 0.3s ease;
    }

    .gallery-thumbnails img:hover {
      transform: scale(1.05);
      border-color: #FFD700;
    }

    .gallery-thumbnails img.active {
      border-color: #000;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    /* Documents Tab Styles */
    .documents-tab {
      padding: 2rem;
    }

    .documents-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .documents-header h3 {
      font-size: 1.5rem;
      font-weight: 600;
      color: #000;
      margin: 0;
    }

    .documents-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .document-item {
      display: flex;
      align-items: center;
      gap: 1.5rem;
      padding: 1.5rem;
      background: white;
      border: 2px solid #E5E7EB;
      border-radius: 12px;
      transition: all 0.3s ease;
    }

    .document-item:hover {
      border-color: #FFD700;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      transform: translateY(-2px);
    }

    .document-icon {
      font-size: 2.5rem;
      width: 60px;
      height: 60px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #F9FAFB;
      border-radius: 10px;
    }

    .document-info {
      flex: 1;
    }

    .document-type {
      font-weight: 600;
      font-size: 1.1rem;
      color: #000;
      margin-bottom: 0.5rem;
    }

    .document-meta {
      display: flex;
      gap: 1rem;
      font-size: 0.9rem;
      color: #6B7280;
    }

    .document-date::before {
      content: '📅 ';
    }

    .document-actions {
      display: flex;
      gap: 0.5rem;
    }

    .document-actions button {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 8px;
      font-size: 1.2rem;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .document-actions .btn-view {
      background: #FFD700;
      color: #000;
    }

    .document-actions .btn-view:hover {
      background: #000;
      color: #FFD700;
    }

    .document-actions .btn-delete {
      background: #EF4444;
      color: white;
    }

    .document-actions .btn-delete:hover {
      background: #DC2626;
    }

    @media (max-width: 1024px) {
      .overview-card {
        grid-template-columns: 1fr;
      }

      .tabs {
        flex-direction: column;
      }

      .info-grid {
        grid-template-columns: 1fr;
      }

      .gallery-main-image {
        min-height: 300px;
      }

      .gallery-nav {
        width: 40px;
        height: 40px;
        font-size: 1.5rem;
      }
    }
  `]
})
export class VehicleDetailsComponent implements OnInit {
  vehicle: Vehicle | null = null;
  alert: VehicleServiceAlert | null = null;
  hasAlert = false;
  loading = false;
  error: string | null = null;
  activeTab: 'service' | 'maintenance' | 'financials' | 'documents' | 'gallery' | 'driver' = 'service';
  showGalleryModal = false;
  currentPhotoIndex = 0;
  
  // Photo gallery properties
  uploadingPhoto = false;
  photoUploadError: string | null = null;

  // Driver assignment properties
  assignedDriver: DriverProfile | null = null;
  availableDrivers: DriverProfile[] = [];
  loadingDrivers = false;
  assigningDriver = false;
  driverError: string | null = null;

  // Document management properties
  documents: VehicleDocument[] = [];
  uploadingDocument = false;
  documentUploadError: string | null = null;
  showDocumentTypeModal = false;
  selectedDocumentType = '';
  pendingDocumentFile: File | null = null;

  // Financial tracking properties
  earnings: VehicleEarnings[] = [];
  expenses: VehicleExpense[] = [];
  profitabilityReport: VehicleProfitabilityReport | null = null;
  selectedPeriod: 'today' | 'week' | 'month' | 'custom' = 'month';
  customStartDate: string = '';
  customEndDate: string = '';
  showEarningsModal = false;
  showExpensesModal = false;
  
  newEarnings: CreateVehicleEarnings = {
    vehicleId: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    source: '',
    period: 'Daily',
    description: ''
  };

  newExpense: CreateVehicleExpense = {
    vehicleId: '',
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    category: 'Fuel',
    description: '',
    invoiceNumber: '',
    vendor: ''
  };

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private vehicleService: VehicleService,
    private maintenanceService: VehicleMaintenanceService,
    private financialsService: VehicleFinancialsService,
    private documentsService: VehicleDocumentsService,
    private identityService: IdentityService
  ) {}

  ngOnInit(): void {
    const vehicleId = this.route.snapshot.paramMap.get('id');
    if (vehicleId) {
      this.newEarnings.vehicleId = vehicleId;
      this.newExpense.vehicleId = vehicleId;
      this.loadVehicle(vehicleId);
      this.loadVehicleAlert(vehicleId);
      this.loadDocuments(vehicleId);
    } else {
      this.error = 'No vehicle ID provided';
    }
  }

  loadVehicle(id: string): void {
    this.loading = true;
    this.error = null;

    this.vehicleService.getById(id).subscribe({
      next: (vehicle) => {
        this.vehicle = vehicle;
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Failed to load vehicle: ' + err.message;
        this.loading = false;
      }
    });
  }

  loadVehicleAlert(vehicleId: string): void {
    this.maintenanceService.getVehicleServiceAlerts().subscribe({
      next: (alerts) => {
        this.alert = alerts.find(a => a.vehicleId === vehicleId) || null;
        this.hasAlert = this.alert !== null && 
                        (this.alert.alertLevel === 'Critical' || this.alert.alertLevel === 'Warning');
      },
      error: () => {
        // Silently fail - alerts are not critical
      }
    });
  }

  selectFinancialsTab(): void {
    this.activeTab = 'financials';
    this.loadFinancials();
  }

  loadFinancials(): void {
    if (!this.vehicle?.id) return;

    const { startDate, endDate } = this.getDateRange();
    
    // Load earnings
    this.financialsService.getVehicleEarningsByPeriod(this.vehicle.id, startDate, endDate).subscribe({
      next: (earnings) => this.earnings = earnings,
      error: (err) => console.error('Failed to load earnings:', err)
    });

    // Load expenses
    this.financialsService.getVehicleExpensesByPeriod(this.vehicle.id, startDate, endDate).subscribe({
      next: (expenses) => this.expenses = expenses,
      error: (err) => console.error('Failed to load expenses:', err)
    });

    // Load profitability report
    this.financialsService.getProfitabilityReport(this.vehicle.id, startDate, endDate).subscribe({
      next: (report) => this.profitabilityReport = report,
      error: (err) => console.error('Failed to load profitability report:', err)
    });
  }

  getDateRange(): { startDate: string; endDate: string } {
    const today = new Date();
    let startDate: Date;
    let endDate = new Date(today);

    switch (this.selectedPeriod) {
      case 'today':
        startDate = new Date(today);
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - 7);
        break;
      case 'month':
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        break;
      case 'custom':
        if (this.customStartDate && this.customEndDate) {
          return {
            startDate: this.customStartDate,
            endDate: this.customEndDate
          };
        }
        // Default to last month if custom dates not set
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
        break;
      default:
        startDate = new Date(today);
        startDate.setMonth(today.getMonth() - 1);
    }

    return {
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0]
    };
  }

  onPeriodChange(): void {
    if (this.selectedPeriod !== 'custom') {
      this.loadFinancials();
    }
  }

  saveEarnings(): void {
    if (!this.vehicle?.id) return;

    this.financialsService.createEarnings(this.newEarnings).subscribe({
      next: () => {
        this.showEarningsModal = false;
        this.resetEarningsForm();
        this.loadFinancials();
      },
      error: (err) => alert('Failed to save earnings: ' + err.message)
    });
  }

  saveExpense(): void {
    if (!this.vehicle?.id) return;

    this.financialsService.createExpense(this.newExpense).subscribe({
      next: () => {
        this.showExpensesModal = false;
        this.resetExpenseForm();
        this.loadFinancials();
      },
      error: (err) => alert('Failed to save expense: ' + err.message)
    });
  }

  deleteEarning(id: string): void {
    if (confirm('Are you sure you want to delete this earnings record?')) {
      this.financialsService.deleteEarnings(id).subscribe({
        next: () => this.loadFinancials(),
        error: (err) => alert('Failed to delete earnings: ' + err.message)
      });
    }
  }

  deleteExpense(id: string): void {
    if (confirm('Are you sure you want to delete this expense record?')) {
      this.financialsService.deleteExpense(id).subscribe({
        next: () => this.loadFinancials(),
        error: (err) => alert('Failed to delete expense: ' + err.message)
      });
    }
  }

  resetEarningsForm(): void {
    this.newEarnings = {
      vehicleId: this.vehicle?.id || '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      source: '',
      period: 'Daily',
      description: ''
    };
  }

  resetExpenseForm(): void {
    this.newExpense = {
      vehicleId: this.vehicle?.id || '',
      date: new Date().toISOString().split('T')[0],
      amount: 0,
      category: 'Fuel',
      description: '',
      invoiceNumber: '',
      vendor: ''
    };
  }

  goBack(): void {
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
      this.router.navigate(['/owner-dashboard/vehicles']);
    } else {
      this.router.navigate(['/vehicles']);
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  getPlaceholderImage(): string {
    return "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 400 300'%3E%3Crect fill='%23ddd' width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%23999' font-size='24'%3ENo Image%3C/text%3E%3C/svg%3E";
  }

  getAllPhotos(): string[] {
    const photos: string[] = [];
    if (this.vehicle?.photoBase64) {
      photos.push(this.vehicle.photoBase64);
    }
    if (this.vehicle?.photos && this.vehicle.photos.length > 0) {
      photos.push(...this.vehicle.photos);
    }
    if (photos.length === 0) {
      photos.push(this.getPlaceholderImage());
    }
    return photos;
  }

  getCurrentPhoto(): string {
    return this.getAllPhotos()[0];
  }

  openGalleryModal(): void {
    this.showGalleryModal = true;
    this.currentPhotoIndex = 0;
  }

  openGalleryModalAt(index: number): void {
    this.showGalleryModal = true;
    this.currentPhotoIndex = index;
  }

  closeGalleryModal(): void {
    this.showGalleryModal = false;
  }

  nextPhoto(): void {
    const photos = this.getAllPhotos();
    this.currentPhotoIndex = (this.currentPhotoIndex + 1) % photos.length;
  }

  previousPhoto(): void {
    const photos = this.getAllPhotos();
    this.currentPhotoIndex = (this.currentPhotoIndex - 1 + photos.length) % photos.length;
  }

  handlePhotoUpload(event: any): void {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    // Validate files first
    const validFiles: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('image/')) {
        this.photoUploadError = 'Please select only image files';
        event.target.value = ''; // Reset file input
        return;
      }

      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        this.photoUploadError = 'Image size must be less than 5MB';
        event.target.value = ''; // Reset file input
        return;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    this.uploadingPhoto = true;
    this.photoUploadError = null;

    const newPhotos: string[] = [];
    let filesProcessed = 0;

    validFiles.forEach((file: File) => {
      const reader = new FileReader();
      
      reader.onload = (e: any) => {
        newPhotos.push(e.target.result);
        filesProcessed++;

        if (filesProcessed === validFiles.length) {
          // Add new photos to vehicle
          if (!this.vehicle) {
            this.uploadingPhoto = false;
            return;
          }

          if (!this.vehicle.photos) {
            this.vehicle.photos = [];
          }
          this.vehicle.photos.push(...newPhotos);

          // Save to backend
          this.saveVehiclePhotos();
        }
      };
      
      reader.onerror = () => {
        this.photoUploadError = 'Failed to read image file';
        this.uploadingPhoto = false;
      };
      
      reader.readAsDataURL(file);
    });

    // Reset file input
    event.target.value = '';
  }

  deletePhoto(index: number): void {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    const photos = this.getAllPhotos();
    const isPlaceholder = photos[index] === this.getPlaceholderImage();
    
    if (isPlaceholder) {
      alert('Cannot delete placeholder image');
      return;
    }

    if (!this.vehicle) return;

    // Check if it's the main photo (photoBase64)
    if (index === 0 && this.vehicle.photoBase64 === photos[0]) {
      this.vehicle.photoBase64 = '';
    } else {
      // Calculate the adjusted index for the photos array
      const adjustedIndex = this.vehicle.photoBase64 ? index - 1 : index;
      if (this.vehicle.photos && adjustedIndex >= 0 && adjustedIndex < this.vehicle.photos.length) {
        this.vehicle.photos.splice(adjustedIndex, 1);
      }
    }

    this.saveVehiclePhotos();
  }

  saveVehiclePhotos(): void {
    if (!this.vehicle) return;

    this.vehicleService.update(this.vehicle.id!, this.vehicle).subscribe({
      next: () => {
        this.uploadingPhoto = false;
        this.photoUploadError = null;
      },
      error: (err: any) => {
        this.uploadingPhoto = false;
        this.photoUploadError = 'Failed to save photos: ' + err.message;
      }
    });
  }

  // Document Management Methods
  loadDocuments(vehicleId: string): void {
    this.documentsService.getByVehicleId(vehicleId).subscribe({
      next: (docs) => {
        this.documents = docs;
      },
      error: (err) => {
        console.error('Failed to load documents:', err);
      }
    });
  }

  handleDocumentUpload(event: any): void {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      this.documentUploadError = 'File size must be less than 10MB';
      event.target.value = '';
      return;
    }

    // Store file and show type selection modal
    this.pendingDocumentFile = file;
    this.selectedDocumentType = '';
    this.documentUploadError = null;
    this.showDocumentTypeModal = true;
    
    event.target.value = '';
  }

  confirmDocumentUpload(): void {
    if (!this.pendingDocumentFile || !this.selectedDocumentType || !this.vehicle) {
      return;
    }

    this.showDocumentTypeModal = false;
    this.uploadingDocument = true;
    this.documentUploadError = null;

    const reader = new FileReader();
    
    reader.onload = (e: any) => {
      const command: CreateVehicleDocumentCommand = {
        vehicleId: this.vehicle!.id!,
        documentType: this.selectedDocumentType,
        fileUrl: e.target.result, // Base64 string
        uploadedAt: new Date().toISOString()
      };

      this.documentsService.create(command).subscribe({
        next: (doc) => {
          this.documents.unshift(doc);
          this.uploadingDocument = false;
          this.pendingDocumentFile = null;
          this.selectedDocumentType = '';
        },
        error: (err) => {
          this.uploadingDocument = false;
          this.documentUploadError = 'Failed to upload document: ' + err.message;
        }
      });
    };

    reader.onerror = () => {
      this.uploadingDocument = false;
      this.documentUploadError = 'Failed to read file';
    };

    reader.readAsDataURL(this.pendingDocumentFile);
  }

  cancelDocumentUpload(): void {
    this.showDocumentTypeModal = false;
    this.pendingDocumentFile = null;
    this.selectedDocumentType = '';
    this.documentUploadError = null;
  }

  viewDocument(doc: VehicleDocument): void {
    // Open document in new tab
    if (doc.fileUrl.startsWith('data:')) {
      // Base64 data - open in new window
      const w = window.open('about:blank');
      if (w) {
        const isPDF = doc.fileUrl.startsWith('data:application/pdf');
        if (isPDF) {
          w.document.write(`<iframe src="${doc.fileUrl}" style="border:0; top:0; left:0; bottom:0; right:0; width:100%; height:100%;" allowfullscreen></iframe>`);
        } else {
          w.document.write(`<img src="${doc.fileUrl}" style="max-width:100%; height:auto;" />`);
        }
      }
    } else {
      // URL - open directly
      window.open(doc.fileUrl, '_blank');
    }
  }

  deleteDocument(id: string): void {
    if (!confirm('Are you sure you want to delete this document?')) return;

    this.documentsService.delete(id).subscribe({
      next: () => {
        this.documents = this.documents.filter(d => d.id !== id);
      },
      error: (err) => {
        alert('Failed to delete document: ' + err.message);
      }
    });
  }

  getDocumentIcon(type: string): string {
    const icons: { [key: string]: string } = {
      'Disc': '🪙',
      'Insurance': '🛡️',
      'Roadworthy': '✅',
      'Registration': '📋',
      'Service': '🔧',
      'Inspection': '🔍',
      'Other': '📄'
    };
    return icons[type] || '📄';
  }

  // Driver Assignment Methods
  selectDriverTab(): void {
    this.activeTab = 'driver';
    this.loadDrivers();
  }

  loadDrivers(): void {
    if (!this.vehicle) return;

    this.loadingDrivers = true;
    this.driverError = null;

    // Load all drivers
    this.identityService.getAllDriverProfiles().subscribe({
      next: (drivers) => {
        console.log('Raw drivers from API:', drivers);
        console.log('Number of drivers:', drivers?.length);
        
        // Map drivers to handle both PascalCase and camelCase from backend
        const mappedDrivers = drivers.map(d => ({
          ...d,
          id: d.id || (d as any).Id,
          name: d.name || (d as any).Name,
          phone: d.phone || (d as any).Phone,
          email: d.email || (d as any).Email,
          photoUrl: d.photoUrl || (d as any).PhotoUrl,
          isActive: d.isActive !== undefined ? d.isActive : (d as any).IsActive,
          isAvailable: d.isAvailable !== undefined ? d.isAvailable : (d as any).IsAvailable,
          assignedVehicleId: d.assignedVehicleId || (d as any).AssignedVehicleId
        }));

        console.log('Mapped drivers:', mappedDrivers);
        console.log('Current vehicle ID:', this.vehicle?.id);
        
        // Find the driver assigned to this vehicle
        this.assignedDriver = mappedDrivers.find(d => d.assignedVehicleId === this.vehicle?.id) || null;
        console.log('Assigned driver:', this.assignedDriver);
        
        // Show ALL drivers in the list (not just available ones)
        // This allows reassignment from other vehicles
        this.availableDrivers = mappedDrivers;
        console.log('All drivers for selection:', this.availableDrivers);
        
        this.loadingDrivers = false;
      },
      error: (err) => {
        console.error('Error loading drivers:', err);
        this.driverError = 'Failed to load drivers: ' + (err?.message || JSON.stringify(err));
        this.loadingDrivers = false;
      }
    });
  }

  assignDriver(driver: DriverProfile): void {
    if (!this.vehicle || !confirm(`Assign ${driver.name} to this vehicle?`)) return;

    this.assigningDriver = true;
    this.driverError = null;

    // Update driver's assigned vehicle
    const updatedDriver = { ...driver, assignedVehicleId: this.vehicle.id };

    this.identityService.updateDriverProfile(driver.id, updatedDriver as any).subscribe({
      next: () => {
        // If there was a previously assigned driver, unassign them
        if (this.assignedDriver && this.assignedDriver.id !== driver.id) {
          const previousDriver = { ...this.assignedDriver, assignedVehicleId: undefined };
          this.identityService.updateDriverProfile(this.assignedDriver.id, previousDriver as any).subscribe();
        }

        this.assignedDriver = updatedDriver;
        this.assigningDriver = false;
        this.loadDrivers(); // Refresh the list
      },
      error: (err) => {
        this.driverError = 'Failed to assign driver: ' + err.message;
        this.assigningDriver = false;
      }
    });
  }

  unassignDriver(): void {
    if (!this.assignedDriver || !confirm(`Unassign ${this.assignedDriver.name} from this vehicle?`)) return;

    this.assigningDriver = true;
    this.driverError = null;

    const updatedDriver = { ...this.assignedDriver, assignedVehicleId: undefined };

    this.identityService.updateDriverProfile(this.assignedDriver.id, updatedDriver as any).subscribe({
      next: () => {
        this.assignedDriver = null;
        this.assigningDriver = false;
        this.loadDrivers(); // Refresh the list
      },
      error: (err) => {
        this.driverError = 'Failed to unassign driver: ' + err.message;
        this.assigningDriver = false;
      }
    });
  }

  getInitials(name: string): string {
    if (!name) return '?';
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  }
}

