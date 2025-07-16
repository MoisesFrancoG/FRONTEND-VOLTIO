import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Subject, takeUntil } from 'rxjs';
import { BluetoothService } from '../services/bluetooth.service';
import {
  BluetoothDevice,
  ConfigurationStatus,
} from '../models/bluetooth.models';

@Component({
  selector: 'app-bluetooth-config',
  templateUrl: './bluetooth-config.component.html',
  styleUrls: ['./bluetooth-config.component.css'],
})
export class BluetoothConfigComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  wifiForm: FormGroup;
  currentStatus: ConfigurationStatus = ConfigurationStatus.SEARCHING;
  connectedDevice: BluetoothDevice | null = null;
  errorMessage: string = '';

  // Enum para uso en template
  ConfigurationStatus = ConfigurationStatus;

  constructor(
    private bluetoothService: BluetoothService,
    private formBuilder: FormBuilder
  ) {
    this.wifiForm = this.formBuilder.group({
      ssid: ['', [Validators.required, Validators.minLength(1)]],
      password: ['', [Validators.required, Validators.minLength(8)]],
    });
  }

  ngOnInit(): void {
    this.subscribeToBluetoothEvents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.bluetoothService.disconnect();
  }

  private subscribeToBluetoothEvents(): void {
    this.bluetoothService.configurationStatus$
      .pipe(takeUntil(this.destroy$))
      .subscribe((status) => {
        this.currentStatus = status;
      });

    this.bluetoothService.connectedDevice$
      .pipe(takeUntil(this.destroy$))
      .subscribe((device) => {
        this.connectedDevice = device;
      });

    this.bluetoothService.errorMessage$
      .pipe(takeUntil(this.destroy$))
      .subscribe((error) => {
        this.errorMessage = error;
      });
  }

  onSearchDevices(): void {
    this.bluetoothService.searchForDevices();
  }

  onConfigureWiFi(): void {
    if (this.wifiForm.valid) {
      const credentials = {
        ssid: this.wifiForm.get('ssid')?.value,
        password: this.wifiForm.get('password')?.value,
      };

      this.bluetoothService.configureWiFi(credentials);
    }
  }

  onResetConfiguration(): void {
    this.bluetoothService.resetConfiguration();
    this.wifiForm.reset();
  }

  onDisconnect(): void {
    this.bluetoothService.disconnect();
  }

  // Método para debugging - solo visible en desarrollo
  onDebugCharacteristics(): void {
    console.log('=== DEBUG INFO ===');
    console.log('Device Info:', this.bluetoothService.getDeviceInfo());
    this.bluetoothService.debugListCharacteristics();
  }

  // Método para verificar si estamos en modo desarrollo
  isDevelopmentMode(): boolean {
    return true; // Temporalmente siempre true para testing
  }

  getStatusText(): string {
    switch (this.currentStatus) {
      case ConfigurationStatus.SEARCHING:
        return 'Listo para buscar dispositivos';
      case ConfigurationStatus.FOUND:
        return 'Dispositivo encontrado';
      case ConfigurationStatus.CONNECTING:
        return 'Conectando al dispositivo...';
      case ConfigurationStatus.CONNECTED:
        return 'Conectado - Listo para configurar WiFi';
      case ConfigurationStatus.CONFIGURING:
        return 'Enviando configuración WiFi...';
      case ConfigurationStatus.CONFIGURED:
        return '¡Configuración completada! El dispositivo se reiniciará.';
      case ConfigurationStatus.ERROR:
        return 'Error en la configuración';
      default:
        return 'Estado desconocido';
    }
  }

  getStatusColor(): string {
    switch (this.currentStatus) {
      case ConfigurationStatus.SEARCHING:
        return 'text-blue-600';
      case ConfigurationStatus.FOUND:
      case ConfigurationStatus.CONNECTING:
        return 'text-yellow-600';
      case ConfigurationStatus.CONNECTED:
        return 'text-green-600';
      case ConfigurationStatus.CONFIGURING:
        return 'text-orange-600';
      case ConfigurationStatus.CONFIGURED:
        return 'text-green-800';
      case ConfigurationStatus.ERROR:
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  }

  isFormDisabled(): boolean {
    return this.currentStatus !== ConfigurationStatus.CONNECTED;
  }

  isSearchButtonDisabled(): boolean {
    return (
      this.currentStatus === ConfigurationStatus.CONNECTING ||
      this.currentStatus === ConfigurationStatus.CONFIGURING
    );
  }
}
