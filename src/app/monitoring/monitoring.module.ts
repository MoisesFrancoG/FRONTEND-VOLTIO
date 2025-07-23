import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonitoringRoutingModule } from './monitoring-routing.module';
import { MonitoringComponent } from './monitoring/monitoring.component';
import { NgxEchartsModule } from 'ngx-echarts';
import { BluetoothModule } from '../bluetooth/bluetooth.module';

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
