import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth/services/auth.service';

import { SensorHistoryComponent } from './sensor-history.component';

describe('SensorHistoryComponent', () => {
  let component: SensorHistoryComponent;
  let fixture: ComponentFixture<SensorHistoryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, FormsModule],
      declarations: [SensorHistoryComponent],
      providers: [AuthService],
    }).compileComponents();

    fixture = TestBed.createComponent(SensorHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
