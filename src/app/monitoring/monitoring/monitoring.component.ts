import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { EChartsOption } from 'echarts';
import { AuthService } from '../../auth/services/auth.service';
import { DeviceService, Device } from '../../devices/services/device.service';

@Component({
  selector: 'app-monitoring',
  templateUrl: './monitoring.component.html',
  styleUrls: ['./monitoring.component.css'],
})
export class MonitoringComponent implements OnInit, OnDestroy {
  // Estados de la vista
  currentView: 'device-selection' | 'monitoring' = 'device-selection';
  isLoading = false;
  hasError = false;
  errorMessage = '';

  // Datos de dispositivos
  userDevices: Device[] = [];
  selectedDevice: Device | null = null;

  // WebSocket
  private webSocket: WebSocket | null = null;
  isWebSocketConnected = false;

  // Datos para gráficas
  timeData: string[] = [];
  voltageData: number[] = [];
  currentData: number[] = [];
  powerData: number[] = [];
  energyData: number[] = [];
  frequencyData: number[] = [];
  powerFactorData: number[] = [];

  // Configuración de gráficas
  selectedChart: 'main' | 'power' | 'energy' = 'main';
  chartOption: EChartsOption = {};
  powerChartOption: EChartsOption = {};
  energyChartOption: EChartsOption = {};

  // Variables por tipo de dispositivo
  deviceVariables: { [key: number]: string[] } = {
    1: [
      // NODO_CONTROL_PZEM
      'voltage',
      'current',
      'power',
      'energy',
      'frequency',
      'powerFactor',
    ],
    2: ['temperature', 'humidity', 'light'], // NODO_CONTROL_IR
    3: ['temperature', 'humidity', 'light', 'pressure'], // NODO_SENSADO_RPI
  };

  constructor(
    private authService: AuthService,
    private deviceService: DeviceService,
    public router: Router
  ) {
    console.log('🔧 MonitoringComponent: Constructor llamado');
    this.initializeChartOptions();
  }

  ngOnInit(): void {
    console.log('🚀 MonitoringComponent: ngOnInit iniciado');

    // Debug de autenticación
    const token = this.authService.getToken();
    console.log('🔑 Token disponible:', !!token);
    console.log('🔑 Token length:', token?.length || 0);

    if (this.isAuthenticated()) {
      this.loadUserDevices();
    } else {
      console.log('❌ Usuario no autenticado, mostrando mensaje');
    }
  }

  ngOnDestroy(): void {
    console.log('🛑 MonitoringComponent: ngOnDestroy - Limpiando recursos');
    this.disconnectWebSocket();
  }

