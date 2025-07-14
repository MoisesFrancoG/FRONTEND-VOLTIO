import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import {
  BluetoothDevice,
  WiFiCredentials,
  ConfigurationStatus,
} from '../models/bluetooth.models';

@Injectable({
  providedIn: 'root',
})
export class BluetoothService {
  // UUIDs para el servicio y características
  private readonly SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
  private readonly WIFI_SSID_CHAR_UUID = '6d68efe5-04b6-4a85-abc4-c2670b7bf7fd';
  private readonly WIFI_PASS_CHAR_UUID = 'f27b53ad-c63d-49a0-8c0f-9f297e6cc520';
  private readonly SAVE_CONFIG_CHAR_UUID =
    'a87988b9-694c-479c-900e-95ab6e7b6c5f';

  // Estados observables
  private configurationStatusSubject = new BehaviorSubject<ConfigurationStatus>(
    ConfigurationStatus.SEARCHING
  );
  private connectedDeviceSubject = new BehaviorSubject<BluetoothDevice | null>(
    null
  );
  private errorMessageSubject = new BehaviorSubject<string>('');

  public configurationStatus$ = this.configurationStatusSubject.asObservable();
  public connectedDevice$ = this.connectedDeviceSubject.asObservable();
  public errorMessage$ = this.errorMessageSubject.asObservable();

  private bluetoothDevice: BluetoothDevice | null = null;
  private gattServer: BluetoothRemoteGATTServer | null = null;
  private configService: BluetoothRemoteGATTService | null = null;

  constructor() {
    this.checkBluetoothSupport();
  }

  private checkBluetoothSupport(): boolean {
    if (!navigator.bluetooth) {
      this.setError(
        'Web Bluetooth API no está disponible en este navegador. Use Chrome, Edge o Opera.'
      );
      return false;
    }
    return true;
  }

  async searchForDevices(): Promise<void> {
    if (!this.checkBluetoothSupport()) return;

    try {
      this.setStatus(ConfigurationStatus.SEARCHING);
      this.setError('');

      // Solicitar dispositivo con filtro específico
      const device = await navigator.bluetooth.requestDevice({
        filters: [
          {
            services: [this.SERVICE_UUID],
          },
        ],
        optionalServices: [this.SERVICE_UUID],
      });

      if (device) {
        this.bluetoothDevice = {
          id: device.id,
          name: device.name || 'Configuracion PZEM',
          connected: false,
          lastSeen: new Date(),
        };

        this.setStatus(ConfigurationStatus.FOUND);
        this.connectedDeviceSubject.next(this.bluetoothDevice);

        // Auto-conectar después de encontrar el dispositivo
        await this.connectToDevice();
      }
    } catch (error: any) {
      if (error.name === 'NotFoundError') {
        this.setError(
          'No se encontraron dispositivos. Asegúrese de que el ESP32 esté en modo configuración.'
        );
      } else if (error.name === 'SecurityError') {
        this.setError(
          'Error de seguridad. La API de Bluetooth requiere HTTPS.'
        );
      } else {
        this.setError(`Error al buscar dispositivos: ${error.message}`);
      }
      this.setStatus(ConfigurationStatus.ERROR);
    }
  }

  private async connectToDevice(): Promise<void> {
    if (!this.bluetoothDevice) return;

    try {
      this.setStatus(ConfigurationStatus.CONNECTING);

      // Obtener el dispositivo Bluetooth nativo
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [this.SERVICE_UUID] }],
      });

      // Conectar al servidor GATT
      this.gattServer = await device.gatt!.connect();

      // Obtener el servicio de configuración
      this.configService = await this.gattServer.getPrimaryService(
        this.SERVICE_UUID
      );

      this.bluetoothDevice.connected = true;
      this.setStatus(ConfigurationStatus.CONNECTED);
      this.connectedDeviceSubject.next(this.bluetoothDevice);

      // Configurar event listeners para desconexión
      device.addEventListener('gattserverdisconnected', () => {
        this.handleDisconnection();
      });
    } catch (error: any) {
      this.setError(`Error al conectar: ${error.message}`);
      this.setStatus(ConfigurationStatus.ERROR);
    }
  }

  async configureWiFi(credentials: WiFiCredentials): Promise<void> {
    if (!this.configService || !this.bluetoothDevice?.connected) {
      this.setError('No hay conexión activa con el dispositivo');
      return;
    }

    try {
      this.setStatus(ConfigurationStatus.CONFIGURING);

      // Obtener características
      const ssidChar = await this.configService.getCharacteristic(
        this.WIFI_SSID_CHAR_UUID
      );
      const passChar = await this.configService.getCharacteristic(
        this.WIFI_PASS_CHAR_UUID
      );
      const saveChar = await this.configService.getCharacteristic(
        this.SAVE_CONFIG_CHAR_UUID
      );

      // Enviar SSID
      await ssidChar.writeValue(new TextEncoder().encode(credentials.ssid));
      console.log('SSID enviado:', credentials.ssid);

      // Pequeña pausa entre envíos
      await this.delay(100);

      // Enviar contraseña
      await passChar.writeValue(new TextEncoder().encode(credentials.password));
      console.log('Contraseña enviada');

      // Pequeña pausa antes del comando final
      await this.delay(100);

      // Enviar comando de guardado
      await saveChar.writeValue(new TextEncoder().encode('SAVE'));
      console.log('Comando SAVE enviado');

      this.setStatus(ConfigurationStatus.CONFIGURED);

      // El dispositivo se reiniciará y perderemos la conexión
      setTimeout(() => {
        this.handleDisconnection();
      }, 2000);
    } catch (error: any) {
      this.setError(`Error al configurar WiFi: ${error.message}`);
      this.setStatus(ConfigurationStatus.ERROR);
    }
  }

  private handleDisconnection(): void {
    if (this.bluetoothDevice) {
      this.bluetoothDevice.connected = false;
      this.connectedDeviceSubject.next(this.bluetoothDevice);
    }

    this.gattServer = null;
    this.configService = null;

    // Si estaba configurado, mantener ese estado, sino volver a búsqueda
    if (
      this.configurationStatusSubject.value !== ConfigurationStatus.CONFIGURED
    ) {
      this.setStatus(ConfigurationStatus.SEARCHING);
    }
  }

  disconnect(): void {
    if (this.gattServer?.connected) {
      this.gattServer.disconnect();
    }
    this.handleDisconnection();
  }

  resetConfiguration(): void {
    this.disconnect();
    this.bluetoothDevice = null;
    this.connectedDeviceSubject.next(null);
    this.setStatus(ConfigurationStatus.SEARCHING);
    this.setError('');
  }

  private setStatus(status: ConfigurationStatus): void {
    this.configurationStatusSubject.next(status);
  }

  private setError(message: string): void {
    this.errorMessageSubject.next(message);
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
