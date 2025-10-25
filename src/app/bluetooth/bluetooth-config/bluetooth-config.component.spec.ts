import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { BluetoothConfigComponent } from './bluetooth-config.component';
import { BluetoothService } from '../services/bluetooth.service';
import { of } from 'rxjs';

describe('BluetoothConfigComponent', () => {
  let component: BluetoothConfigComponent;
  let fixture: ComponentFixture<BluetoothConfigComponent>;
  let mockBluetoothService: jasmine.SpyObj<BluetoothService>;

  beforeEach(async () => {
    const spy = jasmine.createSpyObj(
      'BluetoothService',
      ['searchForDevices', 'configureWiFi', 'disconnect', 'resetConfiguration'],
      {
        configurationStatus$: of('searching'),
        connectedDevice$: of(null),
        errorMessage$: of(''),
      }
    );

    await TestBed.configureTestingModule({
      declarations: [BluetoothConfigComponent],
      imports: [ReactiveFormsModule],
      providers: [{ provide: BluetoothService, useValue: spy }],
    }).compileComponents();

    fixture = TestBed.createComponent(BluetoothConfigComponent);
    component = fixture.componentInstance;
    mockBluetoothService = TestBed.inject(
      BluetoothService
    ) as jasmine.SpyObj<BluetoothService>;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should initialize wifi form with validators', () => {
    expect(component.wifiForm.get('ssid')?.hasError('required')).toBeTruthy();
    expect(
      component.wifiForm.get('password')?.hasError('required')
    ).toBeTruthy();
  });

  it('should call searchForDevices when search button is clicked', () => {
    component.onSearchDevices();
    expect(mockBluetoothService.searchForDevices).toHaveBeenCalled();
  });

  it('should call configureWiFi when form is valid and submitted', () => {
    component.wifiForm.patchValue({
      ssid: 'TestNetwork',
      password: 'testpassword123',
    });

    component.onConfigureWiFi();
    expect(mockBluetoothService.configureWiFi).toHaveBeenCalledWith({
      ssid: 'TestNetwork',
      password: 'testpassword123',
    });
  });
});
