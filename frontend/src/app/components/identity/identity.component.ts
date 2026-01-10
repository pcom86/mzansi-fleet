import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-identity',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="identity-module">
      <div class="identity-header">
        <h1>Identity Management</h1>
        <p>Manage tenants, users, and owner profiles</p>
      </div>
      
      <nav class="identity-nav">
        <a routerLink="/identity/tenants" routerLinkActive="active" class="nav-link">
          <span class="icon">🏢</span>
          <span>Tenants</span>
        </a>
        <a routerLink="/identity/users" routerLinkActive="active" class="nav-link">
          <span class="icon">👥</span>
          <span>Users</span>
        </a>
        <a routerLink="/identity/owner-profiles" routerLinkActive="active" class="nav-link">
          <span class="icon">👤</span>
          <span>Owner Profiles</span>
        </a>
      </nav>
      
      <div class="identity-content">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .identity-module {
      min-height: 100vh;
      background: #FFFFFF;
    }
    
    .identity-header {
      background: linear-gradient(135deg, #000000 0%, #1a1a1a 50%, #2d2d2d 100%);
      color: #D4AF37;
      padding: 40px 20px;
      text-align: center;
      box-shadow: 0 4px 12px rgba(212, 175, 55, 0.3);
      border-bottom: 3px solid #D4AF37;
    }
    
    .identity-header h1 {
      margin: 0 0 10px 0;
      font-weight: 600;
      font-size: 32px;
    }
    
    .identity-header p {
      margin: 0;
      opacity: 0.9;
    }
    
    .identity-nav {
      display: flex;
      justify-content: center;
      gap: 20px;
      padding: 20px;
      background: #FFFFFF;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border-bottom: 2px solid rgba(212, 175, 55, 0.3);
    }
    
    .nav-link {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 15px 30px;
      text-decoration: none;
      color: #000000;
      border-radius: 12px;
      transition: all 0.3s;
      border: 2px solid transparent;
      font-weight: 500;
    }
    
    .nav-link:hover {
      background-color: rgba(212, 175, 55, 0.1);
      transform: translateY(-2px);
      border-color: #D4AF37;
    }
    
    .nav-link.active {
      background: linear-gradient(135deg, #000000 0%, #1a1a1a 100%);
      color: #FFFFFF;
      border-color: #D4AF37;
      box-shadow: 0 4px 8px rgba(212, 175, 55, 0.3);
    }
    
    .nav-link .icon {
      font-size: 28px;
      margin-bottom: 5px;
    }
    
    .identity-content {
      padding: 20px;
      max-width: 1400px;
      margin: 0 auto;
    }
  `]
})
export class IdentityComponent {}
