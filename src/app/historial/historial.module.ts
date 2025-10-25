import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { NgxEchartsModule } from 'ngx-echarts';

import { HistorialRoutingModule } from './historial-routing.module';
import { HistorialComponent } from './historial.component';
import { FilterPipe } from './pipes/filter.pipe';
import { SensorHistoryComponent } from './sensor-history/sensor-history.component';

@NgModule({
  declarations: [HistorialComponent, FilterPipe, SensorHistoryComponent],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    NgxChartsModule,
    NgxEchartsModule.forRoot({
      echarts: () => import('echarts'),
    }),
    HistorialRoutingModule,
  ],
})
export class HistorialModule {}
