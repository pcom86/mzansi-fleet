import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

interface RankOperation {
  id: string;
  type: string;
  title: string;
  description: string;
  status: 'active' | 'completed' | 'pending';
  priority: 'high' | 'medium' | 'low';
  createdAt: string;
  assignedTo?: string;
}

@Component({
  selector: 'app-marshal-operations',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatToolbarModule,
    MatListModule,
    MatChipsModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './marshal-operations.component.html',
  styleUrls: ['./marshal-operations.component.scss']
})
export class MarshalOperationsComponent implements OnInit {
  operations: RankOperation[] = [];
  loading = false;
  userData: any;
  marshalProfile: any;

  constructor(
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit(): void {
    const user = localStorage.getItem('user');
    if (user) {
      this.userData = JSON.parse(user);
      this.loadMarshalProfile();
    }
  }

  loadMarshalProfile(): void {
    const url = `${environment.apiUrl}/TaxiRankUsers/marshals?tenantId=${this.userData.tenantId}`;

    this.http.get<any[]>(url).subscribe({
      next: (marshals) => {
        this.marshalProfile = marshals.find(m => m.userId === this.userData.userId);
        if (this.marshalProfile) {
          this.loadOperations();
        }
      },
      error: (error) => {
        console.error('Error loading marshal profile:', error);
      }
    });
  }

  loadOperations(): void {
    this.loading = true;

    // For now, create some sample operations
    // In a real implementation, this would come from an API
    this.operations = [
      {
        id: '1',
        type: 'vehicle_assignment',
        title: 'Assign Vehicle to Route',
        description: 'Assign available vehicle ABC-123 to Route 5 for morning shift',
        status: 'pending',
        priority: 'high',
        createdAt: new Date().toISOString(),
        assignedTo: this.marshalProfile?.name
      },
      {
        id: '2',
        type: 'driver_reassignment',
        title: 'Driver Reassignment',
        description: 'Reassign Driver John Doe from Route 3 to Route 7 due to vehicle maintenance',
        status: 'active',
        priority: 'medium',
        createdAt: new Date().toISOString(),
        assignedTo: this.marshalProfile?.name
      },
      {
        id: '3',
        type: 'queue_management',
        title: 'Manage Passenger Queue',
        description: 'Review and optimize passenger queue for Route 2 during peak hours',
        status: 'completed',
        priority: 'low',
        createdAt: new Date().toISOString(),
        assignedTo: this.marshalProfile?.name
      }
    ];

    this.loading = false;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'primary';
      case 'completed': return 'accent';
      case 'pending': return 'warn';
      default: return 'basic';
    }
  }

  getPriorityColor(priority: string): string {
    switch (priority) {
      case 'high': return 'warn';
      case 'medium': return 'accent';
      case 'low': return 'primary';
      default: return 'basic';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  goToDashboard(): void {
    this.router.navigate(['/marshal-dashboard']);
  }

  executeOperation(operation: RankOperation): void {
    // In a real implementation, this would call an API to execute the operation
    console.log('Executing operation:', operation);
    // For now, just mark as completed
    operation.status = 'completed';
  }
}