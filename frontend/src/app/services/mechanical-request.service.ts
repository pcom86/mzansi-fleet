import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { MechanicalRequest, CreateMechanicalRequestCommand } from '../models';

@Injectable({
  providedIn: 'root'
})
export class MechanicalRequestService {
  private apiUrl = `${environment.apiUrl}/MechanicalRequests`;

  constructor(private http: HttpClient) {}

  create(command: CreateMechanicalRequestCommand): Observable<MechanicalRequest> {
    return this.http.post<MechanicalRequest>(this.apiUrl, command);
  }
}
