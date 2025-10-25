import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HistorialComponent } from './historial.component';
import { SensorHistoryComponent } from './sensor-history/sensor-history.component';

const routes: Routes = [
  {
    path: '',
    component: HistorialComponent,
  },
  {
    path: 'sensor-history',
    component: SensorHistoryComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class HistorialRoutingModule {}
