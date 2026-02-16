import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { ComposeMessageComponent } from '../compose-message/compose-message.component';

@Component({
  selector: 'app-send-message-button',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule
  ],
  template: `
    <button 
      mat-raised-button 
      [color]="color" 
      (click)="openComposeDialog()"
      [disabled]="!receiverId">
      <mat-icon>{{ icon }}</mat-icon>
      {{ buttonText }}
    </button>
  `,
  styles: [`
    button mat-icon {
      margin-right: 4px;
    }
  `]
})
export class SendMessageButtonComponent {
  @Input() receiverId!: string;
  @Input() receiverName!: string;
  @Input() subject?: string;
  @Input() relatedEntityType?: string;
  @Input() relatedEntityId?: string;
  @Input() buttonText: string = 'Send Message';
  @Input() color: string = 'accent';
  @Input() icon: string = 'send';

  constructor(private dialog: MatDialog) {}

  openComposeDialog(): void {
    const dialogRef = this.dialog.open(ComposeMessageComponent, {
      width: '600px',
      data: {
        receiverId: this.receiverId,
        receiverName: this.receiverName,
        subject: this.subject,
        relatedEntityType: this.relatedEntityType,
        relatedEntityId: this.relatedEntityId
      }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Message sent successfully:', result);
      }
    });
  }
}
