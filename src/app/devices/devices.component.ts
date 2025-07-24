import { Component, OnInit } from '@angular/core';
import { DeviceService } from './services/device.service';

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

  constructor(public deviceService: DeviceService) {}

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
}
