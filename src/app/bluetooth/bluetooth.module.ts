import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { BluetoothRoutingModule } from './bluetooth-routing.module';
import { BluetoothConfigComponent } from './bluetooth-config/bluetooth-config.component';
import { SharedModule } from '../shared/shared.module';

@NgModule({
  declarations: [BluetoothConfigComponent],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    BluetoothRoutingModule,
    SharedModule,
  ],
})
export class BluetoothModule {}
