import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ServiceProviderService } from '../../services/service-provider.service';
import { ServiceProvider } from '../../models/service-provider.model';

@Component({
  selector: 'app-service-provider-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    MatTooltipModule
  ],
  template: `
    <div class="service-providers-page">
      <div class="page-header">
        <h1><mat-icon>business</mat-icon> Service Providers</h1>
        <p>Manage service and maintenance provider profiles</p>
        <button mat-raised-button color="primary" routerLink="/service-providers/new">
          <mat-icon>add</mat-icon>
          Add Service Provider
        </button>
      </div>

      <div *ngIf="loading" class="loading-container">
        <mat-progress-spinner mode="indeterminate"></mat-progress-spinner>
        <p>Loading service providers...</p>
      </div>

      <mat-card *ngIf="!loading">
        <mat-card-header>
          <mat-card-title>All Service Providers ({{ providers.length }})</mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <div class="filter-chips">
            <mat-chip-set>
              <mat-chip (click)="filterProviders('all')" [highlighted]="currentFilter === 'all'">
                All ({{ providers.length }})
              </mat-chip>
              <mat-chip (click)="filterProviders('active')" [highlighted]="currentFilter === 'active'">
                Active ({{ getActiveCount() }})
              </mat-chip>
              <mat-chip (click)="filterProviders('inactive')" [highlighted]="currentFilter === 'inactive'">
                Inactive ({{ getInactiveCount() }})
              </mat-chip>
            </mat-chip-set>
          </div>

          <table mat-table [dataSource]="filteredProviders" class="providers-table">
            <ng-container matColumnDef="businessName">
              <th mat-header-cell *matHeaderCellDef>Business Name</th>
              <td mat-cell *matCellDef="let provider">
                <div class="provider-name">
                  <strong>{{ provider.businessName }}</strong>
                  <small>{{ provider.registrationNumber }}</small>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="contact">
              <th mat-header-cell *matHeaderCellDef>Contact</th>
              <td mat-cell *matCellDef="let provider">
                <div class="contact-info">
                  <div><mat-icon>person</mat-icon> {{ provider.contactPerson }}</div>
                  <div><mat-icon>phone</mat-icon> {{ provider.phone }}</div>
                  <div><mat-icon>email</mat-icon> {{ provider.email }}</div>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="serviceTypes">
              <th mat-header-cell *matHeaderCellDef>Service Types</th>
              <td mat-cell *matCellDef="let provider">
                <mat-chip-set>
                  <mat-chip *ngFor="let type of getServiceTypesArray(provider.serviceTypes)">
                    {{ type }}
                  </mat-chip>
                </mat-chip-set>
              </td>
            </ng-container>

            <ng-container matColumnDef="rating">
              <th mat-header-cell *matHeaderCellDef>Rating</th>
              <td mat-cell *matCellDef="let provider">
                <div class="rating">
                  <mat-icon [class.has-rating]="provider.rating">star</mat-icon>
                  <span>{{ provider.rating || 'N/A' }}</span>
                  <small *ngIf="provider.totalReviews">({{ provider.totalReviews }} reviews)</small>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="status">
              <th mat-header-cell *matHeaderCellDef>Status</th>
              <td mat-cell *matCellDef="let provider">
                <mat-chip [class.active]="provider.isActive" [class.inactive]="!provider.isActive">
                  {{ provider.isActive ? 'Active' : 'Inactive' }}
                </mat-chip>
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Actions</th>
              <td mat-cell *matCellDef="let provider">
                <div class="action-buttons">
                  <button mat-icon-button 
                          [routerLink]="['/service-providers', provider.id]"
                          matTooltip="View Details">
                    <mat-icon>visibility</mat-icon>
                  </button>
                  <button mat-icon-button 
                          [routerLink]="['/service-providers', provider.id, 'edit']"
                          matTooltip="Edit">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button 
                          (click)="toggleStatus(provider)"
                          [matTooltip]="provider.isActive ? 'Deactivate' : 'Activate'">
                    <mat-icon>{{ provider.isActive ? 'toggle_on' : 'toggle_off' }}</mat-icon>
                  </button>
                  <button mat-icon-button 
                          (click)="deleteProvider(provider)"
                          matTooltip="Delete"
                          color="warn">
                    <mat-icon>delete</mat-icon>
                  </button>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>

          <div *ngIf="filteredProviders.length === 0" class="no-data">
            <mat-icon>info</mat-icon>
            <p>No service providers found.</p>
            <button mat-raised-button color="primary" routerLink="/service-providers/new">
              Add Your First Service Provider
            </button>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .service-providers-page {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }

    .page-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }

    .page-header h1 {
      display: flex;
      align-items: center;
      gap: 10px;
      margin: 0;
    }

    .loading-container {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 40px;
    }

    .filter-chips {
      margin-bottom: 20px;
    }

    .providers-table {
      width: 100%;
    }

    .provider-name {
      display: flex;
      flex-direction: column;
    }

    .provider-name small {
      color: #666;
      font-size: 0.85em;
    }

    .contact-info {
      display: flex;
      flex-direction: column;
      gap: 5px;
      font-size: 0.9em;
    }

    .contact-info div {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .contact-info mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .rating {
      display: flex;
      align-items: center;
      gap: 5px;
    }

    .rating mat-icon.has-rating {
      color: #ffc107;
    }

    mat-chip.active {
      background-color: #4caf50;
      color: white;
    }

    mat-chip.inactive {
      background-color: #f44336;
      color: white;
    }

    .action-buttons {
      display: flex;
      gap: 5px;
    }

    .no-data {
      text-align: center;
      padding: 40px;
    }

    .no-data mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
      color: #999;
    }
  `]
})
export class ServiceProviderListComponent implements OnInit {
  providers: ServiceProvider[] = [];
  filteredProviders: ServiceProvider[] = [];
  loading = false;
  currentFilter = 'all';
  displayedColumns = ['businessName', 'contact', 'serviceTypes', 'rating', 'status', 'actions'];

