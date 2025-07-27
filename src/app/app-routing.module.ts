import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AuthGuard } from './core/guards/auth.guard';

const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./home/home.module').then((m) => m.HomeModule),
  },
  {
    path: 'auth',
    loadChildren: () => import('./auth/auth.module').then((m) => m.AuthModule),
  },
  {
    path: 'monitoring',
    loadChildren: () =>
      import('./monitoring/monitoring.module').then((m) => m.MonitoringModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'bluetooth',
    loadChildren: () =>
      import('./bluetooth/bluetooth.module').then((m) => m.BluetoothModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'devices',
    loadChildren: () =>
      import('./devices/devices.module').then((m) => m.DevicesModule),
    canActivate: [AuthGuard],
  },
  {
    path: 'historial',
    loadChildren: () =>
      import('./historial/historial.module').then((m) => m.HistorialModule),

    canActivate: [AuthGuard],
  },
  {
    path: 'automation',
    loadChildren: () =>
      import('./automation/automation.module').then((m) => m.AutomationModule),
    canActivate: [AuthGuard],
  },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
