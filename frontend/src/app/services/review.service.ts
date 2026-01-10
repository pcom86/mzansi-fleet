import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { Review, CreateReviewCommand } from '../models';

@Injectable({
  providedIn: 'root'
})
export class ReviewService {
  private apiUrl = `${environment.apiUrl}/Reviews`;

  constructor(private http: HttpClient) {}

  create(command: CreateReviewCommand): Observable<Review> {
    return this.http.post<Review>(this.apiUrl, command);
  }
}
