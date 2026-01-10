import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleMaintenanceService } from '../../../services';
import { ServiceHistory, CreateServiceHistoryCommand, UpdateServiceHistoryCommand } from '../../../models';

@Component({
  selector: 'app-vehicle-service-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="service-history">
      <div class="header">
        <h3>📋 Service History</h3>
        <button class="btn-add" (click)="openAddForm()">+ Add Service Record</button>
      </div>

      <div class="loading" *ngIf="loading">Loading service history...</div>
      <div class="error" *ngIf="error">{{ error }}</div>

      <div class="filters" *ngIf="!loading && serviceRecords.length > 0">
        <input 
          type="text" 
          placeholder="Search services..." 
          [(ngModel)]="searchTerm"
          (ngModelChange)="filterRecords()"
          class="search-input">
        
        <select [(ngModel)]="filterType" (ngModelChange)="filterRecords()" class="filter-select">
          <option value="">All Types</option>
          <option value="Routine">Routine</option>
          <option value="Major">Major</option>
          <option value="Minor">Minor</option>
          <option value="Custom">Custom</option>
        </select>
      </div>

      <div class="table-container" *ngIf="!loading && !error">
        <div *ngIf="filteredRecords.length === 0" class="no-records">
          <span class="no-records-icon">📝</span>
          <p>No service records found</p>
          <button class="btn-add-secondary" (click)="openAddForm()">Add First Service Record</button>
        </div>

        <table *ngIf="filteredRecords.length > 0">
          <thead>
            <tr>
              <th (click)="sort('serviceDate')">
                Date <span class="sort-icon">{{ getSortIcon('serviceDate') }}</span>
              </th>
              <th>Type</th>
              <th>Description</th>
              <th>Mileage (km)</th>
              <th>Cost (R)</th>
              <th>Provider</th>
              <th>Next Service</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let record of filteredRecords">
              <td>{{ formatDate(record.serviceDate) }}</td>
              <td>
                <span class="type-badge" [class]="'type-' + record.serviceType.toLowerCase()">
                  {{ record.serviceType }}
                </span>
              </td>
              <td class="description">{{ record.description }}</td>
              <td>{{ record.mileageAtService.toLocaleString() || 'N/A' }}</td>
              <td class="cost">R{{ record.cost.toFixed(2) || '0.00' }}</td>
              <td>{{ record.serviceProvider || 'N/A' }}</td>
              <td>
                <div class="next-service">
                  <div *ngIf="record.nextServiceDate">{{ formatDate(record.nextServiceDate) }}</div>
                  <div *ngIf="record.nextServiceMileage" class="mileage-badge">
                    {{ record.nextServiceMileage.toLocaleString() }} km
                  </div>
                </div>
              </td>
              <td class="actions">
                <button class="btn-icon btn-view" (click)="viewRecord(record)" title="View Details">
                  👁️
                </button>
                <button class="btn-icon btn-edit" (click)="editRecord(record)" title="Edit">
                  ✏️
                </button>
                <button class="btn-icon btn-delete" (click)="deleteRecord(record)" title="Delete">
                  🗑️
                </button>
              </td>
            </tr>
          </tbody>
          <tfoot *ngIf="filteredRecords.length > 0">
            <tr>
              <td colspan="4"><strong>Total Service Cost:</strong></td>
              <td colspan="4"><strong>R{{ getTotalCost().toFixed(2) }}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Add/Edit Service Record Modal -->
    <div class="modal" *ngIf="showFormModal" (click)="closeFormModal()">
      <div class="modal-content modal-large" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ editingRecord ? 'Edit Service Record' : 'Add Service Record' }}</h3>
          <button class="btn-close" (click)="closeFormModal()">×</button>
        </div>
        <form (ngSubmit)="saveServiceRecord()" class="modal-body service-form">
          <div class="form-row">
            <div class="form-group">
              <label>Service Date <span class="required">*</span></label>
              <input 
                type="date" 
                [(ngModel)]="currentRecord.serviceDate" 
                name="serviceDate"
                required
                class="form-input">
            </div>

            <div class="form-group">
              <label>Service Type <span class="required">*</span></label>
              <select 
                [(ngModel)]="currentRecord.serviceType" 
                name="serviceType"
                required
                class="form-input">
                <option value="">Select Type</option>
                <option value="Routine">Routine Service</option>
                <option value="Major">Major Service</option>
                <option value="Minor">Minor Service</option>
                <option value="Custom">Custom Service</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Mileage at Service (km) <span class="required">*</span></label>
              <input 
                type="number" 
                [(ngModel)]="currentRecord.mileageAtService" 
                name="mileageAtService"
                required
                min="0"
                class="form-input">
            </div>

            <div class="form-group">
              <label>Cost (R) <span class="required">*</span></label>
              <input 
                type="number" 
                [(ngModel)]="currentRecord.cost" 
                name="cost"
                required
                min="0"
                step="0.01"
                class="form-input">
            </div>
          </div>

          <div class="form-group">
            <label>Service Provider <span class="required">*</span></label>
            <input 
              type="text" 
              [(ngModel)]="currentRecord.serviceProvider" 
              name="serviceProvider"
              required
              placeholder="e.g., Speedy Auto"
              class="form-input">
          </div>

          <div class="form-group">
            <label>Description <span class="required">*</span></label>
            <textarea 
              [(ngModel)]="currentRecord.description" 
              name="description"
              required
              rows="3"
              placeholder="Describe the service performed..."
              class="form-input"></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Next Service Date</label>
              <input 
                type="date" 
                [(ngModel)]="currentRecord.nextServiceDate" 
                name="nextServiceDate"
                class="form-input">
            </div>

            <div class="form-group">
              <label>Next Service Mileage (km)</label>
              <input 
                type="number" 
                [(ngModel)]="currentRecord.nextServiceMileage" 
                name="nextServiceMileage"
                min="0"
                class="form-input">
            </div>
          </div>

          <div class="form-group">
            <label>Invoice Number</label>
            <input 
              type="text" 
              [(ngModel)]="currentRecord.invoiceNumber" 
              name="invoiceNumber"
              placeholder="e.g., INV-2024-001"
              class="form-input">
          </div>

          <div class="form-group">
            <label>Notes</label>
            <textarea 
              [(ngModel)]="currentRecord.notes" 
              name="notes"
              rows="3"
              placeholder="Additional notes or observations..."
              class="form-input"></textarea>
          </div>

          <div class="form-error" *ngIf="formError">
            {{ formError }}
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-secondary" (click)="closeFormModal()">Cancel</button>
            <button type="submit" class="btn-primary" [disabled]="saving">
              {{ saving ? 'Saving...' : (editingRecord ? 'Update' : 'Add') }} Service Record
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- View Modal -->
    <div class="modal" *ngIf="showViewModal" (click)="closeViewModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Service Record Details</h3>
          <button class="btn-close" (click)="closeViewModal()">×</button>
        </div>
        <div class="modal-body" *ngIf="selectedRecord">
          <div class="detail-row">
            <label>Service Date:</label>
            <span>{{ formatDate(selectedRecord.serviceDate) }}</span>
          </div>
          <div class="detail-row">
            <label>Service Type:</label>
            <span class="type-badge" [class]="'type-' + selectedRecord.serviceType.toLowerCase()">
              {{ selectedRecord.serviceType }}
            </span>
          </div>
          <div class="detail-row">
            <label>Description:</label>
            <span>{{ selectedRecord.description }}</span>
          </div>
          <div class="detail-row">
            <label>Mileage:</label>
            <span>{{ selectedRecord.mileageAtService.toLocaleString() }} km</span>
          </div>
          <div class="detail-row">
            <label>Cost:</label>
            <span>R{{ selectedRecord.cost.toFixed(2) }}</span>
          </div>
          <div class="detail-row">
            <label>Service Provider:</label>
            <span>{{ selectedRecord.serviceProvider || 'N/A' }}</span>
          </div>
          <div class="detail-row">
            <label>Next Service Date:</label>
            <span>{{ selectedRecord.nextServiceDate ? formatDate(selectedRecord.nextServiceDate) : 'N/A' }}</span>
          </div>
          <div class="detail-row">
            <label>Next Service Mileage:</label>
            <span>{{ selectedRecord.nextServiceMileage?.toLocaleString() }} km</span>
          </div>
          <div class="detail-row" *ngIf="selectedRecord.invoiceNumber">
            <label>Invoice Number:</label>
            <span>{{ selectedRecord.invoiceNumber }}</span>
          </div>
          <div class="detail-row" *ngIf="selectedRecord.notes">
            <label>Notes:</label>
            <span>{{ selectedRecord.notes }}</span>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-secondary" (click)="closeViewModal()">Close</button>
          <button class="btn-primary" (click)="editRecord(selectedRecord!)">Edit</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .service-history {
      background: white;
      border-radius: 15px;
      padding: 1.5rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .header h3 {
      margin: 0;
      font-size: 1.5rem;
      color: #000000;
    }

    .btn-add {
      background: #000000;
      color: #FFD700;
      border: none;
      padding: 0.75rem 1.5rem;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-add:hover {
      background: #1a1a1a;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    }

    .filters {
      display: flex;
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .search-input, .filter-select {
      padding: 0.75rem;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      font-size: 0.875rem;
    }

    .search-input {
      flex: 1;
    }

    .filter-select {
      min-width: 150px;
    }

    .loading, .error {
      padding: 2rem;
      text-align: center;
      color: #6b7280;
    }

    .error {
      color: #ef4444;
    }

    .no-records {
      padding: 3rem 2rem;
      text-align: center;
      color: #9ca3af;
    }

    .no-records-icon {
      font-size: 3rem;
      display: block;
      margin-bottom: 1rem;
    }

    .btn-add-secondary {
      margin-top: 1rem;
      padding: 0.75rem 1.5rem;
      background: #f3f4f6;
      color: #000000;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
    }

    .table-container {
      overflow-x: auto;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    thead {
      background: #f9fafb;
    }

    th {
      padding: 1rem;
      text-align: left;
      font-weight: 600;
      color: #374151;
      cursor: pointer;
      user-select: none;
    }

    th:hover {
      background: #f3f4f6;
    }

    .sort-icon {
      margin-left: 0.25rem;
      color: #9ca3af;
    }

    td {
      padding: 1rem;
      border-bottom: 1px solid #e5e7eb;
    }

    .description {
      max-width: 200px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .cost {
      font-weight: 600;
      color: #059669;
    }

    .type-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .type-routine {
      background: #dbeafe;
      color: #1e40af;
    }

    .type-major {
      background: #fef2f2;
      color: #991b1b;
    }

    .type-minor {
      background: #fef3c7;
      color: #92400e;
    }

    .type-custom {
      background: #f3e8ff;
      color: #6b21a8;
    }

    .next-service {
      font-size: 0.875rem;
    }

    .mileage-badge {
      margin-top: 0.25rem;
      color: #6b7280;
      font-size: 0.75rem;
    }

    .actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-icon {
      background: none;
      border: none;
      font-size: 1.25rem;
      cursor: pointer;
      padding: 0.25rem;
      transition: transform 0.2s ease;
    }

    .btn-icon:hover {
      transform: scale(1.2);
    }

    tfoot {
      background: #f9fafb;
      font-weight: 600;
    }

    tfoot td {
      border-bottom: none;
    }

    /* Modal Styles */
    .modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal-content {
      background: white;
      border-radius: 15px;
      width: 90%;
      max-width: 600px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 1.5rem;
      border-bottom: 2px solid #f3f4f6;
    }

    .modal-header h3 {
      margin: 0;
    }

    .btn-close {
      background: none;
      border: none;
      font-size: 2rem;
      cursor: pointer;
      color: #9ca3af;
    }

    .modal-body {
      padding: 1.5rem;
    }

    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 0.75rem 0;
      border-bottom: 1px solid #f3f4f6;
    }

    .detail-row label {
      font-weight: 600;
      color: #374151;
    }

    .modal-footer {
      display: flex;
      justify-content: flex-end;
      gap: 1rem;
      padding: 1.5rem;
      border-top: 2px solid #f3f4f6;
    }

    .btn-secondary, .btn-primary {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-secondary {
      background: #f3f4f6;
      color: #374151;
    }

    .btn-primary {
      background: #000000;
      color: #FFD700;
    }

    .btn-primary:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .modal-large {
      max-width: 700px;
      max-height: 90vh;
      overflow-y: auto;
    }

    .service-form {
      padding: 1.5rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      margin-bottom: 0.5rem;
      font-weight: 600;
      color: #374151;
    }

    .required {
      color: #ef4444;
    }

    .form-input {
      width: 100%;
      padding: 0.75rem;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      font-size: 0.875rem;
      transition: border-color 0.2s;
    }

    .form-input:focus {
      outline: none;
      border-color: #000000;
    }

    textarea.form-input {
      resize: vertical;
      font-family: inherit;
    }

    .form-error {
      padding: 0.75rem;
      background: #fee2e2;
      border: 1px solid #fecaca;
      border-radius: 10px;
      color: #991b1b;
      margin-bottom: 1rem;
    }

    @media (max-width: 768px) {
      .filters {
        flex-direction: column;
      }

      .table-container {
        font-size: 0.875rem;
      }

      th, td {
        padding: 0.5rem;
      }

      .form-row {
        grid-template-columns: 1fr;
      }

      .modal-large {
        max-width: 95%;
      }
    }
  `]
})
export class VehicleServiceHistoryComponent implements OnInit {
  @Input() vehicleId!: string;

  serviceRecords: ServiceHistory[] = [];
  filteredRecords: ServiceHistory[] = [];
  loading = false;
  error: string | null = null;
  
  searchTerm = '';
  filterType = '';
  sortColumn = 'serviceDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  showViewModal = false;
  showFormModal = false;
  selectedRecord: ServiceHistory | null = null;
  
  editingRecord = false;
  currentRecord: any = {};
  saving = false;
  formError: string | null = null;

  constructor(private maintenanceService: VehicleMaintenanceService) {}

  ngOnInit(): void {
    this.loadServiceHistory();
  }

  loadServiceHistory(): void {
    if (!this.vehicleId) {
      this.error = 'Vehicle ID is required';
      return;
    }

    this.loading = true;
    this.error = null;

    this.maintenanceService.getServiceHistoryByVehicleId(this.vehicleId).subscribe({
      next: (records) => {
        this.serviceRecords = records;
        this.filteredRecords = records;
        this.sortRecords();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load service history: ' + err.message;
        this.loading = false;
      }
    });
  }

  filterRecords(): void {
    let filtered = this.serviceRecords;

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.description?.toLowerCase().includes(term) ||
        r.serviceProvider?.toLowerCase().includes(term) ||
        r.serviceType?.toLowerCase().includes(term)
      );
    }

    if (this.filterType) {
      filtered = filtered.filter(r => r.serviceType === this.filterType);
    }

    this.filteredRecords = filtered;
    this.sortRecords();
  }

  sort(column: string): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'desc';
    }
    this.sortRecords();
  }

  sortRecords(): void {
    this.filteredRecords.sort((a, b) => {
      const aVal = (a as any)[this.sortColumn];
      const bVal = (b as any)[this.sortColumn];
      
      if (aVal < bVal) return this.sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  getSortIcon(column: string): string {
    if (this.sortColumn !== column) return '⇅';
    return this.sortDirection === 'asc' ? '↑' : '↓';
  }

  getTotalCost(): number {
    return this.filteredRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
  }

  viewRecord(record: ServiceHistory): void {
    this.selectedRecord = record;
    this.showViewModal = true;
  }

  closeViewModal(): void {
    this.showViewModal = false;
    this.selectedRecord = null;
  }

  openAddForm(): void {
    this.editingRecord = false;
    this.currentRecord = {
      vehicleId: this.vehicleId,
      serviceDate: this.formatDateForInput(new Date()),
      serviceType: '',
      description: '',
      mileageAtService: 0,
      cost: 0,
      serviceProvider: '',
      nextServiceDate: '',
      nextServiceMileage: null,
      notes: '',
      invoiceNumber: ''
    };
    this.formError = null;
    this.showFormModal = true;
  }

  editRecord(record: ServiceHistory): void {
    this.editingRecord = true;
    this.currentRecord = {
      id: record.id,
      vehicleId: record.vehicleId,
      serviceDate: this.formatDateForInput(record.serviceDate),
      serviceType: record.serviceType,
      description: record.description,
      mileageAtService: record.mileageAtService,
      cost: record.cost,
      serviceProvider: record.serviceProvider,
      nextServiceDate: record.nextServiceDate ? this.formatDateForInput(record.nextServiceDate) : '',
      nextServiceMileage: record.nextServiceMileage || null,
      notes: record.notes || '',
      invoiceNumber: record.invoiceNumber || ''
    };
    this.formError = null;
    this.showFormModal = true;
    this.closeViewModal();
  }

  closeFormModal(): void {
    this.showFormModal = false;
    this.editingRecord = false;
    this.currentRecord = {};
    this.formError = null;
  }

  saveServiceRecord(): void {
    // Validate required fields
    if (!this.currentRecord.serviceDate || !this.currentRecord.serviceType || 
        !this.currentRecord.description || !this.currentRecord.mileageAtService || 
        this.currentRecord.cost === undefined || !this.currentRecord.serviceProvider) {
      this.formError = 'Please fill in all required fields';
      return;
    }

    this.saving = true;
    this.formError = null;

    const command: CreateServiceHistoryCommand = {
      vehicleId: this.vehicleId,
      serviceDate: this.formatDateForBackend(this.currentRecord.serviceDate),
      serviceType: this.currentRecord.serviceType,
      description: this.currentRecord.description,
      mileageAtService: Number(this.currentRecord.mileageAtService),
      cost: Number(this.currentRecord.cost),
      serviceProvider: this.currentRecord.serviceProvider,
      nextServiceDate: this.currentRecord.nextServiceDate ? 
        this.formatDateForBackend(this.currentRecord.nextServiceDate) : undefined,
      nextServiceMileage: this.currentRecord.nextServiceMileage ? 
        Number(this.currentRecord.nextServiceMileage) : undefined,
      notes: this.currentRecord.notes || undefined,
      invoiceNumber: this.currentRecord.invoiceNumber || undefined
    };

    if (this.editingRecord && this.currentRecord.id) {
      // Update existing record
      const updateCommand: UpdateServiceHistoryCommand = {
        id: this.currentRecord.id,
        ...command
      };
      
      this.maintenanceService.updateServiceHistory(this.currentRecord.id, updateCommand).subscribe({
        next: () => {
          this.saving = false;
          this.closeFormModal();
          this.loadServiceHistory();
        },
        error: (err) => {
          this.saving = false;
          this.formError = 'Failed to update service record: ' + err.message;
        }
      });
    } else {
      // Create new record
      this.maintenanceService.createServiceHistory(command).subscribe({
        next: () => {
          this.saving = false;
          this.closeFormModal();
          this.loadServiceHistory();
        },
        error: (err) => {
          this.saving = false;
          this.formError = 'Failed to create service record: ' + err.message;
        }
      });
    }
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

  private formatDateForBackend(date: any): string {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toISOString();
  }

  deleteRecord(record: ServiceHistory): void {
    if (!confirm(`Are you sure you want to delete this service record from ${this.formatDate(record.serviceDate)}?`)) {
      return;
    }

    this.maintenanceService.deleteServiceHistory(record.id!).subscribe({
      next: () => {
        this.serviceRecords = this.serviceRecords.filter(r => r.id !== record.id);
        this.filterRecords();
      },
      error: (err) => {
        alert('Failed to delete service record: ' + err.message);
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
