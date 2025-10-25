import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { AutomationComponent } from './components/automation.component';

const routes: Routes = [
  {
    path: '',
    component: AutomationComponent,
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AutomationRoutingModule {}
