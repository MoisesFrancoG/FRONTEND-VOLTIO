import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonitoringRoutingModule } from './monitoring-routing.module';
import { NgxEchartsModule } from 'ngx-echarts';
import { BluetoothModule } from '../bluetooth/bluetooth.module';
import { MonitoringComponent } from './monitoring/monitoring.component';

@NgModule({
  declarations: [MonitoringComponent],
  imports: [
    CommonModule,
    MonitoringRoutingModule,
    BluetoothModule,
    NgxEchartsModule.forRoot({
      echarts: () => import('echarts'),
    }),
  ],
})
export class MonitoringModule {}
