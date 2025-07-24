import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth/services/auth.service';

export interface DeviceType {
  id: number;
  type_name: string;
  description: string;
}

export interface Device {
  created_at : string
  description: string;
  device_type_id: number;
  id: number;
  is_active: boolean;
  mac_address: string;
  name: string;
  user_id: number;

}

@Injectable({ providedIn: 'root' })
export class DeviceService {
  private baseUrl = `${environment.apiUrl}/devices`;

  constructor(private http: HttpClient, private authService: AuthService) {}

  getMyDevices(): Observable<Device[]> {
    const headers = this.getAuthHeaders();
    return this.http.get<Device[]>(`${this.baseUrl}/me`, { headers });
  }

  registerDevice(data: any): Observable<any> {
    console.log(this.baseUrl + '/', data);
    const headers = this.getAuthHeaders();
    return this.http.post<any>(this.baseUrl, data, { headers });
  }

  // Método helper para obtener headers con autenticación
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();

    if (!token) {
      throw new Error(
        'No hay token de autenticación disponible. Por favor, inicia sesión.'
      );
    }

    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      accept: 'application/json',
    });
  }
}
