import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dispatch-dialog',
  template: `
    <h2 mat-dialog-title>Dispatch Vehicle</h2>
    <mat-dialog-content>
      <p>Dispatching: {{data.vehicleRegistration}}</p>
      <mat-form-field appearance="outline" style="width: 100%; margin-top: 16px;">
        <mat-label>Passenger Count</mat-label>
        <input matInput type="number" [(ngModel)]="passengerCount" min="0" max="20">
      </mat-form-field>
      <mat-form-field appearance="outline" style="width: 100%; margin-top: 16px;">
        <mat-label>Priority</mat-label>
        <mat-select [(ngModel)]="priority">
          <mat-option value="Normal">Normal</mat-option>
          <mat-option value="High">High</mat-option>
          <mat-option value="Urgent">Urgent</mat-option>
        </mat-select>
      </mat-form-field>
      <mat-form-field appearance="outline" style="width: 100%; margin-top: 16px;">
        <mat-label>Notes (Optional)</mat-label>
        <textarea matInput [(ngModel)]="notes" rows="3"></textarea>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions>
      <button mat-button (click)="onNoClick()">Cancel</button>
      <button mat-raised-button color="primary" (click)="onYesClick()">Dispatch</button>
    </mat-dialog-actions>
  `,
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule
  ]
})
export class DispatchDialogComponent {
  passengerCount: number = 0;
  priority: string = 'Normal';
  notes: string = '';

  constructor(
    public dialogRef: MatDialogRef<DispatchDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { vehicleRegistration: string },
    private snackBar: MatSnackBar
  ) {}

  onNoClick(): void {
    this.dialogRef.close();
  }

  onYesClick(): void {
    if (this.passengerCount < 0) {
      this.snackBar.open('Please enter a valid passenger count', 'Close', { duration: 3000 });
      return;
    }

    const result = {
      passengerCount: this.passengerCount,
      priority: this.priority,
      notes: this.notes
    };

    this.dialogRef.close(result);
  }
}
