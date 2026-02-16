import { Component, Inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MessagingService, Message } from '../../services/messaging.service';
import { ComposeMessageComponent } from '../compose-message/compose-message.component';

@Component({
  selector: 'app-message-thread',
  standalone: true,
  imports: [
    CommonModule,
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule
  ],
  templateUrl: './message-thread.component.html',
  styleUrls: ['./message-thread.component.css']
})
export class MessageThreadComponent implements OnInit {
  message: Message;
  currentUserId: string;

  constructor(
    private messagingService: MessagingService,
    private dialog: MatDialog,
    private sanitizer: DomSanitizer,
    public dialogRef: MatDialogRef<MessageThreadComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { message: Message }
  ) {
    this.message = data.message;
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    this.currentUserId = user.id || user.userId;
  }

  getSafeHtml(content: string): SafeHtml {
    return this.sanitizer.sanitize(1, content) || content;
  }

  ngOnInit(): void {
    // Mark as read if unread
    if (!this.message.isRead && this.message.receiverId === this.currentUserId) {
      this.messagingService.markAsRead(this.message.id).subscribe();
    }
  }

  reply(): void {
    const otherUserId = this.message.senderId === this.currentUserId 
      ? this.message.receiverId 
      : this.message.senderId;
    
    const otherUserName = this.message.senderId === this.currentUserId 
      ? this.message.receiverName 
      : this.message.senderName;

    const dialogRef = this.dialog.open(ComposeMessageComponent, {
      width: '600px',
      data: {
        receiverId: otherUserId,
        receiverName: otherUserName || 'User',
        subject: `Re: ${this.message.subject}`,
        relatedEntityType: this.message.relatedEntityType,
        relatedEntityId: this.message.relatedEntityId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.dialogRef.close('reload');
      }
    });
  }

  deleteMessage(): void {
    if (confirm('Are you sure you want to delete this message?')) {
      const isSender = this.message.senderId === this.currentUserId;
      const deleteObservable = isSender 
        ? this.messagingService.deleteBySender(this.message.id)
        : this.messagingService.deleteByReceiver(this.message.id);

      deleteObservable.subscribe({
        next: () => {
          this.dialogRef.close('reload');
        },
        error: (error) => console.error('Error deleting message:', error)
      });
    }
  }

  close(): void {
    this.dialogRef.close();
  }

  formatDate(date: Date): string {
    return new Date(date).toLocaleString();
  }
}
