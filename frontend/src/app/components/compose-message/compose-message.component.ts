import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule, FormControl } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map, startWith, debounceTime, switchMap } from 'rxjs/operators';
import { MessagingService, CreateMessage } from '../../services/messaging.service';
import { QuillModule } from 'ngx-quill';

export interface User {
  id: string;
  email: string;
  fullName?: string;
  role?: string;
}

export interface ComposeMessageData {
  receiverId?: string;
  receiverName?: string;
  subject?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  allowRecipientSearch?: boolean;
}

@Component({
  selector: 'app-compose-message',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatAutocompleteModule,
    MatProgressSpinnerModule,
    QuillModule
  ],
  templateUrl: './compose-message.component.html',
  styleUrls: ['./compose-message.component.css']
})
export class ComposeMessageComponent implements OnInit {
  messageForm: FormGroup;
  recipientControl = new FormControl<string | User>('');
  isSending = false;
  isSearching = false;
  filteredUsers: Observable<User[]>;
  users: User[] = [];
  selectedRecipient: User | null = null;
  allowRecipientSearch: boolean = false;
  private apiUrl = 'http://localhost:5000/api';

  // Quill editor configuration
  quillConfig = {
    toolbar: [
      ['bold', 'italic', 'underline', 'strike'],
      ['blockquote', 'code-block'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      [{ 'header': [1, 2, 3, 4, 5, 6, false] }],
      [{ 'color': [] }, { 'background': [] }],
      [{ 'align': [] }],
      ['link'],
      ['clean']
    ]
  };

  editorStyle = {
    height: '300px'
  };

  constructor(
    private fb: FormBuilder,
    private messagingService: MessagingService,
    private http: HttpClient,
    public dialogRef: MatDialogRef<ComposeMessageComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ComposeMessageData
  ) {
    this.messageForm = this.fb.group({
      subject: [data.subject || '', [Validators.required, Validators.maxLength(500)]],
      content: ['', [Validators.required, Validators.maxLength(5000)]]
    });

    this.allowRecipientSearch = data.allowRecipientSearch !== false;

    // If recipient is pre-filled, set it
    if (data.receiverId && data.receiverName) {
      this.selectedRecipient = {
        id: data.receiverId,
        email: data.receiverName,
        fullName: data.receiverName
      };
      this.recipientControl.setValue(data.receiverName);
      this.recipientControl.disable();
    }

    // Setup autocomplete
    this.filteredUsers = this.recipientControl.valueChanges.pipe(
      startWith(''),
      debounceTime(300),
      switchMap(value => {
        const searchTerm = typeof value === 'string' ? value : value?.fullName || value?.email || '';
        if (searchTerm.length < 2) {
          return new Observable<User[]>(observer => {
            observer.next([]);
            observer.complete();
          });
        }
        return this.searchUsers(searchTerm);
      })
    );
  }

  ngOnInit(): void {
    // Load initial users if recipient search is allowed and no pre-filled recipient
    if (this.allowRecipientSearch && !this.selectedRecipient) {
      this.loadUsers();
    }
  }

  loadUsers(): void {
    this.isSearching = true;
    this.http.get<any[]>(`${this.apiUrl}/Identity/users`).subscribe({
      next: (users) => {
        this.users = users.map(u => ({
          id: u.id,
          email: u.email,
          fullName: u.fullName || u.email,
          role: u.role
        }));
        this.isSearching = false;
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.isSearching = false;
      }
    });
  }

  searchUsers(searchTerm: string): Observable<User[]> {
    this.isSearching = true;
    return this.http.get<any[]>(`${this.apiUrl}/Identity/search?query=${encodeURIComponent(searchTerm)}`).pipe(
      map(users => {
        this.isSearching = false;
        return users.map(u => ({
          id: u.id,
          email: u.email,
          fullName: u.fullName || u.email,
          role: u.role
        }));
      })
    );
  }

  displayUser(user: User | null): string {
    if (!user) return '';
    return user.fullName || user.email;
  }

  onUserSelected(user: User): void {
    this.selectedRecipient = user;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSend(): void {
    if (!this.selectedRecipient) {
      alert('Please select a recipient');
      return;
    }

    if (this.messageForm.valid && !this.isSending) {
      this.isSending = true;

      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const senderId = user.id || user.userId;

      const message: CreateMessage = {
        senderId: senderId,
        receiverId: this.selectedRecipient.id,
        subject: this.messageForm.value.subject,
        content: this.messageForm.value.content,
        relatedEntityType: this.data.relatedEntityType,
        relatedEntityId: this.data.relatedEntityId
      };

      this.messagingService.sendMessage(message).subscribe({
        next: (result) => {
          this.dialogRef.close(result);
        },
        error: (error) => {
          console.error('Error sending message:', error);
          alert('Failed to send message. Please try again.');
          this.isSending = false;
        }
      });
    }
  }
}
