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
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { environment } from '../../../../environments/environment';

interface Marshal {
  id: string;
  firstName: string;
  lastName: string;
  marshalCode: string;
  email: string;
  phoneNumber: string;
  shiftStartTime: string;
  shiftEndTime: string;
  status: string;
}

@Component({
  selector: 'app-marshal-management',
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
    MatCheckboxModule,
    MatSnackBarModule
  ],
  templateUrl: './marshal-management.component.html',
  styleUrls: ['./marshal-management.component.scss']
})
export class MarshalManagementComponent implements OnInit {
  marshalForm!: FormGroup;
  marshals: Marshal[] = [];
  displayedColumns: string[] = ['marshalCode', 'name', 'email', 'phone', 'shift', 'status', 'actions'];
  loading = false;
  editMode = false;
  editingMarshalId: string | null = null;

  constructor(
    private fb: FormBuilder,
    private http: HttpClient,
    private snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.initializeForm();
    this.loadMarshals();
  }

  initializeForm(): void {
    this.marshalForm = this.fb.group({
      firstName: ['', Validators.required],
      lastName: ['', Validators.required],
      marshalCode: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      phoneNumber: ['', Validators.required],
      password: ['', [Validators.minLength(6)]],
      shiftStartTime: ['', Validators.required],
      shiftEndTime: ['', Validators.required],
      status: ['Active']
    });

    // Auto-generate marshal code
    this.marshalForm.get('firstName')?.valueChanges.subscribe(() => this.updateMarshalCode());
    this.marshalForm.get('lastName')?.valueChanges.subscribe(() => this.updateMarshalCode());
  }

  updateMarshalCode(): void {
    if (this.editMode) return;
    
    const firstName = this.marshalForm.get('firstName')?.value || '';
    const lastName = this.marshalForm.get('lastName')?.value || '';
    
    if (firstName && lastName) {
      const code = this.generateMarshalCode(firstName, lastName);
      this.marshalForm.patchValue({ marshalCode: code }, { emitEvent: false });
    }
  }

  generateMarshalCode(firstName: string, lastName: string): string {
    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    const namePart = lastName.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 6);
    const timestamp = Date.now().toString().slice(-6);
    return `MAR-${initials}${namePart}${timestamp}`;
  }

  loadMarshals(): void {
    this.loading = true;
    this.http.get<Marshal[]>(`${environment.apiUrl}/Marshals`)
      .subscribe({
        next: (marshals) => {
          this.marshals = marshals;
          this.loading = false;
        },
        error: (error) => {
          console.error('Error loading marshals:', error);
          this.snackBar.open('Failed to load marshals', 'Close', { duration: 3000 });
          this.loading = false;
        }
      });
  }

  onSubmit(): void {
    if (this.marshalForm.invalid) {
      this.snackBar.open('Please fill all required fields', 'Close', { duration: 3000 });
      return;
    }

    this.loading = true;
    const marshalData = this.marshalForm.value;

    const request = this.editMode
      ? this.http.put(`${environment.apiUrl}/Marshals/${this.editingMarshalId}`, marshalData)
      : this.http.post(`${environment.apiUrl}/Marshals`, marshalData);

    request.subscribe({
      next: () => {
        this.snackBar.open(
          this.editMode ? 'Marshal updated successfully!' : 'Marshal created successfully!',
          'Close',
          { duration: 3000 }
        );
        this.loadMarshals();
        this.resetForm();
        this.loading = false;
      },
      error: (error) => {
        console.error('Error saving marshal:', error);
        this.snackBar.open('Failed to save marshal', 'Close', { duration: 3000 });
        this.loading = false;
      }
    });
  }

  editMarshal(marshal: Marshal): void {
    this.editMode = true;
    this.editingMarshalId = marshal.id;
    
    this.marshalForm.patchValue({
      firstName: marshal.firstName,
      lastName: marshal.lastName,
      marshalCode: marshal.marshalCode,
      email: marshal.email,
      phoneNumber: marshal.phoneNumber,
      shiftStartTime: marshal.shiftStartTime,
      shiftEndTime: marshal.shiftEndTime,
      status: marshal.status
    });

    // Make password optional when editing
    this.marshalForm.get('password')?.clearValidators();
    this.marshalForm.get('password')?.updateValueAndValidity();
  }

  deleteMarshal(id: string): void {
    if (!confirm('Are you sure you want to delete this marshal?')) {
      return;
    }

    this.http.delete(`${environment.apiUrl}/Marshals/${id}`)
      .subscribe({
        next: () => {
          this.snackBar.open('Marshal deleted successfully!', 'Close', { duration: 3000 });
          this.loadMarshals();
        },
        error: (error) => {
          console.error('Error deleting marshal:', error);
          this.snackBar.open('Failed to delete marshal', 'Close', { duration: 3000 });
        }
      });
  }

  resetForm(): void {
    this.editMode = false;
    this.editingMarshalId = null;
    this.marshalForm.reset({ status: 'Active' });
    this.marshalForm.get('password')?.setValidators([Validators.minLength(6)]);
    this.marshalForm.get('password')?.updateValueAndValidity();
  }

  getMarshalFullName(marshal: Marshal): string {
    return `${marshal.firstName} ${marshal.lastName}`;
  }

  getShiftDisplay(marshal: Marshal): string {
    return `${marshal.shiftStartTime} - ${marshal.shiftEndTime}`;
  }
}
