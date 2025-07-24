import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private baseUrl = `${environment.apiUrl}/devices`;

  constructor(private http: HttpClient) {}

  getMyDevices(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/me`);
  }

  registerDevice(data: any): Observable<any> {
    return this.http.post<any>(this.baseUrl, data);
  }
}
