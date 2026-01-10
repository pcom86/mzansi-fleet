import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-create-driver-profile',
  standalone: true,
  imports: [CommonModule, RouterModule, MatCardModule, MatButtonModule, MatIconModule],
  template: `
    <div class="container">
      <mat-card>
        <mat-card-header>
          <mat-card-title>
            <mat-icon>local_shipping</mat-icon>
            Create Driver Profile
          </mat-card-title>
          <mat-card-subtitle>Register as a professional driver</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <div class="coming-soon">
            <mat-icon class="large-icon">construction</mat-icon>
            <h2>Coming Soon</h2>
            <p>Driver profile creation wizard is under development.</p>
            <p>Check back soon for this feature!</p>
          </div>
        </mat-card-content>
        <mat-card-actions>
          <button mat-button routerLink="/register">
            <mat-icon>arrow_back</mat-icon>
            Back to Profile Selection
          </button>
        </mat-card-actions>
      </mat-card>
    </div>
  `,
  styles: [`
    .container {
      max-width: 600px;
      margin: 3rem auto;
      padding: 1rem;
    }

    mat-card-header {
      background: linear-gradient(135deg, #000000 0%, #2d2d2d 100%);
      color: #D4AF37;
      padding: 1.5rem;
      border-radius: 16px 16px 0 0;
      margin: -16px -16px 1rem;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.75rem;
      color: #D4AF37;
    }

    mat-card-subtitle {
      color: rgba(212, 175, 55, 0.9);
      margin-top: 0.5rem;
    }

    .coming-soon {
      text-align: center;
      padding: 3rem 1rem;
    }

    .large-icon {
      font-size: 80px;
      width: 80px;
      height: 80px;
      color: #D4AF37;
      margin-bottom: 1rem;
    }

    .coming-soon h2 {
      color: #000000;
      margin-bottom: 1rem;
    }

    .coming-soon p {
      color: #6c757d;
      margin: 0.5rem 0;
    }

    mat-card-actions {
      padding: 1rem;
      display: flex;
      justify-content: center;
    }
  `]
})
export class CreateDriverProfileComponent {}
