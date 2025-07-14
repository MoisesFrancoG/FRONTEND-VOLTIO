export interface BluetoothDevice {
  id: string;
  name: string;
  connected: boolean;
  lastSeen?: Date;
}

export interface WiFiCredentials {
  ssid: string;
  password: string;
}

export interface DeviceConfiguration {
  device: BluetoothDevice;
  wifiCredentials: WiFiCredentials;
  configurationStatus: ConfigurationStatus;
}

export enum ConfigurationStatus {
  SEARCHING = 'searching',
  FOUND = 'found',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  CONFIGURING = 'configuring',
  CONFIGURED = 'configured',
  ERROR = 'error',
}

export interface BluetoothService {
  uuid: string;
  characteristics: BluetoothCharacteristic[];
}

export interface BluetoothCharacteristic {
  uuid: string;
  properties: string[];
}
