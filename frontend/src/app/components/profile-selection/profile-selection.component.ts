import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MzansiFleetLogoComponent } from '../shared/mzansi-fleet-logo.component';

interface ProfileType {
  type: string;
  title: string;
  description: string;
  icon: string;
  route: string;
  color: string;
}

@Component({
  selector: 'app-profile-selection',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MzansiFleetLogoComponent
  ],
  template: `
    <div class="selection-container">
      <div class="header-section">
        <app-mzansi-fleet-logo></app-mzansi-fleet-logo>
        <h1>Create Your Profile</h1>
        <p class="subtitle">Select the type of profile you want to create</p>
      </div>

      <div class="profile-cards">
        <mat-card 
          *ngFor="let profile of profileTypes" 
          class="profile-card"
          [class.owner-card]="profile.type === 'owner'"
          (click)="selectProfile(profile)">
          <mat-card-header>
            <div class="card-icon" [style.background]="profile.color">
              <mat-icon>{{ profile.icon }}</mat-icon>
            </div>
          </mat-card-header>
          <mat-card-content>
            <h2>{{ profile.title }}</h2>
            <p>{{ profile.description }}</p>
          </mat-card-content>
          <mat-card-actions>
            <button mat-raised-button color="primary" class="full-width">
              Create {{ profile.title }}
              <mat-icon>arrow_forward</mat-icon>
            </button>
          </mat-card-actions>
        </mat-card>
      </div>

      <div class="back-section">
        <button mat-button routerLink="/login" class="back-button">
          <mat-icon>arrow_back</mat-icon>
          Back to Login
        </button>
      </div>
    </div>
  `,
  styles: [`
    .selection-container {
      min-height: 100vh;
      background: linear-gradient(135deg, #FFFFFF 0%, #f5f5f5 50%, #e8e8e8 100%);
      padding: 3rem 1rem;
      position: relative;
      overflow: hidden;
    }

    .selection-container::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: radial-gradient(circle at 70% 50%, rgba(212, 175, 55, 0.15) 0%, transparent 50%),
                  radial-gradient(circle at 30% 80%, rgba(0, 0, 0, 0.05) 0%, transparent 40%);
    }

    .header-section {
      text-align: center;
      margin-bottom: 3rem;
      position: relative;
      z-index: 1;
    }

    app-mzansi-fleet-logo {
      display: block;
      margin: 0 auto 1.5rem;
    }

    h1 {
      font-size: 2.5rem;
      color: #000000;
      margin-bottom: 0.5rem;
      font-weight: 600;
    }

    .subtitle {
      color: #495057;
      font-size: 1.1rem;
      margin: 0;
    }

    .profile-cards {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 2rem;
      max-width: 1200px;
      margin: 0 auto;
      padding: 0 1rem;
      position: relative;
      z-index: 1;
    }

    .profile-card {
      cursor: pointer;
      transition: all 0.3s ease;
      border: 3px solid transparent;
      border-radius: 16px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      background: #FFFFFF;
      min-height: 300px;
      display: flex;
      flex-direction: column;
    }

    .profile-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 12px 30px rgba(212, 175, 55, 0.3);
      border-color: #D4AF37;
    }

    .owner-card:hover {
      border-color: #D4AF37;
      box-shadow: 0 12px 30px rgba(212, 175, 55, 0.4);
    }

    mat-card-header {
      display: flex;
      justify-content: center;
      padding: 2rem 1rem 1rem;
    }

    .card-icon {
      width: 80px;
      height: 80px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .card-icon mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: #FFFFFF;
    }

    mat-card-content {
      text-align: center;
      padding: 1.5rem;
      flex: 1;
    }

    mat-card-content h2 {
      font-size: 1.5rem;
      color: #000000;
      margin-bottom: 0.75rem;
      font-weight: 600;
    }

    mat-card-content p {
      color: #6c757d;
      line-height: 1.6;
      margin: 0;
    }

    mat-card-actions {
      padding: 0 1.5rem 1.5rem;
      margin: 0;
    }

    .full-width {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 0.5rem;
      height: 48px;
      font-weight: 500;
    }

    .back-section {
      text-align: center;
      margin-top: 3rem;
      position: relative;
      z-index: 1;
    }

    .back-button {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      color: #000000;
      font-weight: 500;
    }

    .back-button:hover {
      color: #D4AF37;
    }

    @media (max-width: 768px) {
      .selection-container {
        padding: 2rem 0.5rem;
      }

      h1 {
        font-size: 2rem;
      }

      .profile-cards {
        grid-template-columns: 1fr;
        gap: 1.5rem;
      }
    }
  `]
})
export class ProfileSelectionComponent {
  profileTypes: ProfileType[] = [
    {
      type: 'owner',
      title: 'Fleet Owner',
      description: 'Register your company and manage your fleet operations. Ideal for business owners with multiple vehicles.',
      icon: 'business',
      route: '/onboarding',
      color: 'linear-gradient(135deg, #D4AF37 0%, #FFD700 100%)'
    },
    {
      type: 'driver',
      title: 'Driver',
      description: 'Sign up as a professional driver. Join our network and start receiving trip assignments.',
      icon: 'local_shipping',
      route: '/driver-registration',
      color: 'linear-gradient(135deg, #000000 0%, #2d2d2d 100%)'
    },
    {
      type: 'staff',
      title: 'Staff Member',
      description: 'Create a staff account to manage operations, dispatching, and support services.',
      icon: 'badge',
      route: '/identity/staff-profiles/create',
      color: 'linear-gradient(135deg, #495057 0%, #6c757d 100%)'
    },
    {
      type: 'mechanic',
      title: 'Mechanic',
      description: 'Register as a mobile mechanic or repair shop. Offer maintenance and repair services to fleet owners.',
      icon: 'build',
      route: '/mechanics/create',
      color: 'linear-gradient(135deg, #dc3545 0%, #ff6b6b 100%)'
    },
    {
      type: 'shop',
      title: 'Parts Shop',
      description: 'Register your parts shop or inventory. Supply vehicle parts and accessories to fleet owners.',
      icon: 'storefront',
      route: '/service-providers/new',
      color: 'linear-gradient(135deg, #28a745 0%, #4ade80 100%)'
    },
    {
      type: 'service-provider',
      title: 'Service Provider',
      description: 'Create an account to receive and manage maintenance job requests from fleet owners.',
      icon: 'engineering',
      route: '/service-provider-registration',
      color: 'linear-gradient(135deg, #0d6efd 0%, #4dabf7 100%)'
    }
  ];

  constructor(private router: Router) {}

  selectProfile(profile: ProfileType): void {
    this.router.navigate([profile.route]);
  }
}
