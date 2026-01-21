import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MzansiFleetLogoComponent } from '../shared/mzansi-fleet-logo.component';

@Component({
  selector: 'app-registration',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MzansiFleetLogoComponent
  ],
  template: `
    <div class="registration-container">
      <div class="background-decoration">
        <div class="circle circle-1"></div>
        <div class="circle circle-2"></div>
        <div class="circle circle-3"></div>
      </div>

      <mat-card class="registration-card">
        <div class="card-header">
          <app-mzansi-fleet-logo class="logo"></app-mzansi-fleet-logo>
          <h1 class="main-title">Join Mzansi Fleet</h1>
          <p class="subtitle">Select your account type to begin your journey</p>
        </div>

        <mat-card-content class="card-content">
          <div class="registration-grid">
            <!-- User Registration -->
            <button 
              mat-flat-button 
              class="registration-card-option user-card"
              routerLink="/user-registration">
              <div class="card-icon-wrapper user-icon">
                <mat-icon>person_outline</mat-icon>
              </div>
              <h3 class="card-title">User</h3>
              <p class="card-description">Book rides, post tenders, and access rental services</p>
              <div class="card-arrow">
                <mat-icon>arrow_forward</mat-icon>
              </div>
            </button>

            <!-- Owner/Staff Registration -->
            <button 
              mat-flat-button 
              class="registration-card-option owner-card"
              routerLink="/register">
              <div class="card-icon-wrapper owner-icon">
                <mat-icon>business_center</mat-icon>
              </div>
              <h3 class="card-title">Owner/Staff</h3>
              <p class="card-description">Manage fleet operations and oversee your business</p>
              <div class="card-arrow">
                <mat-icon>arrow_forward</mat-icon>
              </div>
            </button>

            <!-- Driver Registration -->
            <button 
              mat-flat-button 
              class="registration-card-option driver-card"
              routerLink="/driver-registration">
              <div class="card-icon-wrapper driver-icon">
                <mat-icon>drive_eta</mat-icon>
              </div>
              <h3 class="card-title">Driver</h3>
              <p class="card-description">Start earning by driving with our platform</p>
              <div class="card-arrow">
                <mat-icon>arrow_forward</mat-icon>
              </div>
            </button>

            <!-- Service Provider Registration -->
            <button 
              mat-flat-button 
              class="registration-card-option service-card"
              routerLink="/service-provider-registration">
              <div class="card-icon-wrapper service-icon">
                <mat-icon>build</mat-icon>
              </div>
              <h3 class="card-title">Service Provider</h3>
              <p class="card-description">Provide maintenance and repair services to fleets</p>
              <div class="card-arrow">
                <mat-icon>arrow_forward</mat-icon>
              </div>
            </button>

            <!-- Taxi Rank User Registration -->
            <button 
              mat-flat-button 
              class="registration-card-option rank-card"
              routerLink="/taxi-rank-user-registration">
              <div class="card-icon-wrapper rank-icon">
                <mat-icon>local_taxi</mat-icon>
              </div>
              <h3 class="card-title">Taxi Rank User</h3>
              <p class="card-description">Manage and coordinate taxi rank operations</p>
              <div class="card-arrow">
                <mat-icon>arrow_forward</mat-icon>
              </div>
            </button>
          </div>

          <div class="info-banner">
            <mat-icon class="info-icon">verified_user</mat-icon>
            <div class="info-content">
              <p class="info-title">Verification Required</p>
              <p class="info-text">All registrations undergo verification. Driver accounts require valid license documentation.</p>
            </div>
          </div>

          <div class="footer-section">
            <div class="divider"></div>
            <p class="login-text">
              Already have an account? 
              <a routerLink="/login" class="login-link">Sign in</a>
            </p>
          </div>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    /* Container & Background */
    .registration-container {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem 1rem;
      background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
      position: relative;
      overflow: hidden;
    }

    .background-decoration {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      z-index: 0;
    }

    .circle {
      position: absolute;
      border-radius: 50%;
      opacity: 0.08;
    }

    .circle-1 {
      width: 400px;
      height: 400px;
      background: linear-gradient(135deg, #D4AF37, #F4D03F);
      top: -100px;
      right: -100px;
      animation: float 20s ease-in-out infinite;
    }

    .circle-2 {
      width: 300px;
      height: 300px;
      background: linear-gradient(135deg, #2196F3, #64B5F6);
      bottom: -80px;
      left: -80px;
      animation: float 15s ease-in-out infinite reverse;
    }

    .circle-3 {
      width: 200px;
      height: 200px;
      background: linear-gradient(135deg, #9C27B0, #BA68C8);
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      animation: pulse 10s ease-in-out infinite;
    }

    @keyframes float {
      0%, 100% { transform: translateY(0) rotate(0deg); }
      50% { transform: translateY(-30px) rotate(10deg); }
    }

    @keyframes pulse {
      0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.08; }
      50% { transform: translate(-50%, -50%) scale(1.2); opacity: 0.12; }
    }

    /* Main Card */
    .registration-card {
      width: 100%;
      max-width: 900px;
      position: relative;
      z-index: 1;
      border-radius: 24px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.12);
      overflow: hidden;
      background: white;
      border: none;
    }

    /* Header Section */
    .card-header {
      text-align: center;
      padding: 3rem 2rem 2rem;
      background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
      border-bottom: 1px solid rgba(0, 0, 0, 0.06);
    }

    .logo {
      display: inline-block;
      margin-bottom: 1.5rem;
    }

    .main-title {
      font-size: 2rem;
      font-weight: 700;
      color: #212529;
      margin: 0 0 0.75rem;
      letter-spacing: -0.5px;
    }

    .subtitle {
      font-size: 1rem;
      color: #6c757d;
      margin: 0;
      font-weight: 400;
    }

    /* Content Area */
    .card-content {
      padding: 2.5rem 2rem;
    }

    /* Registration Grid */
    .registration-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2rem;
    }

    /* Registration Card Options */
    .registration-card-option {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem 1.5rem 1.75rem;
      border-radius: 16px;
      background: white;
      border: 2px solid #e9ecef;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      cursor: pointer;
      position: relative;
      overflow: visible;
      text-align: center;
      min-height: 240px;
      height: auto;
    }

    .registration-card-option::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: linear-gradient(135deg, transparent 0%, rgba(0, 0, 0, 0.02) 100%);
      opacity: 0;
      transition: opacity 0.3s ease;
    }

    .registration-card-option:hover {
      transform: translateY(-8px);
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
      border-color: transparent;
    }

    .registration-card-option:hover::before {
      opacity: 1;
    }

    .registration-card-option:active {
      transform: translateY(-4px);
    }

    /* Card Icons */
    .card-icon-wrapper {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 1.25rem;
      transition: transform 0.3s ease;
    }

    .registration-card-option:hover .card-icon-wrapper {
      transform: scale(1.1);
    }

    .card-icon-wrapper mat-icon {
      font-size: 32px;
      width: 32px;
      height: 32px;
      color: white;
    }

    .user-icon {
      background: linear-gradient(135deg, #4CAF50, #66BB6A);
      box-shadow: 0 4px 20px rgba(76, 175, 80, 0.3);
    }

    .user-card:hover {
      border-color: #4CAF50;
    }

    .owner-icon {
      background: linear-gradient(135deg, #9C27B0, #BA68C8);
      box-shadow: 0 4px 20px rgba(156, 39, 176, 0.3);
    }

    .owner-card:hover {
      border-color: #9C27B0;
    }

    .driver-icon {
      background: linear-gradient(135deg, #D4AF37, #F4D03F);
      box-shadow: 0 4px 20px rgba(212, 175, 55, 0.3);
    }

    .driver-card:hover {
      border-color: #D4AF37;
    }

    .service-icon {
      background: linear-gradient(135deg, #2196F3, #64B5F6);
      box-shadow: 0 4px 20px rgba(33, 150, 243, 0.3);
    }

    .service-card:hover {
      border-color: #2196F3;
    }

    .rank-icon {
      background: linear-gradient(135deg, #FF6F00, #FFA726);
      box-shadow: 0 4px 20px rgba(255, 111, 0, 0.3);
    }

    .rank-card:hover {
      border-color: #FF6F00;
    }

    /* Card Text */
    .card-title {
      font-size: 1.25rem;
      font-weight: 600;
      color: #212529;
      margin: 0 0 0.5rem;
      line-height: 1.3;
    }

    .card-description {
      font-size: 0.875rem;
      color: #6c757d;
      margin: 0 0 0.5rem;
      line-height: 1.6;
      flex: 1;
      padding-bottom: 0.25rem;
    }

    /* Card Arrow */
    .card-arrow {
      margin-top: 1rem;
      opacity: 0;
      transform: translateX(-10px);
      transition: all 0.3s ease;
    }

    .registration-card-option:hover .card-arrow {
      opacity: 1;
      transform: translateX(0);
    }

    .card-arrow mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #6c757d;
    }

    /* Info Banner */
    .info-banner {
      display: flex;
      align-items: flex-start;
      gap: 1rem;
      padding: 1.25rem 1.5rem;
      background: linear-gradient(135deg, #fff8e1 0%, #fffbf0 100%);
      border-radius: 12px;
      border-left: 4px solid #D4AF37;
      margin-bottom: 2rem;
    }

    .info-icon {
      color: #D4AF37;
      font-size: 24px;
      width: 24px;
      height: 24px;
      flex-shrink: 0;
    }

    .info-content {
      flex: 1;
    }

    .info-title {
      font-size: 0.95rem;
      font-weight: 600;
      color: #212529;
      margin: 0 0 0.25rem;
    }

    .info-text {
      font-size: 0.875rem;
      color: #6c757d;
      margin: 0;
      line-height: 1.5;
    }

    /* Footer Section */
    .footer-section {
      text-align: center;
    }

    .divider {
      height: 1px;
      background: linear-gradient(to right, transparent, #e9ecef 50%, transparent);
      margin-bottom: 1.5rem;
    }

    .login-text {
      font-size: 0.95rem;
      color: #6c757d;
      margin: 0;
    }

    .login-link {
      color: #D4AF37;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.3s ease;
      margin-left: 0.25rem;
    }

    .login-link:hover {
      color: #C5A028;
      text-decoration: underline;
    }

    /* Responsive Design */
    @media (max-width: 768px) {
      .registration-container {
        padding: 1rem 0.5rem;
      }

      .registration-card {
        border-radius: 16px;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
      }

      .card-header {
        padding: 2rem 1.5rem 1.5rem;
      }

      .main-title {
        font-size: 1.75rem;
      }

      .subtitle {
        font-size: 0.9rem;
      }

      .card-content {
        padding: 1.5rem 1rem;
      }

      .registration-grid {
        grid-template-columns: 1fr;
        gap: 1rem;
      }

      .registration-card-option {
        padding: 1.5rem 1rem 1.25rem;
        min-height: 200px;
        height: auto;
      }

      .card-icon-wrapper {
        width: 56px;
        height: 56px;
      }

      .card-icon-wrapper mat-icon {
        font-size: 28px;
        width: 28px;
        height: 28px;
      }

      .card-title {
        font-size: 1.1rem;
      }

      .card-description {
        font-size: 0.8rem;
      }

      .info-banner {
        padding: 1rem;
        gap: 0.75rem;
      }

      .circle-1, .circle-2, .circle-3 {
        display: none;
      }
    }

    @media (min-width: 769px) and (max-width: 1024px) {
      .registration-grid {
        grid-template-columns: repeat(2, 1fr);
      }
    }

    @media (min-width: 1025px) {
      .registration-grid {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    /* Accessibility */
    .registration-card-option:focus-visible {
      outline: 3px solid #D4AF37;
      outline-offset: 2px;
    }

    /* Print Styles */
    @media print {
      .background-decoration {
        display: none;
      }

      .registration-card {
        box-shadow: none;
        border: 1px solid #dee2e6;
      }
    }
  `]
})
export class RegistrationComponent {
  constructor(private router: Router) {}
}
