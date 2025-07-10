import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MonitoringRoutingModule } from './monitoring-routing.module';
import { MonitoringComponent } from './monitoring/monitoring.component';
import { NgxEchartsModule } from 'ngx-echarts';

@NgModule({
  declarations: [MonitoringComponent],
  imports: [
    CommonModule,
    MonitoringRoutingModule,
    NgxEchartsModule.forRoot({
      echarts: () => import('echarts')
    })
  ]
})
export class MonitoringModule { }