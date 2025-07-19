import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NgxEchartsModule } from 'ngx-echarts';
import { MonitoringComponent } from './monitoring.component';

describe('MonitoringComponent', () => {
  let component: MonitoringComponent;
  let fixture: ComponentFixture<MonitoringComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [MonitoringComponent],
      imports: [
        NgxEchartsModule.forRoot({
          echarts: () => import('echarts'),
        }),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(MonitoringComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
