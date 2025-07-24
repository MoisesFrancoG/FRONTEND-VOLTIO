import { Component, EventEmitter, Output } from '@angular/core';
import { DeviceService } from '../services/device.service';

const SERVICE_UUID = '4fafc201-1fb5-459e-8fcc-c5c9c331914b';
const MAC_CHAR_UUID = '12345678-1234-1234-1234-1234567890ab';
const SSID_CHAR_UUID = 'beb5483e-36e1-4688-b7f5-ea07361b26a8';
const PASS_CHAR_UUID = 'a3250098-c914-4a49-8588-e5263a8a385d';
const SAVE_CHAR_UUID = '7d3b9e43-e65a-4467-9b65-6c70188235f3';
const IR_RECORD_CHAR_UUID = 'f2f3f4f5-f6f7-f8f9-fafb-fcfdfeff0001';

@Component({
  selector: 'app-bluetooth-register',
  templateUrl: './bluetooth-register.component.html',
  styleUrls: ['./bluetooth-register.component.css'],
})
export class BluetoothRegisterComponent {
  @Output() registered = new EventEmitter<void>();
  step: 'idle' | 'connecting' | 'form' | 'saving' | 'done' = 'idle';
  error: string | null = null;
  deviceName = '';
  mac = '';
  prefix = '';
  ssid = '';
  password = '';
  description = '';
  irMode = false;
  recording: 'none' | 'on' | 'off' = 'none';
  device: any;
  server: any;
  service: any;

  constructor(private deviceService: DeviceService) {}

  async startBluetooth() {
    this.error = null;
    this.step = 'connecting';
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SERVICE_UUID] }],
      });
      this.device = device;
      this.server = await (device.gatt?.connect?.() ??
        Promise.reject('No GATT available'));
      this.service = await this.server.getPrimaryService(SERVICE_UUID);
      const macChar = await this.service.getCharacteristic(MAC_CHAR_UUID);
      const value = await macChar.readValue();
      const decoder = new TextDecoder('utf-8');
      const macString = decoder.decode(value.buffer);
      const [prefix, mac] = macString.split('|');
      this.prefix = prefix;
      this.mac = mac;
      this.irMode = prefix === '2';
      this.step = 'form';
    } catch (e: any) {
      this.error = 'No se pudo conectar al dispositivo Bluetooth';
      this.step = 'idle';
    }
  }

  async recordSignal(type: 'on' | 'off') {
    if (!this.service) return;
    this.recording = type;
    try {
      const irChar = await this.service.getCharacteristic(IR_RECORD_CHAR_UUID);
      const encoder = new TextEncoder();
      await irChar.writeValue(
        encoder.encode(type === 'on' ? 'RECORD_ON' : 'RECORD_OFF')
      );
    } catch {
      this.error = 'Error al grabar señal IR';
    }
    this.recording = 'none';
  }

  async saveConfig() {
    this.error = null;
    this.step = 'saving';
    try {
      const ssidChar = await this.service.getCharacteristic(SSID_CHAR_UUID);
      const passChar = await this.service.getCharacteristic(PASS_CHAR_UUID);
      const saveChar = await this.service.getCharacteristic(SAVE_CHAR_UUID);
      const encoder = new TextEncoder();
      await ssidChar.writeValue(encoder.encode(this.ssid));
      await passChar.writeValue(encoder.encode(this.password));
      await saveChar.writeValue(encoder.encode('SAVE'));
      await this.registerDevice();
      this.step = 'done';
      this.registered.emit();
    } catch {
      this.error = 'Error al guardar configuración Wi-Fi';
      this.step = 'form';
    }
  }

  registerDevice() {
    // device_type_id: 1 para prefijo '1', 3 para prefijo '2'
    const device_type_id = this.prefix === '2' ? 3 : 1;
    return this.deviceService
      .registerDevice({
        name: this.deviceName,
        mac_address: this.mac,
        description: this.description,
        device_type_id,
      })
      .toPromise();
  }
}
