import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { NgxChartsModule } from '@swimlane/ngx-charts';

import { HistorialRoutingModule } from './historial-routing.module';
import { HistorialComponent } from './historial.component';
import { FilterPipe } from './pipes/filter.pipe';

@NgModule({
  declarations: [HistorialComponent, FilterPipe],
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    NgxChartsModule,
    HistorialRoutingModule,
  ],
})
export class HistorialModule {}