  // Métodos de autenticación
  isAuthenticated(): boolean {
    return this.authService.isLoggedIn();
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  // Métodos de carga de dispositivos
  async loadUserDevices(): Promise<void> {
    console.log('📱 Cargando dispositivos del usuario...');
    this.isLoading = true;
    this.hasError = false;
    this.errorMessage = '';

    try {
      const devices = await this.deviceService.getMyDevices().toPromise();
      console.log('✅ Dispositivos cargados:', devices);
      this.userDevices = devices || [];

      if (this.userDevices.length === 0) {
        console.log('ℹ️ No se encontraron dispositivos registrados');
      }
    } catch (error: any) {
      console.error('❌ Error cargando dispositivos:', error);
      this.hasError = true;

      if (error.status === 401) {
        this.errorMessage =
          'Sesión expirada. Por favor, inicia sesión nuevamente.';
        this.authService.logout();
        this.router.navigate(['/auth/login']);
      } else {
        this.errorMessage =
          error.error?.message || 'Error al cargar dispositivos';
      }
    } finally {
      this.isLoading = false;
    }
  }

  // Métodos de selección de dispositivos
  selectDevice(device: Device): void {
    console.log('🎯 Dispositivo seleccionado:', device);
    this.selectedDevice = device;
    this.currentView = 'monitoring';
    this.resetMonitoringData();
    this.setupWebSocket();
  }

  backToDeviceSelection(): void {
    console.log('⬅️ Regresando a selección de dispositivos');
    this.currentView = 'device-selection';
    this.disconnectWebSocket();
    this.selectedDevice = null;
    this.resetMonitoringData();
  }

  // Métodos WebSocket
  setupWebSocket(): void {
    if (!this.selectedDevice) {
      console.error('❌ No hay dispositivo seleccionado para WebSocket');
      return;
    }

    console.log(
      '🔌 Configurando WebSocket para dispositivo:',
      this.selectedDevice.name
    );
    this.disconnectWebSocket(); // Desconectar WebSocket anterior si existe

    try {
      const deviceMac = this.selectedDevice.mac_address;
      const deviceType = this.selectedDevice.device_type_id;

      // Determinar el topic basado en el tipo de dispositivo
      let topic = '';
      switch (deviceType) {
        case 1: // NODO_CONTROL_PZEM
          topic = 'pzem';
          break;
        case 2: // NODO_CONTROL_IR
          topic = 'ir';
          break;
        case 3: // NODO_SENSADO_RPI
          topic = 'rpi';
          break;
        default:
          topic = 'general';
      }

      const wsUrl = `wss://websocketvoltio.acstree.xyz/ws?topic=${topic}&mac=${deviceMac}`;
      console.log('🔗 Conectando WebSocket:', wsUrl);

      this.webSocket = new WebSocket(wsUrl);

      this.webSocket.onopen = () => {
        console.log('✅ WebSocket conectado exitosamente');
        this.isWebSocketConnected = true;
      };

      this.webSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📊 Datos recibidos del WebSocket:', data);
          this.processWebSocketData(data);
        } catch (error) {
          console.error('❌ Error procesando datos del WebSocket:', error);
        }
      };

      this.webSocket.onclose = (event) => {
        console.log('🔌 WebSocket desconectado:', event.code, event.reason);
        this.isWebSocketConnected = false;

        // Reconectar automáticamente después de 5 segundos si no fue intencional
        if (event.code !== 1000 && this.selectedDevice) {
          console.log('🔄 Reconectando WebSocket en 5 segundos...');
          setTimeout(() => {
            if (this.selectedDevice && !this.isWebSocketConnected) {
              this.setupWebSocket();
            }
          }, 5000);
        }
      };

      this.webSocket.onerror = (error) => {
        console.error('❌ Error en WebSocket:', error);
        this.isWebSocketConnected = false;
      };
    } catch (error) {
      console.error('❌ Error configurando WebSocket:', error);
      this.isWebSocketConnected = false;
    }
  }

  disconnectWebSocket(): void {
    if (this.webSocket) {
      console.log('🔌 Desconectando WebSocket...');
      this.webSocket.close(1000, 'Desconexión intencional');
      this.webSocket = null;
      this.isWebSocketConnected = false;
    }
  }

  reconnectWebSocket(): void {
    console.log('🔄 Reconectando WebSocket...');
    this.setupWebSocket();
  }

  // Procesamiento de datos del WebSocket
  processWebSocketData(data: any): void {
    const now = new Date().toLocaleTimeString();

    // Mantener solo los últimos 50 puntos de datos
    if (this.timeData.length >= 50) {
      this.timeData.shift();
      this.voltageData.shift();
      this.currentData.shift();
      this.powerData.shift();
      this.energyData.shift();
      this.frequencyData.shift();
      this.powerFactorData.shift();
    }

    this.timeData.push(now);

    // Procesar datos según el tipo de dispositivo
    if (this.selectedDevice?.device_type_id === 1) {
      this.voltageData.push(data.voltage || 0);
      this.currentData.push(data.current || 0);
      this.powerData.push(data.power || 0);
      this.energyData.push(data.energy || 0);
      this.frequencyData.push(data.frequency || 0);
      this.powerFactorData.push(data.powerFactor || 0);
    }
    // TODO: Agregar procesamiento para otros tipos de dispositivos

    this.updateChartData();
  }

  // Métodos de gráficas
  initializeChartOptions(): void {
    this.chartOption = {
      title: {
        text: 'Voltaje y Corriente en Tiempo Real',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: ['Voltaje (V)', 'Corriente (A)'],
        top: 30,
      },
      xAxis: {
        type: 'category',
        data: this.timeData,
      },
      yAxis: [
        {
          type: 'value',
          name: 'Voltaje (V)',
          position: 'left',
        },
        {
          type: 'value',
          name: 'Corriente (A)',
          position: 'right',
        },
      ],
      series: [
        {
          name: 'Voltaje (V)',
          type: 'line',
          data: this.voltageData,
          smooth: true,
          yAxisIndex: 0,
        },
        {
          name: 'Corriente (A)',
          type: 'line',
          data: this.currentData,
          smooth: true,
          yAxisIndex: 1,
        },
      ],
    };

    this.powerChartOption = {
      title: {
        text: 'Potencia en Tiempo Real',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
      },
      xAxis: {
        type: 'category',
        data: this.timeData,
      },
      yAxis: {
        type: 'value',
        name: 'Potencia (W)',
      },
      series: [
        {
          name: 'Potencia (W)',
          type: 'line',
          data: this.powerData,
          smooth: true,
          areaStyle: {},
        },
      ],
    };

    this.energyChartOption = {
      title: {
        text: 'Energía Acumulada',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
      },
      xAxis: {
        type: 'category',
        data: this.timeData,
      },
      yAxis: {
        type: 'value',
        name: 'Energía (kWh)',
      },
      series: [
        {
          name: 'Energía (kWh)',
          type: 'line',
          data: this.energyData,
          smooth: true,
          step: 'end',
        },
      ],
    };
  }

  updateChartData(): void {
    // Actualizar datos en las opciones de gráficas
    this.chartOption = {
      ...this.chartOption,
      xAxis: {
        type: 'category',
        data: this.timeData,
      },
      series: [
        {
          name: 'Voltaje (V)',
          type: 'line',
          data: this.voltageData,
          smooth: true,
          yAxisIndex: 0,
        },
        {
          name: 'Corriente (A)',
          type: 'line',
          data: this.currentData,
          smooth: true,
          yAxisIndex: 1,
        },
      ],
    };

    this.powerChartOption = {
      ...this.powerChartOption,
      xAxis: {
        type: 'category',
        data: this.timeData,
      },
      series: [
        {
          name: 'Potencia (W)',
          type: 'line',
          data: this.powerData,
          smooth: true,
          areaStyle: {},
        },
      ],
    };

    this.energyChartOption = {
      ...this.energyChartOption,
      xAxis: {
        type: 'category',
        data: this.timeData,
      },
      series: [
        {
          name: 'Energía (kWh)',
          type: 'line',
          data: this.energyData,
          smooth: true,
          step: 'end',
        },
      ],
    };
  }

  setChart(chartType: 'main' | 'power' | 'energy'): void {
    console.log('📊 Cambiando a gráfica:', chartType);
    this.selectedChart = chartType;
  }

  // Métodos utilitarios
  resetMonitoringData(): void {
    this.timeData = [];
    this.voltageData = [];
    this.currentData = [];
    this.powerData = [];
    this.energyData = [];
    this.frequencyData = [];
    this.powerFactorData = [];
    this.selectedChart = 'main';
    this.updateChartData();
  }

  getDeviceIcon(deviceTypeId: number): string {
    switch (deviceTypeId) {
      case 1: // NODO_CONTROL_PZEM
        return '⚡';
      case 2: // NODO_CONTROL_IR
        return '🌡️';
      case 3: // NODO_SENSADO_RPI
        return '🔬';
      default:
        return '📱';
    }
  }

  getDeviceVariables(deviceTypeId: number): string[] {
    return this.deviceVariables[deviceTypeId] || [];
  }
}
