import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IdentityService } from '../../services';
import { Tenant } from '../../models';

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="tenants">
      <div class="flex-between mb-2">
        <h1>Tenants</h1>
        <button class="btn btn-primary" (click)="showForm = !showForm">
          {{ showForm ? 'Cancel' : 'Add Tenant' }}
        </button>
      </div>

      <div class="error" *ngIf="error">{{ error }}</div>

      <div class="card" *ngIf="showForm">
        <h2>{{ editingTenant ? 'Edit Tenant' : 'New Tenant' }}</h2>
        <form (ngSubmit)="saveTenant()">
          <div class="form-group">
            <label>Name</label>
            <input type="text" [(ngModel)]="currentTenant.name" name="name" required>
          </div>
          
          <div class="form-group">
            <label>Contact Email</label>
            <input type="email" [(ngModel)]="currentTenant.contactEmail" name="contactEmail" required>
          </div>
          
          <div class="form-group">
            <label>Contact Phone</label>
            <input type="tel" [(ngModel)]="currentTenant.contactPhone" name="contactPhone">
          </div>
          
          <div class="flex gap-1">
            <button type="submit" class="btn btn-success">Save</button>
            <button type="button" class="btn btn-secondary" (click)="cancelEdit()">Cancel</button>
          </div>
        </form>
      </div>

      <div class="card">
        <div class="loading" *ngIf="loading">Loading tenants...</div>
        
        <table *ngIf="!loading && tenants.length > 0">
          <thead>
            <tr>
              <th>Name</th>
              <th>Contact Email</th>
              <th>Contact Phone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let tenant of tenants">
              <td>{{ tenant.name || 'N/A' }}</td>
              <td>{{ tenant.contactEmail || 'N/A' }}</td>
              <td>{{ tenant.contactPhone || 'N/A' }}</td>
              <td>
                <button class="btn btn-secondary" (click)="editTenant(tenant)">Edit</button>
                <button class="btn btn-danger" (click)="deleteTenant(tenant.id)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
        
        <p *ngIf="!loading && tenants.length === 0">No tenants found.</p>
      </div>
    </div>
  `,
  styles: [`
    table button {
      margin-right: 0.5rem;
      padding: 0.25rem 0.75rem;
    }
  `]
})
export class TenantsComponent implements OnInit {
  tenants: Tenant[] = [];
  currentTenant: Partial<Tenant> = this.getEmptyTenant();
  editingTenant = false;
  showForm = false;
  loading = false;
  error = '';

  constructor(private identityService: IdentityService) {}

  ngOnInit() {
    this.loadTenants();
  }

  loadTenants() {
    this.loading = true;
    this.error = '';
    this.identityService.getAllTenants().subscribe({
      next: (data) => {
        this.tenants = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load tenants: ' + err.message;
        this.loading = false;
      }
    });
  }

  saveTenant() {
    if (this.editingTenant && this.currentTenant.id) {
      this.identityService.updateTenant(this.currentTenant.id, this.currentTenant as Tenant).subscribe({
        next: () => {
          this.loadTenants();
          this.cancelEdit();
        },
        error: (err) => this.error = 'Failed to update tenant: ' + err.message
      });
    } else {
      this.identityService.createTenant(this.currentTenant as Tenant).subscribe({
        next: () => {
          this.loadTenants();
          this.cancelEdit();
        },
        error: (err) => this.error = 'Failed to create tenant: ' + err.message
      });
    }
  }

  editTenant(tenant: Tenant) {
    this.currentTenant = { ...tenant };
    this.editingTenant = true;
    this.showForm = true;
  }

  deleteTenant(id: string) {
    if (confirm('Are you sure you want to delete this tenant?')) {
      this.identityService.deleteTenant(id).subscribe({
        next: () => this.loadTenants(),
        error: (err) => this.error = 'Failed to delete tenant: ' + err.message
      });
    }
  }

  cancelEdit() {
    this.currentTenant = this.getEmptyTenant();
    this.editingTenant = false;
    this.showForm = false;
  }

  private getEmptyTenant(): Partial<Tenant> {
    return {
      name: '',
      contactEmail: '',
      contactPhone: ''
    };
  }
}
