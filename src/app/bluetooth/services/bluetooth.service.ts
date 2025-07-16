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
  // UUIDs para el servicio y características (deben coincidir con el ESP32)
  private readonly SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
  private readonly WIFI_SSID_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
  private readonly WIFI_PASS_CHAR_UUID = 'a3250098-c914-4a49-8588-e5263a8a385d';
  private readonly SAVE_CONFIG_CHAR_UUID =
    '7d3b9e43-e65a-4467-9b65-6c70188235f3';

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
  private nativeBluetoothDevice: any = null; // Dispositivo nativo de Web Bluetooth API
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
        // Guardar tanto el dispositivo nativo como nuestro modelo
        this.nativeBluetoothDevice = device;
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
    if (!this.bluetoothDevice || !this.nativeBluetoothDevice) return;

    try {
      this.setStatus(ConfigurationStatus.CONNECTING);

      // Usar el dispositivo ya obtenido en lugar de solicitar uno nuevo
      const device = this.nativeBluetoothDevice;

      // Conectar al servidor GATT
      this.gattServer = await device.gatt!.connect();

      // Verificar que la conexión GATT fue exitosa
      if (!this.gattServer) {
        throw new Error('No se pudo establecer conexión GATT');
      }

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
      console.log('Iniciando configuración WiFi...');
      console.log('UUIDs a usar:', {
        ssid: this.WIFI_SSID_CHAR_UUID,
        pass: this.WIFI_PASS_CHAR_UUID,
        save: this.SAVE_CONFIG_CHAR_UUID,
      });

      // Obtener características con manejo individual de errores
      let ssidChar, passChar, saveChar;

      try {
        ssidChar = await this.configService.getCharacteristic(
          this.WIFI_SSID_CHAR_UUID
        );
        console.log('✅ Característica SSID obtenida');
      } catch (error) {
        console.error('❌ Error obteniendo característica SSID:', error);
        await this.debugListCharacteristics();
        throw new Error(`No se pudo obtener la característica SSID: ${error}`);
      }

      try {
        passChar = await this.configService.getCharacteristic(
          this.WIFI_PASS_CHAR_UUID
        );
        console.log('✅ Característica Password obtenida');
      } catch (error) {
        console.error('❌ Error obteniendo característica Password:', error);
        throw new Error(
          `No se pudo obtener la característica Password: ${error}`
        );
      }

      try {
        saveChar = await this.configService.getCharacteristic(
          this.SAVE_CONFIG_CHAR_UUID
        );
        console.log('✅ Característica Save obtenida');
      } catch (error) {
        console.error('❌ Error obteniendo característica Save:', error);
        throw new Error(`No se pudo obtener la característica Save: ${error}`);
      }

      // Enviar SSID
      await ssidChar.writeValue(new TextEncoder().encode(credentials.ssid));
      console.log('✅ SSID enviado:', credentials.ssid);

      // Pequeña pausa entre envíos
      await this.delay(100);

      // Enviar contraseña
      await passChar.writeValue(new TextEncoder().encode(credentials.password));
      console.log(
        '✅ Contraseña enviada (longitud:',
        credentials.password.length,
        'caracteres)'
      );

      // Pequeña pausa antes del comando final
      await this.delay(100);

      // Enviar comando de guardado
      await saveChar.writeValue(new TextEncoder().encode('SAVE'));
      console.log('✅ Comando SAVE enviado');

      this.setStatus(ConfigurationStatus.CONFIGURED);

      // El dispositivo se reiniciará y perderemos la conexión
      setTimeout(() => {
        this.handleDisconnection();
      }, 2000);
    } catch (error: any) {
      console.error('Error completo en configureWiFi:', error);
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
    this.nativeBluetoothDevice = null;
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
  // Método para debugging - intenta conectar a características específicas
  async debugListCharacteristics(): Promise<void> {
    if (!this.configService) {
      console.log('No hay servicio activo para depurar');
      return;
    }

    try {
      console.log('=== DEBUGGING: Probando características ===');
      console.log('Servicio UUID:', this.SERVICE_UUID);

      // Lista de características que esperamos encontrar
      const expectedChars = [
        { name: 'SSID', uuid: this.WIFI_SSID_CHAR_UUID },
        { name: 'Password', uuid: this.WIFI_PASS_CHAR_UUID },
        { name: 'Save Config', uuid: this.SAVE_CONFIG_CHAR_UUID },
      ];

      for (const charInfo of expectedChars) {
        try {
          const char = await this.configService.getCharacteristic(
            charInfo.uuid
          );
          console.log(`✅ ${charInfo.name} encontrada:`, charInfo.uuid);
          console.log('   Propiedades:', char.properties);
        } catch (error) {
          console.log(`❌ ${charInfo.name} NO encontrada:`, charInfo.uuid);
          console.log('   Error:', error);
        }
      }
    } catch (error: any) {
      console.error('Error en debugging:', error);
    }
  }

  // Método para obtener información detallada del dispositivo
  getDeviceInfo(): any {
    return {
      bluetoothDevice: this.bluetoothDevice,
      nativeDevice: this.nativeBluetoothDevice
        ? {
            id: this.nativeBluetoothDevice.id,
            name: this.nativeBluetoothDevice.name,
            gattConnected: this.nativeBluetoothDevice.gatt?.connected,
          }
        : null,
      gattConnected: this.gattServer?.connected,
      serviceConnected: !!this.configService,
      currentStatus: this.configurationStatusSubject.value,
    };
  }
}
