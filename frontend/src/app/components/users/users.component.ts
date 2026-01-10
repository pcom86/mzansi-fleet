import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IdentityService } from '../../services';
import { User, Tenant } from '../../models';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="users">
      <div class="flex-between mb-2">
        <h1>Users</h1>
        <button class="btn btn-primary" (click)="showForm = !showForm">
          {{ showForm ? 'Cancel' : 'Add User' }}
        </button>
      </div>

      <div class="error" *ngIf="error">{{ error }}</div>

      <div class="card" *ngIf="showForm">
        <h2>{{ editingUser ? 'Edit User' : 'New User' }}</h2>
        <form (ngSubmit)="saveUser()">
          <div class="form-group">
            <label>Tenant</label>
            <select [(ngModel)]="currentUser.tenantId" name="tenantId" required>
              <option value="">Select a tenant</option>
              <option *ngFor="let tenant of tenants" [value]="tenant.id">
                {{ tenant.name }}
              </option>
            </select>
          </div>
          
          <div class="form-group">
            <label>Email</label>
            <input type="email" [(ngModel)]="currentUser.email" name="email" required>
          </div>
          
          <div class="form-group">
            <label>Phone</label>
            <input type="tel" [(ngModel)]="currentUser.phone" name="phone">
          </div>
          
          <div class="form-group" *ngIf="!editingUser">
            <label>Password</label>
            <input type="password" [(ngModel)]="password" name="password" required>
          </div>
          
          <div class="form-group">
            <label>Role</label>
            <select [(ngModel)]="currentUser.role" name="role">
              <option value="Admin">Admin</option>
              <option value="Driver">Driver</option>
              <option value="Owner">Owner</option>
              <option value="Passenger">Passenger</option>
              <option value="Staff">Staff</option>
            </select>
          </div>
          
          <div class="form-group">
            <label>
              <input type="checkbox" [(ngModel)]="currentUser.isActive" name="isActive">
              Active
            </label>
          </div>
          
          <div class="flex gap-1">
            <button type="submit" class="btn btn-success">Save</button>
            <button type="button" class="btn btn-secondary" (click)="cancelEdit()">Cancel</button>
          </div>
        </form>
      </div>

      <div class="card">
        <div class="loading" *ngIf="loading">Loading users...</div>
        
        <table *ngIf="!loading && users.length > 0">
          <thead>
            <tr>
              <th>Email</th>
              <th>Phone</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let user of users">
              <td>{{ user.email || 'N/A' }}</td>
              <td>{{ user.phone || 'N/A' }}</td>
              <td>{{ user.role || 'N/A' }}</td>
              <td>{{ user.isActive ? 'Active' : 'Inactive' }}</td>
              <td>
                <button class="btn btn-secondary" (click)="editUser(user)">Edit</button>
                <button class="btn btn-danger" (click)="deleteUser(user.id)">Delete</button>
              </td>
            </tr>
          </tbody>
        </table>
        
        <p *ngIf="!loading && users.length === 0">No users found.</p>
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
export class UsersComponent implements OnInit {
  users: User[] = [];
  tenants: Tenant[] = [];
  currentUser: Partial<User> = this.getEmptyUser();
  password: string = '';
  editingUser = false;
  showForm = false;
  loading = false;
  error = '';

  constructor(private identityService: IdentityService) {}

  ngOnInit() {
    this.loadUsers();
    this.loadTenants();
  }

  loadTenants() {
    this.identityService.getAllTenants().subscribe({
      next: (data) => {
        this.tenants = data;
      },
      error: (err) => {
        console.error('Failed to load tenants:', err);
      }
    });
  }

  async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  loadUsers() {
    this.loading = true;
    this.error = '';
    this.identityService.getAllUsers().subscribe({
      next: (data) => {
        this.users = data;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load users: ' + err.message;
        this.loading = false;
      }
    });
  }

  async saveUser() {
    if (this.editingUser && this.currentUser.id) {
      this.identityService.updateUser(this.currentUser.id, this.currentUser as User).subscribe({
        next: () => {
          this.loadUsers();
          this.cancelEdit();
        },
        error: (err) => this.error = 'Failed to update user: ' + err.message
      });
    } else {
      // Hash password for new user
      const passwordHash = await this.hashPassword(this.password);
      const userToCreate = {
        ...this.currentUser,
        passwordHash: passwordHash
      };
      
      this.identityService.createUser(userToCreate as User).subscribe({
        next: () => {
          this.loadUsers();
          this.cancelEdit();
        },
        error: (err) => this.error = 'Failed to create user: ' + err.message
      });
    }
  }

  editUser(user: User) {
    this.currentUser = { ...user };
    this.editingUser = true;
    this.showForm = true;
  }

  deleteUser(id: string) {
    if (confirm('Are you sure you want to delete this user?')) {
      this.identityService.deleteUser(id).subscribe({
        next: () => this.loadUsers(),
        error: (err) => this.error = 'Failed to delete user: ' + err.message
      });
    }
  }

  cancelEdit() {
    this.currentUser = this.getEmptyUser();
    this.password = '';
    this.editingUser = false;
    this.showForm = false;
  }

  private getEmptyUser(): Partial<User> {
    return {
      tenantId: '',
      email: '',
      phone: '',
      role: 'Passenger',
      isActive: true
    };
  }
}
