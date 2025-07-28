import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { DevicesComponent } from './devices.component';
import { ManualRegisterComponent } from './manual-register/manual-register.component';
import { BluetoothRegisterComponent } from './bluetooth-register/bluetooth-register.component';
import { SharedModule } from '../shared/shared.module';
import { DevicesRoutingModule } from './devices-routing.module';

@NgModule({
  declarations: [
    DevicesComponent,
    ManualRegisterComponent,
    BluetoothRegisterComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
    SharedModule,
    DevicesRoutingModule,
  ],
  exports: [
    DevicesComponent,
    ManualRegisterComponent,
    BluetoothRegisterComponent,
  ],
})
export class DevicesModule {}
