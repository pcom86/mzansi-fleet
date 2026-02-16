import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Message {
  id: string;
  senderId: string;
  receiverId: string;
  subject: string;
  content: string;
  isRead: boolean;
  createdAt: Date;
  readAt?: Date;
  relatedEntityType?: string;
  relatedEntityId?: string;
  parentMessageId?: string;
  senderName?: string;
  receiverName?: string;
  senderEmail?: string;
  receiverEmail?: string;
}

export interface CreateMessage {
  senderId: string;
  receiverId: string;
  subject: string;
  content: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  parentMessageId?: string;
}

@Injectable({
  providedIn: 'root'
})
export class MessagingService {
  private apiUrl = `${environment.apiUrl}/Messages`;

  constructor(private http: HttpClient) { }

  getInbox(userId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/inbox/${userId}`);
  }

  getSent(userId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/sent/${userId}`);
  }

  getConversation(userId: string, otherUserId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/conversation/${userId}/${otherUserId}`);
  }

  getById(messageId: string): Observable<Message> {
    return this.http.get<Message>(`${this.apiUrl}/${messageId}`);
  }

  getUnreadCount(userId: string): Observable<number> {
    return this.http.get<number>(`${this.apiUrl}/unread-count/${userId}`);
  }

  sendMessage(message: CreateMessage): Observable<Message> {
    return this.http.post<Message>(this.apiUrl, message);
  }

  markAsRead(messageId: string): Observable<void> {
    return this.http.put<void>(`${this.apiUrl}/${messageId}/mark-as-read`, {});
  }

  deleteBySender(messageId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${messageId}/sender`);
  }

  deleteByReceiver(messageId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${messageId}/receiver`);
  }

  getRelatedMessages(entityType: string, entityId: string): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/related/${entityType}/${entityId}`);
  }
}