  constructor(
    private serviceProviderService: ServiceProviderService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadProviders();
  }

  loadProviders(): void {
    this.loading = true;
    this.serviceProviderService.getAll().subscribe({
      next: (data) => {
        this.providers = data;
        this.applyFilter();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading service providers:', error);
        this.snackBar.open('Failed to load service providers', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  filterProviders(filter: string): void {
    this.currentFilter = filter;
    this.applyFilter();
  }

  applyFilter(): void {
    if (this.currentFilter === 'all') {
      this.filteredProviders = this.providers;
    } else if (this.currentFilter === 'active') {
      this.filteredProviders = this.providers.filter(p => p.isActive);
    } else if (this.currentFilter === 'inactive') {
      this.filteredProviders = this.providers.filter(p => !p.isActive);
    }
  }

  getActiveCount(): number {
    return this.providers.filter(p => p.isActive).length;
  }

  getInactiveCount(): number {
    return this.providers.filter(p => !p.isActive).length;
  }

  getServiceTypesArray(serviceTypes: string): string[] {
    return serviceTypes ? serviceTypes.split(',').map(s => s.trim()) : [];
  }

  toggleStatus(provider: ServiceProvider): void {
    this.serviceProviderService.toggleStatus(provider.id).subscribe({
      next: (updated) => {
        const index = this.providers.findIndex(p => p.id === provider.id);
        if (index !== -1) {
          this.providers[index] = updated;
          this.applyFilter();
        }
        this.snackBar.open(
          `Provider ${updated.isActive ? 'activated' : 'deactivated'} successfully`,
          'Close',
          { duration: 3000 }
        );
      },
      error: (error) => {
        console.error('Error toggling provider status:', error);
        this.snackBar.open('Failed to update provider status', 'Close', { duration: 3000 });
      }
    });
  }

  deleteProvider(provider: ServiceProvider): void {
    if (confirm(`Are you sure you want to delete ${provider.businessName}?`)) {
      this.serviceProviderService.delete(provider.id).subscribe({
        next: () => {
          this.providers = this.providers.filter(p => p.id !== provider.id);
          this.applyFilter();
          this.snackBar.open('Provider deleted successfully', 'Close', { duration: 3000 });
        },
        error: (error) => {
          console.error('Error deleting provider:', error);
          this.snackBar.open('Failed to delete provider', 'Close', { duration: 3000 });
        }
      });
    }
  }
}
