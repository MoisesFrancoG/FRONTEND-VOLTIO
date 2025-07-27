import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  AutomationRule,
  AutomationRuleCreateRequest,
  AutomationRuleUpdateRequest,
  AutomationRuleStatusUpdate,
  AutomationRuleScheduleUpdate,
} from '../models/automation-rule.model';
import { DeviceService, Device } from '../../devices/services/device.service';
import { AuthService } from '../../auth/services/auth.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AutomationRuleService {
  private apiUrl = 'https://voltioapi.acstree.xyz/api';

  constructor(
    private http: HttpClient,
    private deviceService: DeviceService,
    private authService: AuthService
  ) {}

  private getHttpOptions(): { headers: HttpHeaders } {
    const token = this.authService.getToken();
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      }),
    };
  }

  // 1. Crear una regla de automatización
  createRule(rule: AutomationRuleCreateRequest): Observable<AutomationRule> {
    console.log('🤖 Creando regla de automatización:', rule);
    return this.http.post<AutomationRule>(
      `${this.apiUrl}/automation-rules`,
      rule,
      this.getHttpOptions()
    );
  }

  // 2. Editar una regla existente
  updateRule(
    id: number,
    rule: AutomationRuleUpdateRequest
  ): Observable<AutomationRule> {
    console.log('📝 Actualizando regla de automatización:', { id, rule });
    return this.http.put<AutomationRule>(
      `${this.apiUrl}/automation-rules/${id}`,
      rule,
      this.getHttpOptions()
    );
  }

  // 3. Eliminar una regla
  deleteRule(id: number): Observable<void> {
    console.log('🗑️ Eliminando regla de automatización:', id);
    return this.http.delete<void>(
      `${this.apiUrl}/automation-rules/${id}`,
      this.getHttpOptions()
    );
  }

  // 4. Listar reglas del usuario autenticado
  getUserRules(): Observable<AutomationRule[]> {
    console.log('📋 Obteniendo reglas del usuario autenticado');
    return this.http.get<AutomationRule[]>(
      `${this.apiUrl}/automation-rules/me`,
      this.getHttpOptions()
    );
  }

  // 5. Activar/desactivar una regla
  updateRuleStatus(
    id: number,
    status: AutomationRuleStatusUpdate
  ): Observable<AutomationRule> {
    console.log('🔄 Actualizando estado de regla:', { id, status });
    // La API espera is_active como query parameter, no en el body
    return this.http.patch<AutomationRule>(
      `${this.apiUrl}/automation-rules/${id}/status?is_active=${status.is_active}`,
      {}, // Body vacío
      this.getHttpOptions()
    );
  }

  // 6. Configurar horarios personalizados
  updateRuleSchedule(
    id: number,
    schedule: AutomationRuleScheduleUpdate
  ): Observable<AutomationRule> {
    console.log('⏰ Actualizando horario de regla:', { id, schedule });
    return this.http.patch<AutomationRule>(
      `${this.apiUrl}/automation-rules/${id}/schedule`,
      schedule,
      this.getHttpOptions()
    );
  }

  // Obtener una regla específica por ID
  getRuleById(id: number): Observable<AutomationRule> {
    console.log('🔍 Obteniendo regla por ID:', id);
    return this.http.get<AutomationRule>(
      `${this.apiUrl}/automation-rules/${id}`,
      this.getHttpOptions()
    );
  }

  // Métodos auxiliares para dispositivos - usando DeviceService existente
  getSensorDevices(): Observable<Device[]> {
    console.log('📡 Obteniendo dispositivos de sensado');
    // Reutilizamos el método existente del DeviceService
    return this.deviceService.getMyDevices();
  }

  getActionDevices(): Observable<Device[]> {
    console.log('⚡ Obteniendo dispositivos de acción');
    // Reutilizamos el método existente del DeviceService
    return this.deviceService.getMyDevices();
  }

  getAllUserDevices(): Observable<Device[]> {
    console.log('🛰️ Obteniendo todos los dispositivos del usuario');
    // Usamos directamente el método del DeviceService
    return this.deviceService.getMyDevices();
  }
}
