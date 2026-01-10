import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

interface Owner {
  id: string;
  userId: string;
  companyName: string;
  address: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  vehicleCount?: number;
}

interface TaxiRank {
  id: string;
  name: string;
  code: string;
}

interface OwnerAssignment {
  id: string;
  ownerId: string;
  ownerName: string;
  taxiRankId: string;
  taxiRankName: string;
  assignedDate: Date;
  status: string;
}

@Component({
  selector: 'app-owner-assignment',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatSelectModule,
    MatSnackBarModule
  ],
  templateUrl: './owner-assignment.component.html',
  styleUrls: ['./owner-assignment.component.scss']
})
export class OwnerAssignmentComponent implements OnInit {
  assignmentForm!: FormGroup;
  owners: Owner[] = [];
  taxiRanks: TaxiRank[] = [];
  assignments: OwnerAssignment[] = [];
  displayedColumns: string[] = ['ownerName', 'taxiRankName', 'assignedDate', 'status', 'actions'];
  loading = false;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadOwners();
    this.loadTaxiRanks();
    this.loadAssignments();
  }

  initializeForm(): void {
    this.assignmentForm = this.fb.group({
      ownerId: ['', Validators.required],
      taxiRankId: ['', Validators.required]
    });
  }

  loadOwners(): void {
    this.http.get<Owner[]>(`${environment.apiUrl}/OwnerProfiles`)
      .subscribe({
        next: (owners) => {
          this.owners = owners;
        },
        error: (error) => {
          console.error('Error loading owners:', error);
          this.snackBar.open('Failed to load vehicle owners', 'Close', { duration: 3000 });
        }
      });
  }

  loadTaxiRanks(): void {
    this.http.get<TaxiRank[]>(`${environment.apiUrl}/TaxiRanks`)
      .subscribe({
        next: (ranks) => {
          this.taxiRanks = ranks;
        },
        error: (error) => {
          console.error('Error loading taxi ranks:', error);
          this.snackBar.open('Failed to load taxi ranks', 'Close', { duration: 3000 });
        }
      });
  }

  loadAssignments(): void {
    this.loading = true;
    this.http.get<any[]>(`${environment.apiUrl}/OwnerAssignments`)
      .subscribe({
        next: (assignments) => {
          // Map backend navigation properties to display properties
          this.assignments = assignments.map(a => ({
            id: a.id,
            ownerId: a.ownerId,
            ownerName: a.owner ? `${a.owner.companyName} - ${a.owner.contactName}` : 'Unknown Owner',
            taxiRankId: a.taxiRankId,
            taxiRankName: a.taxiRank ? a.taxiRank.name : 'Unknown Rank',
            assignedDate: a.assignedDate,
            status: a.status
          }));
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading assignments:', error);
          this.snackBar.open('Failed to load owner assignments', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  onSubmit(): void {
    if (this.assignmentForm.invalid) {
      this.snackBar.open('Please select both owner and taxi rank', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    const assignmentData = {
      ...this.assignmentForm.value,
      assignedDate: new Date(),
      status: 'Active'
    };

    this.http.post(`${environment.apiUrl}/OwnerAssignments`, assignmentData)
      .subscribe({
        next: () => {
          this.snackBar.open('Owner assigned successfully!', 'Close', { duration: 3000 });
          this.loadAssignments();
          this.assignmentForm.reset();
          this.loading = false;
        },
        error: (error) => {
          console.error('Error assigning owner:', error);
          this.snackBar.open('Failed to assign owner', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  removeAssignment(id: string): void {
    if (!confirm('Are you sure you want to remove this assignment?')) {
      return;
    }

    this.http.delete(`${environment.apiUrl}/OwnerAssignments/${id}`)
      .subscribe({
        next: () => {
          this.snackBar.open('Assignment removed successfully!', 'Close', { duration: 3000 });
          this.loadAssignments();
        },
        error: (error) => {
          console.error('Error removing assignment:', error);
          this.snackBar.open('Failed to remove assignment', 'Close', { duration: 3000 });
        }
      });
  }

  getOwnerDisplayName(owner: Owner): string {
    return `${owner.companyName} - ${owner.contactName} (${owner.contactEmail})`;
  }
}
