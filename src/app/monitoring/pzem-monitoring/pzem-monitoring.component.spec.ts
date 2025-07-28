import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PzemMonitoringComponent } from './pzem-monitoring.component';

describe('PzemMonitoringComponent', () => {
  let component: PzemMonitoringComponent;
  let fixture: ComponentFixture<PzemMonitoringComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [PzemMonitoringComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PzemMonitoringComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
