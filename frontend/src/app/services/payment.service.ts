import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { PaymentIntent, CreatePaymentIntentCommand } from '../models';

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private apiUrl = `${environment.apiUrl}/PaymentIntents`;

  constructor(private http: HttpClient) {}

  create(command: CreatePaymentIntentCommand): Observable<PaymentIntent> {
    return this.http.post<PaymentIntent>(this.apiUrl, command);
  }
}
