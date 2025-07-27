import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

import { AutomationRoutingModule } from './automation-routing.module';
import { AutomationComponent } from './components/automation.component';
import { AutomationRuleService } from './services/automation-rule.service';

@NgModule({
  declarations: [AutomationComponent],
  imports: [
    CommonModule,
    AutomationRoutingModule,
    ReactiveFormsModule,
    FormsModule,
    HttpClientModule,
  ],
  providers: [AutomationRuleService],
})
export class AutomationModule {}
