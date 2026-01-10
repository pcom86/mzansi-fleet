import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { VehicleMaintenanceService } from '../../../services';
import { MaintenanceHistory, CreateMaintenanceHistoryCommand, UpdateMaintenanceHistoryCommand } from '../../../models';

@Component({
  selector: 'app-vehicle-maintenance-history',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="maintenance-history">
      <div class="header">
        <h3>🔧 Maintenance History</h3>
        <button class="btn-add" (click)="openAddForm()">+ Add Maintenance Record</button>
      </div>

      <div class="loading" *ngIf="loading">Loading maintenance history...</div>
      <div class="error" *ngIf="error">{{ error }}</div>

      <div class="filters" *ngIf="!loading && maintenanceRecords.length > 0">
        <input 
          type="text" 
          placeholder="Search maintenance..." 
          [(ngModel)]="searchTerm"
          (ngModelChange)="filterRecords()"
          class="search-input">
        
        <select [(ngModel)]="filterStatus" (ngModelChange)="filterRecords()" class="filter-select">
          <option value="">All Status</option>
          <option value="Scheduled">Scheduled</option>
          <option value="In Progress">In Progress</option>
          <option value="Completed">Completed</option>
        </select>

        <select [(ngModel)]="filterPriority" (ngModelChange)="filterRecords()" class="filter-select">
          <option value="">All Priorities</option>
          <option value="Critical">Critical</option>
          <option value="High">High</option>
          <option value="Medium">Medium</option>
          <option value="Low">Low</option>
        </select>
      </div>

      <div class="table-container" *ngIf="!loading && !error">
        <div *ngIf="filteredRecords.length === 0" class="no-records">
          <span class="no-records-icon">🔧</span>
          <p>No maintenance records found</p>
          <button class="btn-add-secondary" (click)="openAddForm()">Add First Maintenance Record</button>
        </div>

        <table *ngIf="filteredRecords.length > 0">
          <thead>
            <tr>
              <th (click)="sort('maintenanceDate')">
                Date <span class="sort-icon">{{ getSortIcon('maintenanceDate') }}</span>
              </th>
              <th>Type</th>
              <th>Component</th>
              <th>Description</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Cost (R)</th>
              <th>Performed By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let record of filteredRecords">
              <td>{{ formatDate(record.maintenanceDate) }}</td>
              <td>
                <span class="type-badge">{{ record.maintenanceType }}</span>
              </td>
              <td>{{ record.component || 'N/A' }}</td>
              <td class="description">{{ record.description }}</td>
              <td>
                <span class="priority-badge" [class]="'priority-' + record.priority.toLowerCase()">
                  {{ record.priority }}
                </span>
              </td>
              <td>
                <span class="status-badge" [class]="'status-' + getStatusClass(record.status)">
                  {{ record.status }}
                </span>
              </td>
              <td class="cost">R{{ record.cost.toFixed(2) || '0.00' }}</td>
              <td>{{ record.performedBy || 'N/A' }}</td>
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
              <td colspan="6"><strong>Total Maintenance Cost:</strong></td>
              <td colspan="3"><strong>R{{ getTotalCost().toFixed(2) }}</strong></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>

    <!-- Add/Edit Maintenance Record Modal -->
    <div class="modal" *ngIf="showFormModal" (click)="closeFormModal()">
      <div class="modal-content modal-large" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>{{ editingRecord ? 'Edit Maintenance Record' : 'Add Maintenance Record' }}</h3>
          <button class="btn-close" (click)="closeFormModal()">×</button>
        </div>
        <form (ngSubmit)="saveMaintenanceRecord()" class="modal-body maintenance-form">
          <div class="form-row">
            <div class="form-group">
              <label>Maintenance Date <span class="required">*</span></label>
              <input 
                type="date" 
                [(ngModel)]="currentRecord.maintenanceDate" 
                name="maintenanceDate"
                required
                class="form-input">
            </div>

            <div class="form-group">
              <label>Maintenance Type <span class="required">*</span></label>
              <select 
                [(ngModel)]="currentRecord.maintenanceType" 
                name="maintenanceType"
                required
                class="form-input">
                <option value="">Select Type</option>
                <option value="Preventive">Preventive</option>
                <option value="Corrective">Corrective</option>
                <option value="Predictive">Predictive</option>
                <option value="Emergency">Emergency</option>
                <option value="Inspection">Inspection</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Component <span class="required">*</span></label>
              <input 
                type="text" 
                [(ngModel)]="currentRecord.component" 
                name="component"
                required
                placeholder="e.g., Engine, Brakes, Transmission"
                class="form-input">
            </div>

            <div class="form-group">
              <label>Priority <span class="required">*</span></label>
              <select 
                [(ngModel)]="currentRecord.priority" 
                name="priority"
                required
                class="form-input">
                <option value="">Select Priority</option>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Status <span class="required">*</span></label>
              <select 
                [(ngModel)]="currentRecord.status" 
                name="status"
                required
                class="form-input">
                <option value="">Select Status</option>
                <option value="Scheduled">Scheduled</option>
                <option value="In Progress">In Progress</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div class="form-group">
              <label>Mileage at Maintenance (km) <span class="required">*</span></label>
              <input 
                type="number" 
                [(ngModel)]="currentRecord.mileageAtMaintenance" 
                name="mileageAtMaintenance"
                required
                min="0"
                class="form-input">
            </div>
          </div>

          <div class="form-row">
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

            <div class="form-group">
              <label>Service Provider <span class="required">*</span></label>
              <input 
                type="text" 
                [(ngModel)]="currentRecord.serviceProvider" 
                name="serviceProvider"
                required
                placeholder="e.g., ABC Motors"
                class="form-input">
            </div>
          </div>

          <div class="form-group">
            <label>Description <span class="required">*</span></label>
            <textarea 
              [(ngModel)]="currentRecord.description" 
              name="description"
              required
              rows="3"
              placeholder="Describe the maintenance work..."
              class="form-input"></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Scheduled Date</label>
              <input 
                type="date" 
                [(ngModel)]="currentRecord.scheduledDate" 
                name="scheduledDate"
                class="form-input">
            </div>

            <div class="form-group">
              <label>Completed Date</label>
              <input 
                type="date" 
                [(ngModel)]="currentRecord.completedDate" 
                name="completedDate"
                class="form-input">
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Performed By</label>
              <input 
                type="text" 
                [(ngModel)]="currentRecord.performedBy" 
                name="performedBy"
                placeholder="e.g., John Smith"
                class="form-input">
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
              {{ saving ? 'Saving...' : (editingRecord ? 'Update' : 'Add') }} Maintenance Record
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- View Modal -->
    <div class="modal" *ngIf="showViewModal" (click)="closeViewModal()">
      <div class="modal-content" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>Maintenance Record Details</h3>
          <button class="btn-close" (click)="closeViewModal()">×</button>
        </div>
        <div class="modal-body" *ngIf="selectedRecord">
          <div class="detail-row">
            <label>Maintenance Date:</label>
            <span>{{ formatDate(selectedRecord.maintenanceDate) }}</span>
          </div>
          <div class="detail-row">
            <label>Maintenance Type:</label>
            <span class="type-badge">{{ selectedRecord.maintenanceType }}</span>
          </div>
          <div class="detail-row">
            <label>Component:</label>
            <span>{{ selectedRecord.component || 'N/A' }}</span>
          </div>
          <div class="detail-row">
            <label>Description:</label>
            <span>{{ selectedRecord.description }}</span>
          </div>
          <div class="detail-row">
            <label>Priority:</label>
            <span class="priority-badge" [class]="'priority-' + selectedRecord.priority.toLowerCase()">
              {{ selectedRecord.priority }}
            </span>
          </div>
          <div class="detail-row">
            <label>Status:</label>
            <span class="status-badge" [class]="'status-' + getStatusClass(selectedRecord.status)">
              {{ selectedRecord.status }}
            </span>
          </div>
          <div class="detail-row">
            <label>Mileage:</label>
            <span>{{ selectedRecord.mileageAtMaintenance.toLocaleString() }} km</span>
          </div>
          <div class="detail-row">
            <label>Cost:</label>
            <span>R{{ selectedRecord.cost.toFixed(2) }}</span>
          </div>
          <div class="detail-row">
            <label>Provider:</label>
            <span>{{ selectedRecord.serviceProvider || 'N/A' }}</span>
          </div>
          <div class="detail-row">
            <label>Performed By:</label>
            <span>{{ selectedRecord.performedBy || 'N/A' }}</span>
          </div>
          <div class="detail-row" *ngIf="selectedRecord.scheduledDate">
            <label>Scheduled Date:</label>
            <span>{{ formatDate(selectedRecord.scheduledDate) }}</span>
          </div>
          <div class="detail-row" *ngIf="selectedRecord.completedDate">
            <label>Completed Date:</label>
            <span>{{ formatDate(selectedRecord.completedDate) }}</span>
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
    .maintenance-history {
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
      flex-wrap: wrap;
    }

    .search-input, .filter-select {
      padding: 0.75rem;
      border: 2px solid #e5e7eb;
      border-radius: 10px;
      font-size: 0.875rem;
    }

    .search-input {
      flex: 1;
      min-width: 200px;
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
      white-space: nowrap;
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
      background: #dbeafe;
      color: #1e40af;
      text-transform: capitalize;
    }

    .priority-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
    }

    .priority-critical {
      background: #fef2f2;
      color: #991b1b;
    }

    .priority-high {
      background: #fff7ed;
      color: #c2410c;
    }

    .priority-medium {
      background: #fef3c7;
      color: #92400e;
    }

    .priority-low {
      background: #ecfccb;
      color: #365314;
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: capitalize;
    }

    .status-scheduled {
      background: #f3f4f6;
      color: #374151;
    }

    .status-in-progress {
      background: #dbeafe;
      color: #1e40af;
    }

    .status-completed {
      background: #d1fae5;
      color: #065f46;
    }

    .actions {
      display: flex;
      gap: 0.5rem;
      white-space: nowrap;
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

    .maintenance-form {
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
export class VehicleMaintenanceHistoryComponent implements OnInit {
  @Input() vehicleId!: string;

  maintenanceRecords: MaintenanceHistory[] = [];
  filteredRecords: MaintenanceHistory[] = [];
  loading = false;
  error: string | null = null;
  
  searchTerm = '';
  filterStatus = '';
  filterPriority = '';
  sortColumn = 'maintenanceDate';
  sortDirection: 'asc' | 'desc' = 'desc';

  showViewModal = false;
  showFormModal = false;
  selectedRecord: MaintenanceHistory | null = null;
  
  editingRecord = false;
  currentRecord: any = {};
  saving = false;
  formError: string | null = null;

  constructor(private maintenanceService: VehicleMaintenanceService) {}

  ngOnInit(): void {
    this.loadMaintenanceHistory();
  }

  loadMaintenanceHistory(): void {
    if (!this.vehicleId) {
      this.error = 'Vehicle ID is required';
      return;
    }

    this.loading = true;
    this.error = null;

    this.maintenanceService.getMaintenanceHistoryByVehicleId(this.vehicleId).subscribe({
      next: (records) => {
        this.maintenanceRecords = records;
        this.filteredRecords = records;
        this.sortRecords();
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load maintenance history: ' + err.message;
        this.loading = false;
      }
    });
  }

  filterRecords(): void {
    let filtered = this.maintenanceRecords;

    if (this.searchTerm) {
      const term = this.searchTerm.toLowerCase();
      filtered = filtered.filter(r => 
        r.description?.toLowerCase().includes(term) ||
        r.component?.toLowerCase().includes(term) ||
        r.maintenanceType?.toLowerCase().includes(term) ||
        r.performedBy?.toLowerCase().includes(term)
      );
    }

    if (this.filterStatus) {
      filtered = filtered.filter(r => r.status === this.filterStatus);
    }

    if (this.filterPriority) {
      filtered = filtered.filter(r => r.priority === this.filterPriority);
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

  getStatusClass(status: string): string {
    return status.toLowerCase().replace(' ', '-');
  }

  getTotalCost(): number {
    return this.filteredRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
  }

  viewRecord(record: MaintenanceHistory): void {
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
      maintenanceDate: this.formatDateForInput(new Date()),
      maintenanceType: '',
      component: '',
      description: '',
      mileageAtMaintenance: 0,
      cost: 0,
      serviceProvider: '',
      priority: '',
      status: '',
      scheduledDate: '',
      completedDate: '',
      performedBy: '',
      invoiceNumber: '',
      notes: ''
    };
    this.formError = null;
    this.showFormModal = true;
  }

  editRecord(record: MaintenanceHistory): void {
    this.editingRecord = true;
    this.currentRecord = {
      id: record.id,
      vehicleId: record.vehicleId,
      maintenanceDate: this.formatDateForInput(record.maintenanceDate),
      maintenanceType: record.maintenanceType,
      component: record.component,
      description: record.description,
      mileageAtMaintenance: record.mileageAtMaintenance,
      cost: record.cost,
      serviceProvider: record.serviceProvider,
      priority: record.priority,
      status: record.status,
      scheduledDate: record.scheduledDate ? this.formatDateForInput(record.scheduledDate) : '',
      completedDate: record.completedDate ? this.formatDateForInput(record.completedDate) : '',
      performedBy: record.performedBy || '',
      invoiceNumber: record.invoiceNumber || '',
      notes: record.notes || ''
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

  saveMaintenanceRecord(): void {
    // Validate required fields
    if (!this.currentRecord.maintenanceDate || !this.currentRecord.maintenanceType || 
        !this.currentRecord.component || !this.currentRecord.description || 
        !this.currentRecord.mileageAtMaintenance || this.currentRecord.cost === undefined || 
        !this.currentRecord.serviceProvider || !this.currentRecord.priority || 
        !this.currentRecord.status) {
      this.formError = 'Please fill in all required fields';
      return;
    }

    this.saving = true;
    this.formError = null;

    const command: any = {
      vehicleId: this.vehicleId,
      maintenanceDate: this.formatDateForBackend(this.currentRecord.maintenanceDate),
      maintenanceType: this.currentRecord.maintenanceType,
      component: this.currentRecord.component,
      description: this.currentRecord.description,
      mileageAtMaintenance: Number(this.currentRecord.mileageAtMaintenance),
      cost: Number(this.currentRecord.cost),
      serviceProvider: this.currentRecord.serviceProvider,
      priority: this.currentRecord.priority,
      status: this.currentRecord.status,
      scheduledDate: this.currentRecord.scheduledDate ? 
        this.formatDateForBackend(this.currentRecord.scheduledDate) : null,
      completedDate: this.currentRecord.completedDate ? 
        this.formatDateForBackend(this.currentRecord.completedDate) : null,
      performedBy: this.currentRecord.performedBy || null,
      invoiceNumber: this.currentRecord.invoiceNumber || null,
      notes: this.currentRecord.notes || null
    };

    if (this.editingRecord && this.currentRecord.id) {
      // Update existing record
      command.id = this.currentRecord.id;
      
      this.maintenanceService.updateMaintenanceHistory(this.currentRecord.id, command).subscribe({
        next: () => {
          this.saving = false;
          this.closeFormModal();
          this.loadMaintenanceHistory();
        },
        error: (err) => {
          this.saving = false;
          this.formError = 'Failed to update maintenance record: ' + err.message;
        }
      });
    } else {
      // Create new record
      this.maintenanceService.createMaintenanceHistory(command).subscribe({
        next: () => {
          this.saving = false;
          this.closeFormModal();
          this.loadMaintenanceHistory();
        },
        error: (err) => {
          this.saving = false;
          this.formError = 'Failed to create maintenance record: ' + err.message;
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

  deleteRecord(record: MaintenanceHistory): void {
    if (!confirm(`Are you sure you want to delete this maintenance record from ${this.formatDate(record.maintenanceDate)}?`)) {
      return;
    }

    this.maintenanceService.deleteMaintenanceHistory(record.id!).subscribe({
      next: () => {
        this.maintenanceRecords = this.maintenanceRecords.filter(r => r.id !== record.id);
        this.filterRecords();
      },
      error: (err) => {
        alert('Failed to delete maintenance record: ' + err.message);
      }
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
  }
}
