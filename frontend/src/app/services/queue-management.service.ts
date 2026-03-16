import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import * as signalR from '@microsoft/signalr';

export interface QueueOverview {
  taxiRankId: string;
  date: string;
  routeQueues: RouteQueue[];
  totalStats: QueueStats;
}

export interface RouteQueue {
  routeId?: string;
  routeName?: string;
  totalVehicles: number;
  waitingVehicles: number;
  loadingVehicles: number;
  dispatchedVehicles: number;
  averageWaitTime: number;
  nextVehicle?: VehicleQueue;
}

export interface VehicleQueue {
  id: string;
  vehicleRegistration: string;
  driverName: string;
  queuePosition: number;
  joinedAt: string;
  passengerCapacity: number;
}

export interface QueueStats {
  waiting: number;
  loading: number;
  dispatched: number;
  removed: number;
  totalPassengers: number;
  averageWaitMinutes: number;
}

export interface Route {
  id: string;
  routeName: string;
  departureStation: string;
  destinationStation: string;
  standardFare: number;
  expectedDurationMinutes: number;
  maxPassengers: number;
  isActive: boolean;
}

export interface AvailableVehicle {
  vehicleId: string;
  registration: string;
  make: string;
  model: string;
  capacity: number;
  vehicleType: string;
  currentStatus: string;
}

export interface AssignVehicleDto {
  taxiRankId: string;
  routeId?: string;
  vehicleId: string;
  driverId?: string;
  tenantId: string;
  notes?: string;
}

export interface QueueAnalytics {
  periodStart: string;
  periodEnd: string;
  totalVehiclesProcessed: number;
  averageQueueLength: number;
  averageWaitTime: number;
  peakHours: HourlyStats[];
  routePerformance: RoutePerformance[];
  dailyTrends: DailyTrend[];
}

export interface HourlyStats {
  hour: number;
  dispatchCount: number;
  averageWaitTime: number;
}

export interface RoutePerformance {
  routeId?: string;
  routeName?: string;
  totalDispatches: number;
  averageWaitTime: number;
  utilizationRate: number;
}

export interface DailyTrend {
  date: string;
  totalVehicles: number;
  dispatchedVehicles: number;
  averageQueueLength: number;
  peakWaitTime: number;
}

@Injectable({
  providedIn: 'root'
})
export class QueueManagementService {
  private baseUrl = `${environment.apiUrl}/QueueManagement`;
  private hubConnection: signalR.HubConnection;
  private queueUpdates = new Subject<any>();
  private priorityDispatches = new Subject<any>();

  constructor(private http: HttpClient) {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl}/queueHub`)
      .withAutomaticReconnect()
      .build();

    this.setupSignalRListeners();
  }

  startConnection(): Promise<void> {
    return this.hubConnection.start()
      .then(() => console.log('Queue Hub connection started'))
      .catch((err: unknown) => console.error('Error starting Queue Hub connection:', err));
  }

  stopConnection(): Promise<void> {
    return this.hubConnection.stop()
      .then(() => console.log('Queue Hub connection stopped'))
      .catch((err: unknown) => console.error('Error stopping Queue Hub connection:', err));
  }

  joinQueueGroup(taxiRankId: string | undefined): void {
    if (!taxiRankId) return;
    this.hubConnection.invoke('JoinQueueGroup', taxiRankId)
      .catch((err: unknown) => console.error('Error joining queue group:', err));
  }

  leaveQueueGroup(taxiRankId: string | undefined): void {
    if (!taxiRankId) return;
    this.hubConnection.invoke('LeaveQueueGroup', taxiRankId)
      .catch((err: unknown) => console.error('Error leaving queue group:', err));
  }

  subscribeToRouteUpdates(taxiRankId: string | undefined, routeId: string | undefined): void {
    if (!taxiRankId || !routeId) return;
    this.hubConnection.invoke('SubscribeToRouteUpdates', taxiRankId, routeId)
      .catch((err: unknown) => console.error('Error subscribing to route updates:', err));
  }

  getQueueUpdates(): Observable<any> {
    return this.queueUpdates.asObservable();
  }

  getPriorityDispatches(): Observable<any> {
    return this.priorityDispatches.asObservable();
  }

  private setupSignalRListeners(): void {
    this.hubConnection.on('QueueUpdated', (data) => {
      this.queueUpdates.next(data);
    });

    this.hubConnection.on('PriorityDispatch', (data) => {
      this.priorityDispatches.next(data);
    });

    this.hubConnection.on('BulkQueueUpdate', (data) => {
      this.queueUpdates.next(data);
    });
  }

  // API Methods
  getQueueOverview(taxiRankId: string | undefined, date?: string): Observable<QueueOverview> {
    if (!taxiRankId) {
      throw new Error('Taxi rank ID is required');
    }
    const url = date ? `${this.baseUrl}/overview/${taxiRankId}?date=${date}` : `${this.baseUrl}/overview/${taxiRankId}`;
    return this.http.get<QueueOverview>(url);
  }

  getAvailableVehicles(taxiRankId: string | undefined): Observable<AvailableVehicle[]> {
    if (!taxiRankId) {
      throw new Error('Taxi rank ID is required');
    }
    return this.http.get<AvailableVehicle[]>(`${this.baseUrl}/vehicle-availability/${taxiRankId}`);
  }

  getRoutesForTaxiRank(taxiRankId: string | undefined): Observable<Route[]> {
    if (!taxiRankId) {
      throw new Error('Taxi rank ID is required');
    }
    return this.http.get<Route[]>(`${environment.apiUrl}/Routes?taxiRankId=${taxiRankId}`);
  }

  assignVehicleToQueue(assignment: AssignVehicleDto): Observable<any> {
    return this.http.post(`${this.baseUrl}/assign-vehicle`, assignment);
  }

  bulkAssignVehicles(taxiRankId: string, assignments: AssignVehicleDto[]): Observable<any> {
    return this.http.post(`${this.baseUrl}/bulk-assign`, { taxiRankId, assignments });
  }

  priorityDispatch(queueId: string, dispatchData: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/priority-dispatch/${queueId}`, dispatchData);
  }

  getQueueAnalytics(taxiRankId: string | undefined, startDate?: string, endDate?: string): Observable<QueueAnalytics> {
    if (!taxiRankId) {
      throw new Error('Taxi rank ID is required');
    }
    let url = `${this.baseUrl}/analytics/${taxiRankId}`;
    const params = [];
    
    if (startDate) params.push(`startDate=${startDate}`);
    if (endDate) params.push(`endDate=${endDate}`);
    
    if (params.length > 0) {
      url += '?' + params.join('&');
    }
    
    return this.http.get<QueueAnalytics>(url);
  }
}
