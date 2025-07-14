// Declaraciones de tipos para Web Bluetooth API
declare global {
  interface Navigator {
    bluetooth: Bluetooth;
  }

  interface Bluetooth {
    requestDevice(options?: RequestDeviceOptions): Promise<BluetoothDevice>;
    getAvailability(): Promise<boolean>;
  }

  interface RequestDeviceOptions {
    filters?: BluetoothLEScanFilter[];
    optionalServices?: BluetoothServiceUUID[];
  }

  interface BluetoothLEScanFilter {
    services?: BluetoothServiceUUID[];
    name?: string;
    namePrefix?: string;
  }

  type BluetoothServiceUUID = number | string;

  interface BluetoothDevice extends EventTarget {
    readonly id: string;
    readonly name?: string;
    readonly gatt?: BluetoothRemoteGATTServer;
    addEventListener(
      type: 'gattserverdisconnected',
      listener: (this: this, ev: Event) => any
    ): void;
  }

  interface BluetoothRemoteGATTServer {
    readonly device: BluetoothDevice;
    readonly connected: boolean;
    connect(): Promise<BluetoothRemoteGATTServer>;
    disconnect(): void;
    getPrimaryService(
      service: BluetoothServiceUUID
    ): Promise<BluetoothRemoteGATTService>;
  }

  interface BluetoothRemoteGATTService {
    readonly device: BluetoothDevice;
    readonly uuid: string;
    readonly isPrimary: boolean;
    getCharacteristic(
      characteristic: BluetoothCharacteristicUUID
    ): Promise<BluetoothRemoteGATTCharacteristic>;
  }

  type BluetoothCharacteristicUUID = number | string;

  interface BluetoothRemoteGATTCharacteristic {
    readonly service: BluetoothRemoteGATTService;
    readonly uuid: string;
    readonly properties: BluetoothCharacteristicProperties;
    readonly value?: DataView;
    writeValue(value: BufferSource): Promise<void>;
    readValue(): Promise<DataView>;
    startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
    addEventListener(
      type: 'characteristicvaluechanged',
      listener: (this: this, ev: Event) => any
    ): void;
  }

  interface BluetoothCharacteristicProperties {
    readonly broadcast: boolean;
    readonly read: boolean;
    readonly writeWithoutResponse: boolean;
    readonly write: boolean;
    readonly notify: boolean;
    readonly indicate: boolean;
    readonly authenticatedSignedWrites: boolean;
    readonly reliableWrite: boolean;
    readonly writableAuxiliaries: boolean;
  }
}

export {};
