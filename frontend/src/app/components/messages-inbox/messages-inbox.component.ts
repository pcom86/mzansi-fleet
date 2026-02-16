import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatBadgeModule } from '@angular/material/badge';
import { MessagingService, Message } from '../../services/messaging.service';
import { ComposeMessageComponent } from '../compose-message/compose-message.component';
import { MessageThreadComponent } from '../message-thread/message-thread.component';

@Component({
  selector: 'app-messages-inbox',
  standalone: true,
  imports: [
    CommonModule,
    MatTabsModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatDialogModule,
    MatBadgeModule
  ],
  templateUrl: './messages-inbox.component.html',
  styleUrls: ['./messages-inbox.component.css']
})
export class MessagesInboxComponent implements OnInit {
  inboxMessages: Message[] = [];
  sentMessages: Message[] = [];
  unreadCount = 0;
  displayedColumns: string[] = ['from', 'subject', 'date', 'status', 'actions'];
  displayedColumnsSent: string[] = ['to', 'subject', 'date', 'status', 'actions'];

  constructor(
    private messagingService: MessagingService,
    private dialog: MatDialog
  ) {}

  ngOnInit(): void {
    this.loadMessages();
  }

  loadMessages(): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id || user.userId;

    this.messagingService.getInbox(userId).subscribe({
      next: (messages) => {
        this.inboxMessages = messages;
        this.unreadCount = messages.filter(m => !m.isRead).length;
      },
      error: (error) => console.error('Error loading inbox:', error)
    });

    this.messagingService.getSent(userId).subscribe({
      next: (messages) => {
        this.sentMessages = messages;
      },
      error: (error) => console.error('Error loading sent messages:', error)
    });
  }

  openMessage(message: Message): void {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user.id || user.userId;

    // Mark as read if this is an unread inbox message
    if (!message.isRead && message.receiverId === userId) {
      this.messagingService.markAsRead(message.id).subscribe({
        next: () => {
          message.isRead = true;
          this.unreadCount = Math.max(0, this.unreadCount - 1);
        }
      });
    }

    // Open message thread
    const dialogRef = this.dialog.open(MessageThreadComponent, {
      width: '700px',
      data: { message }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result === 'reload') {
        this.loadMessages();
      }
    });
  }

  composeNewMessage(): void {
    const dialogRef = this.dialog.open(ComposeMessageComponent, {
      width: '600px',
      data: {
        allowRecipientSearch: true
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadMessages();
      }
    });
  }

  replyToMessage(message: Message): void {
    const dialogRef = this.dialog.open(ComposeMessageComponent, {
      width: '600px',
      data: {
        receiverId: message.senderId,
        receiverName: message.senderName || 'User',
        subject: `Re: ${message.subject}`,
        relatedEntityType: message.relatedEntityType,
        relatedEntityId: message.relatedEntityId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadMessages();
      }
    });
  }

  deleteMessage(message: Message, isSent: boolean): void {
    if (confirm('Are you sure you want to delete this message?')) {
      const deleteObservable = isSent 
        ? this.messagingService.deleteBySender(message.id)
        : this.messagingService.deleteByReceiver(message.id);

      deleteObservable.subscribe({
        next: () => {
          this.loadMessages();
        },
        error: (error) => console.error('Error deleting message:', error)
      });
    }
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleString();
  }

  stripHtml(html: string): string {
    const tmp = document.createElement('DIV');
    tmp.innerHTML = html;
    return tmp.textContent || tmp.innerText || '';
  }

  formatSenderName(message: Message): string {
    // Check if this is a system message (sender and receiver are the same)
    if (message.senderId === message.receiverId) {
      return 'Mzansi Fleet';
    }

    const senderName = message.senderName;
    if (!senderName) return 'Unknown';

    // If it's already an email, try to extract name part
    if (senderName.includes('@')) {
      return senderName.split('@')[0].replace(/[._-]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    // If it contains spaces, assume it's already "Name Surname" format
    if (senderName.includes(' ')) {
      return senderName;
    }

    // If it's a single word, capitalize it
    return senderName.charAt(0).toUpperCase() + senderName.slice(1).toLowerCase();
  }
}
