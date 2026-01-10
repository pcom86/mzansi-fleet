import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { StuffRequestService } from '../../services';
import { StuffRequest, CreateStuffRequest, StuffQuote } from '../../models';

@Component({
  selector: 'app-passenger-stuff-requests',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="stuff-requests-container">
      <div class="header">
        <h1>📦 My Stuff Requests</h1>
        <button class="btn-create" (click)="showCreateModal = true">
          ➕ New Request
        </button>
      </div>

      <div class="loading" *ngIf="loading">Loading...</div>
      <div class="error" *ngIf="error">{{ error }}</div>

      <!-- Requests List -->
      <div class="requests-list" *ngIf="!loading">
        <div *ngIf="requests.length === 0" class="empty-state">
          <div class="empty-icon">📦</div>
          <h3>No Requests Yet</h3>
          <p>Create your first stuff request to get quotes from vehicle owners</p>
        </div>

        <div *ngFor="let request of requests" class="request-card" [class]="'status-' + request.status?.toLowerCase()">
          <div class="request-header">
            <div class="request-title">
              <h3>{{ request.itemDescription }}</h3>
              <span class="status-badge" [class]="'status-' + request.status?.toLowerCase()">
                {{ request.status }}
              </span>
            </div>
            <div class="request-actions">
              <button class="btn-view" (click)="viewRequest(request)">View Details</button>
              <button class="btn-cancel" *ngIf="request.status === 'Pending' || request.status === 'QuotesReceived'" 
                      (click)="cancelRequest(request.id!)">Cancel</button>
            </div>
          </div>

          <div class="request-body">
            <div class="request-info">
              <div class="info-item">
                <span class="icon">📍</span>
                <div>
                  <strong>Pickup:</strong> {{ request.pickupLocation }}
                </div>
              </div>
              <div class="info-item">
                <span class="icon">🎯</span>
                <div>
                  <strong>Delivery:</strong> {{ request.deliveryLocation }}
                </div>
              </div>
              <div class="info-item">
                <span class="icon">📅</span>
                <div>
                  <strong>Pickup Date:</strong> {{ formatDate(request.requestedPickupDate) }}
                </div>
              </div>
              <div class="info-item" *ngIf="request.itemCategory">
                <span class="icon">📦</span>
                <div>
                  <strong>Category:</strong> {{ request.itemCategory }}
                </div>
              </div>
            </div>

            <div class="quotes-summary" *ngIf="request.quotes && request.quotes.length > 0">
              <h4>Quotes Received: {{ request.quotes.length }}</h4>
              <div class="quotes-list">
                <div *ngFor="let quote of request.quotes" class="quote-item">
                  <div class="quote-price">R {{ quote.quotedPrice.toFixed(2) }}</div>
                  <div class="quote-details">
                    <span *ngIf="quote.notes">{{ quote.notes }}</span>
                    <span class="quote-status" [class]="'status-' + quote.status?.toLowerCase()">{{ quote.status }}</span>
                  </div>
                  <button class="btn-approve" 
                          *ngIf="quote.status === 'Pending' && request.status !== 'Approved'"
                          (click)="approveQuote(request.id!, quote.id!)">
                    ✓ Approve
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Create Request Modal -->
      <div class="modal-overlay" *ngIf="showCreateModal" (click)="showCreateModal = false">
        <div class="modal-content" (click)="$event.stopPropagation()">
          <button class="modal-close" (click)="showCreateModal = false">✕</button>
          <h2>Create Stuff Request</h2>

          <form (ngSubmit)="createRequest()" class="request-form">
            <div class="form-group">
              <label>Item Description *</label>
              <input type="text" [(ngModel)]="newRequest.itemDescription" name="itemDescription" 
                     placeholder="e.g., 2-seater couch, moving boxes" required>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Category</label>
                <select [(ngModel)]="newRequest.itemCategory" name="itemCategory">
                  <option value="Furniture">Furniture</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Food">Food & Groceries</option>
                  <option value="Documents">Documents</option>
                  <option value="Appliances">Appliances</option>
                  <option value="Building Materials">Building Materials</option>
                  <option value="General">General</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div class="form-group">
                <label>Size</label>
                <select [(ngModel)]="newRequest.size" name="size">
                  <option value="Small">Small (fits in sedan)</option>
                  <option value="Medium">Medium (fits in bakkie)</option>
                  <option value="Large">Large (requires truck)</option>
                </select>
              </div>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Estimated Weight (kg)</label>
                <input type="number" [(ngModel)]="newRequest.estimatedWeight" name="estimatedWeight" step="0.1">
              </div>

              <div class="form-group">
                <label>Priority</label>
                <select [(ngModel)]="newRequest.priority" name="priority">
                  <option value="Flexible">Flexible</option>
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent</option>
                </select>
              </div>
            </div>

            <div class="form-group">
              <label>Pickup Location *</label>
              <input type="text" [(ngModel)]="newRequest.pickupLocation" name="pickupLocation" 
                     placeholder="e.g., 123 Main St, Johannesburg" required>
            </div>

            <div class="form-group">
              <label>Delivery Location *</label>
              <input type="text" [(ngModel)]="newRequest.deliveryLocation" name="deliveryLocation" 
                     placeholder="e.g., 456 Oak Ave, Pretoria" required>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Requested Pickup Date *</label>
                <input type="date" [(ngModel)]="newRequest.requestedPickupDate" name="requestedPickupDate" required>
              </div>

              <div class="form-group">
                <label>Requested Delivery Date</label>
                <input type="date" [(ngModel)]="newRequest.requestedDeliveryDate" name="requestedDeliveryDate">
              </div>
            </div>

            <div class="form-group">
              <label>Special Instructions</label>
              <textarea [(ngModel)]="newRequest.specialInstructions" name="specialInstructions" 
                        rows="3" placeholder="Any special handling requirements..."></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" class="btn-cancel" (click)="showCreateModal = false">Cancel</button>
              <button type="submit" class="btn-save">Create Request</button>
            </div>
          </form>
        </div>
      </div>

      <!-- View Request Details Modal -->
      <div class="modal-overlay" *ngIf="showDetailsModal && selectedRequest" (click)="showDetailsModal = false">
        <div class="modal-content large" (click)="$event.stopPropagation()">
          <button class="modal-close" (click)="showDetailsModal = false">✕</button>
          <h2>Request Details</h2>

          <div class="details-content">
            <div class="detail-section">
              <h3>{{ selectedRequest.itemDescription }}</h3>
              <span class="status-badge" [class]="'status-' + selectedRequest.status?.toLowerCase()">
                {{ selectedRequest.status }}
              </span>

              <div class="detail-grid">
                <div class="detail-item">
                  <strong>Category:</strong> {{ selectedRequest.itemCategory || 'N/A' }}
                </div>
                <div class="detail-item">
                  <strong>Size:</strong> {{ selectedRequest.size || 'N/A' }}
                </div>
                <div class="detail-item">
                  <strong>Weight:</strong> {{ selectedRequest.estimatedWeight ? selectedRequest.estimatedWeight + ' kg' : 'N/A' }}
                </div>
                <div class="detail-item">
                  <strong>Priority:</strong> {{ selectedRequest.priority }}
                </div>
                <div class="detail-item">
                  <strong>Pickup:</strong> {{ selectedRequest.pickupLocation }}
                </div>
                <div class="detail-item">
                  <strong>Delivery:</strong> {{ selectedRequest.deliveryLocation }}
                </div>
                <div class="detail-item">
                  <strong>Pickup Date:</strong> {{ formatDate(selectedRequest.requestedPickupDate) }}
                </div>
                <div class="detail-item" *ngIf="selectedRequest.requestedDeliveryDate">
                  <strong>Delivery Date:</strong> {{ formatDate(selectedRequest.requestedDeliveryDate) }}
                </div>
              </div>

              <div *ngIf="selectedRequest.specialInstructions" class="special-instructions">
                <strong>Special Instructions:</strong>
                <p>{{ selectedRequest.specialInstructions }}</p>
              </div>
            </div>

            <div class="quotes-section" *ngIf="selectedRequest.quotes && selectedRequest.quotes.length > 0">
              <h3>Quotes ({{ selectedRequest.quotes.length }})</h3>
              <div class="quotes-list-detailed">
                <div *ngFor="let quote of selectedRequest.quotes" class="quote-card" [class]="'status-' + quote.status?.toLowerCase()">
                  <div class="quote-header">
                    <div class="quote-price-large">R {{ quote.quotedPrice.toFixed(2) }}</div>
                    <span class="quote-status-badge" [class]="'status-' + quote.status?.toLowerCase()">{{ quote.status }}</span>
                  </div>
                  <div class="quote-body">
                    <p *ngIf="quote.notes" class="quote-notes">{{ quote.notes }}</p>
                    <div class="quote-times" *ngIf="quote.estimatedPickupTime || quote.estimatedDeliveryTime">
                      <div *ngIf="quote.estimatedPickupTime">
                        <strong>Pickup:</strong> {{ formatDateTime(quote.estimatedPickupTime) }}
                      </div>
                      <div *ngIf="quote.estimatedDeliveryTime">
                        <strong>Delivery:</strong> {{ formatDateTime(quote.estimatedDeliveryTime) }}
                      </div>
                    </div>
                  </div>
                  <div class="quote-actions" *ngIf="quote.status === 'Pending' && selectedRequest.status !== 'Approved'">
                    <button class="btn-approve-large" (click)="approveQuote(selectedRequest.id!, quote.id!)">
                      ✓ Approve This Quote
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div *ngIf="!selectedRequest.quotes || selectedRequest.quotes.length === 0" class="no-quotes">
              <p>No quotes received yet. Vehicle owners will see your request and provide quotes.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .stuff-requests-container {
      padding: 2rem;
      max-width: 1400px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
    }

    .header h1 {
      font-size: 2rem;
      color: #000;
      margin: 0;
    }

    .btn-create {
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #000 0%, #1a1a1a 100%);
      color: #FFD700;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .btn-create:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .loading, .error {
      text-align: center;
      padding: 2rem;
      font-size: 1.125rem;
    }

    .error {
      color: #ef4444;
    }

    .empty-state {
      text-align: center;
      padding: 4rem 2rem;
      background: white;
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    }

    .empty-icon {
      font-size: 4rem;
      margin-bottom: 1rem;
    }

    .empty-state h3 {
      color: #000;
      margin-bottom: 0.5rem;
    }

    .empty-state p {
      color: #6b7280;
    }

    .requests-list {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .request-card {
      background: white;
      border-radius: 15px;
      padding: 1.5rem;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
      transition: all 0.3s ease;
    }

    .request-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 6px 25px rgba(0, 0, 0, 0.12);
    }

    .request-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 1rem;
    }

    .request-title {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .request-title h3 {
      margin: 0;
      color: #000;
      font-size: 1.25rem;
    }

    .status-badge {
      padding: 0.25rem 0.75rem;
      border-radius: 20px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .status-pending {
      background: #fef3c7;
      color: #92400e;
    }

    .status-quotesreceived {
      background: #dbeafe;
      color: #1e40af;
    }

    .status-approved {
      background: #d1fae5;
      color: #065f46;
    }

    .status-intransit {
      background: #e0e7ff;
      color: #3730a3;
    }

    .status-delivered {
      background: #d1fae5;
      color: #065f46;
    }

    .status-cancelled {
      background: #fee2e2;
      color: #991b1b;
    }

    .request-actions {
      display: flex;
      gap: 0.5rem;
    }

    .btn-view, .btn-cancel {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.875rem;
    }

    .btn-view {
      background: #f3f4f6;
      color: #374151;
    }

    .btn-view:hover {
      background: #e5e7eb;
    }

    .btn-cancel {
      background: #fee2e2;
      color: #991b1b;
    }

    .btn-cancel:hover {
      background: #fecaca;
    }

    .request-body {
      border-top: 1px solid #e5e7eb;
      padding-top: 1rem;
    }

    .request-info {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
      gap: 1rem;
      margin-bottom: 1rem;
    }

    .info-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .info-item .icon {
      font-size: 1.25rem;
    }

    .info-item strong {
      color: #000;
      display: block;
      margin-bottom: 0.25rem;
    }

    .quotes-summary {
      background: #f9fafb;
      padding: 1rem;
      border-radius: 10px;
      margin-top: 1rem;
    }

    .quotes-summary h4 {
      margin: 0 0 0.75rem 0;
      color: #000;
      font-size: 1rem;
    }

    .quotes-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .quote-item {
      background: white;
      padding: 0.75rem;
      border-radius: 8px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .quote-price {
      font-size: 1.25rem;
      font-weight: 700;
      color: #000;
    }

    .quote-details {
      flex: 1;
      margin: 0 1rem;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .quote-status {
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .btn-approve {
      padding: 0.5rem 1rem;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border: none;
      border-radius: 8px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      font-size: 0.875rem;
    }

    .btn-approve:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }

    /* Modal Styles */
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 1000;
      padding: 1rem;
    }

    .modal-content {
      background: white;
      border-radius: 20px;
      padding: 2rem;
      max-width: 600px;
      width: 100%;
      max-height: 90vh;
      overflow-y: auto;
      position: relative;
    }

    .modal-content.large {
      max-width: 900px;
    }

    .modal-close {
      position: absolute;
      top: 1rem;
      right: 1rem;
      background: #f3f4f6;
      border: none;
      width: 2rem;
      height: 2rem;
      border-radius: 50%;
      cursor: pointer;
      font-size: 1.25rem;
      line-height: 1;
    }

    .modal-content h2 {
      margin-top: 0;
      color: #000;
    }

    .request-form {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .form-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .form-group {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .form-group label {
      font-weight: 600;
      color: #374151;
      font-size: 0.875rem;
    }

    .form-group input,
    .form-group select,
    .form-group textarea {
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
      border-color: #000;
    }

    .modal-actions {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
    }

    .modal-actions .btn-cancel,
    .modal-actions .btn-save {
      flex: 1;
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
    }

    .modal-actions .btn-cancel {
      background: #e5e7eb;
      color: #374151;
    }

    .modal-actions .btn-save {
      background: linear-gradient(135deg, #000 0%, #1a1a1a 100%);
      color: #FFD700;
    }

    /* Details Modal */
    .details-content {
      display: flex;
      flex-direction: column;
      gap: 2rem;
    }

    .detail-section, .quotes-section {
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 1.5rem;
    }

    .detail-section:last-child,
    .quotes-section:last-child {
      border-bottom: none;
    }

    .detail-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 1rem;
      margin-top: 1rem;
    }

    .detail-item strong {
      color: #6b7280;
      font-size: 0.875rem;
      display: block;
      margin-bottom: 0.25rem;
    }

    .special-instructions {
      margin-top: 1rem;
      padding: 1rem;
      background: #f9fafb;
      border-radius: 8px;
    }

    .special-instructions strong {
      color: #000;
      display: block;
      margin-bottom: 0.5rem;
    }

    .quotes-list-detailed {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .quote-card {
      background: #f9fafb;
      padding: 1.5rem;
      border-radius: 12px;
    }

    .quote-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
    }

    .quote-price-large {
      font-size: 2rem;
      font-weight: 700;
      color: #000;
    }

    .quote-status-badge {
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
    }

    .quote-notes {
      color: #374151;
      margin-bottom: 1rem;
    }

    .quote-times {
      display: flex;
      gap: 2rem;
      font-size: 0.875rem;
      color: #6b7280;
    }

    .btn-approve-large {
      width: 100%;
      padding: 0.75rem 1.5rem;
      background: linear-gradient(135deg, #10b981 0%, #059669 100%);
      color: white;
      border: none;
      border-radius: 10px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.3s ease;
      margin-top: 1rem;
    }

    .btn-approve-large:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }

    .no-quotes {
      text-align: center;
      padding: 2rem;
      color: #6b7280;
      background: #f9fafb;
      border-radius: 12px;
    }
  `]
})
export class PassengerStuffRequestsComponent implements OnInit {
  requests: StuffRequest[] = [];
  loading = false;
  error: string | null = null;
  showCreateModal = false;
  showDetailsModal = false;
  selectedRequest: StuffRequest | null = null;

  newRequest: CreateStuffRequest = {
    passengerId: '',
    itemDescription: '',
    itemCategory: 'General',
    size: 'Medium',
    pickupLocation: '',
    deliveryLocation: '',
    requestedPickupDate: '',
    priority: 'Normal'
  };

  constructor(
    private stuffRequestService: StuffRequestService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Get passengerId from localStorage (assuming it's stored during login)
    const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
    this.newRequest.passengerId = currentUser.id || '';
    
    if (this.newRequest.passengerId) {
      this.loadRequests();
    } else {
      this.error = 'Please log in to view your stuff requests';
    }
  }

  loadRequests(): void {
    this.loading = true;
    this.error = null;

    this.stuffRequestService.getRequestsByPassenger(this.newRequest.passengerId).subscribe({
      next: (requests) => {
        this.requests = requests;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load requests: ' + err.message;
        this.loading = false;
      }
    });
  }

  createRequest(): void {
    this.stuffRequestService.createRequest(this.newRequest).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.resetForm();
        this.loadRequests();
      },
      error: (err) => {
        alert('Failed to create request: ' + err.message);
      }
    });
  }

  viewRequest(request: StuffRequest): void {
    this.selectedRequest = request;
    this.showDetailsModal = true;
  }

  approveQuote(requestId: string, quoteId: string): void {
    if (confirm('Are you sure you want to approve this quote? This action cannot be undone.')) {
      this.stuffRequestService.approveQuote(requestId, quoteId).subscribe({
        next: () => {
          this.showDetailsModal = false;
          this.loadRequests();
          alert('Quote approved successfully!');
        },
        error: (err) => {
          alert('Failed to approve quote: ' + err.message);
        }
      });
    }
  }

  cancelRequest(id: string): void {
    if (confirm('Are you sure you want to cancel this request?')) {
      this.stuffRequestService.cancelRequest(id).subscribe({
        next: () => {
          this.loadRequests();
          alert('Request cancelled successfully');
        },
        error: (err) => {
          alert('Failed to cancel request: ' + err.message);
        }
      });
    }
  }

  resetForm(): void {
    const passengerId = this.newRequest.passengerId;
    this.newRequest = {
      passengerId: passengerId,
      itemDescription: '',
      itemCategory: 'General',
      size: 'Medium',
      pickupLocation: '',
      deliveryLocation: '',
      requestedPickupDate: '',
      priority: 'Normal'
    };
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  formatDateTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-ZA', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
