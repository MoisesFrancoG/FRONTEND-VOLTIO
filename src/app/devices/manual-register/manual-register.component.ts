import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';
import { DeviceService } from '../services/device.service';

@Component({
  selector: 'app-manual-register',
  templateUrl: './manual-register.component.html',
  styleUrls: ['./manual-register.component.css'],
})
export class ManualRegisterComponent {
  @Output() registered = new EventEmitter<void>();
  loading = false;
  error: string | null = null;
  success: string | null = null;
  form;

  constructor(public fb: FormBuilder, public deviceService: DeviceService) {
    this.form = this.fb.group({
      name: ['', Validators.required],
      mac_address: [
        '',
        [
          Validators.required,
          Validators.pattern(/^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$/),
        ],
      ],
      description: [''],
      is_active: [true],
    });
  }

  submit() {
    this.error = null;
    this.success = null;
    if (this.form.invalid) return;
    this.loading = true;
    const data = {
      ...this.form.value,
      device_type_id: 2,
    };
    this.deviceService.registerDevice(data).subscribe({
      next: () => {
        this.success = 'Dispositivo registrado correctamente';
        this.loading = false;
        this.registered.emit();
        this.form.reset();
      },
      error: (err: any) => {
        this.error = err?.error?.message || 'Error al registrar dispositivo';
        this.loading = false;
      },
    });
  }
}
