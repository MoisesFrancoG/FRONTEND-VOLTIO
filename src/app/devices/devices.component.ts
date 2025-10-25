import { Component, OnInit } from '@angular/core';
import { DeviceService } from './services/device.service';
import { HttpClient, HttpHeaders } from '@angular/common/http';

@Component({
  selector: 'app-devices',
  templateUrl: './devices.component.html',
  styleUrls: ['./devices.component.css'],
})
export class DevicesComponent implements OnInit {
  devices: any[] = [];
  loading = false;
  error: string | null = null;
  showAddOptions = false;
  addMode: 'bluetooth' | 'manual' | null = null;

  // Propiedades para el control de dispositivos
  showControlModal = false;
  selectedDevice: any = null;
  isLoading = false;
  commandResponse: { success: boolean; message: string } | null = null;

  private apiUrl = 'https://voltioapi.acstree.xyz/api/v1';

  constructor(public deviceService: DeviceService, private http: HttpClient) {}

  ngOnInit() {
    this.loadDevices();
  }

  loadDevices() {
    this.loading = true;
    this.deviceService.getMyDevices().subscribe({
      next: (devices: any[]) => {
        this.devices = devices;
        this.loading = false;
      },
      error: (err: any) => {
        this.error = 'Error al cargar dispositivos';
        this.loading = false;
      },
    });
  }

  onDeviceRegistered() {
    this.loadDevices();
    this.addMode = null;
    this.showAddOptions = false;
  }

  // Métodos para el control de dispositivos
  openControlModal(device: any) {
    this.selectedDevice = device;
    this.showControlModal = true;
    this.commandResponse = null;
  }

  closeControlModal() {
    this.showControlModal = false;
    this.selectedDevice = null;
    this.commandResponse = null;
    this.isLoading = false;
  }

  // Control de relay para dispositivos tipo 1 (PZEM)
  sendRelayCommand(action: 'ON' | 'OFF') {
    if (!this.selectedDevice) return;

    this.isLoading = true;
    this.commandResponse = null;

    const encodedMac = encodeURIComponent(this.selectedDevice.mac_address);
    const url = `${this.apiUrl}/devices/${encodedMac}/command/relay`;

    const headers = new HttpHeaders({
      accept: 'application/json',
      'Content-Type': 'application/json',
    });

    const body = {
      action: action,
    };

    console.log('🔌 Enviando comando relay:', { url, body });

    this.http.post(url, body, { headers }).subscribe({
      next: (response: any) => {
        console.log('✅ Comando relay enviado exitosamente:', response);
        this.commandResponse = {
          success: true,
          message: `Relay ${
            action === 'ON' ? 'encendido' : 'apagado'
          } correctamente`,
        };
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('❌ Error enviando comando relay:', error);
        this.commandResponse = {
          success: false,
          message:
            'Error al enviar comando: ' +
            (error.error?.message || error.message || 'Error desconocido'),
        };
        this.isLoading = false;
      },
    });
  }

  // Control IR para dispositivos tipo 3 (RPI)
  sendIRCommand(action: 'ON' | 'OFF') {
    if (!this.selectedDevice) return;

    this.isLoading = true;
    this.commandResponse = null;

    const encodedMac = encodeURIComponent(this.selectedDevice.mac_address);
    const url = `${this.apiUrl}/devices/${encodedMac}/command/ir`;

    const headers = new HttpHeaders({
      accept: 'application/json',
      'Content-Type': 'application/json',
    });

    const body = {
      action: action,
    };

    console.log('📡 Enviando comando IR:', { url, body });

    this.http.post(url, body, { headers }).subscribe({
      next: (response: any) => {
        console.log('✅ Comando IR enviado exitosamente:', response);
        this.commandResponse = {
          success: true,
          message: `IR ${
            action === 'ON' ? 'activado' : 'desactivado'
          } correctamente`,
        };
        this.isLoading = false;
      },
      error: (error: any) => {
        console.error('❌ Error enviando comando IR:', error);
        this.commandResponse = {
          success: false,
          message:
            'Error al enviar comando: ' +
            (error.error?.message || error.message || 'Error desconocido'),
        };
        this.isLoading = false;
      },
    });
  }
}
