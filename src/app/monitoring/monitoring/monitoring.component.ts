import { Component, OnInit, OnDestroy } from '@angular/core';
import { EChartsOption, SeriesOption } from 'echarts';
import { BluetoothService } from '../../bluetooth/services/bluetooth.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-monitoring',
  templateUrl: './monitoring.component.html',
  styleUrls: ['./monitoring.component.css'],
})
export class MonitoringComponent implements OnInit, OnDestroy {
  private ws!: WebSocket; // Inicialización diferida
  private macAddressSubscription!: Subscription;
  private currentMacAddress = ''; // MAC por defecto

  chartOption: EChartsOption & { series: SeriesOption[] } = {
    series: [],
  };

  powerChartOption: EChartsOption & { series: SeriesOption[] } = {
    series: [],
  };

  energyChartOption: EChartsOption & { series: SeriesOption[] } = {
    series: [],
  };

  timeData: string[] = [];
  voltageData: number[] = [];
  currentData: number[] = [];
  powerData: number[] = [];
  energyData: number[] = [];

  selectedChart: 'main' | 'power' | 'energy' = 'main';
  private wsUrl = 'wss://websocketvoltio.acstree.xyz/ws?topic=pzem&mac=';
  private reconnectInterval = 5000; // 5 segundos
  private maxReconnectAttempts = 5;
  private reconnectAttempts = 0;

  constructor(private bluetoothService: BluetoothService) {
    // WebSocket se inicializa en ngOnInit para mejor control
  }

  ngOnInit() {
    this.initCharts();
    this.subscribeToMacAddress();
    this.setupWebSocket();
  }

  ngOnDestroy() {
    if (this.ws) {
      this.ws.close();
    }
    if (this.macAddressSubscription) {
      this.macAddressSubscription.unsubscribe();
    }
  }

  private subscribeToMacAddress() {
    // Verificar si ya hay una MAC disponible (cargada desde localStorage)
    const existingMac = this.bluetoothService.getCurrentMacAddress();
    if (existingMac) {
      console.log('MAC cargada desde localStorage:', existingMac);
      this.currentMacAddress = existingMac;
    }

    // Suscribirse a cambios en la dirección MAC
    this.macAddressSubscription = this.bluetoothService.macAddress$.subscribe(
      (macAddress) => {
        if (macAddress && macAddress !== this.currentMacAddress) {
          console.log('Nueva dirección MAC recibida:', macAddress);
          this.currentMacAddress = macAddress;
          this.reconnectWithNewMac();
        }
      }
    );
  }

  private reconnectWithNewMac() {
    console.log(
      'Reconectando WebSocket con nueva MAC:',
      this.currentMacAddress
    );

    // Cerrar conexión actual si existe
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.close();
    }

    // Reiniciar contadores de reconexión
    this.reconnectAttempts = 0;

    // Configurar WebSocket con nueva MAC
    this.setupWebSocket();
  }

  setChart(chart: 'main' | 'power' | 'energy') {
    this.selectedChart = chart;
  }

  async refreshMacAddress() {
    try {
      console.log('🔄 Obteniendo dirección MAC del dispositivo...');
      const macAddress = await this.bluetoothService.getMacAddress();
      if (macAddress) {
        console.log('✅ MAC obtenida exitosamente:', macAddress);
        // La suscripción automáticamente actualizará currentMacAddress y reconectará
      } else {
        console.warn('⚠️ No se pudo obtener la dirección MAC');
      }
    } catch (error) {
      console.error('❌ Error al obtener MAC:', error);
    }
  }

  // Método para conectar manualmente si tenemos MAC válida
  connectWithCurrentMac() {
    if (this.isValidMac(this.currentMacAddress)) {
      console.log('🔌 Conectando manualmente con MAC:', this.currentMacAddress);
      this.setupWebSocket();
    } else {
      console.warn('⚠️ No se puede conectar sin una MAC válida');
    }
  }

  getCurrentMac(): string {
    return this.currentMacAddress;
  }

  getWebSocketStatus(): string {
    if (!this.ws) return 'No conectado';

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'Conectando...';
      case WebSocket.OPEN:
        return 'Conectado';
      case WebSocket.CLOSING:
        return 'Cerrando...';
      case WebSocket.CLOSED:
        return 'Desconectado';
      default:
        return 'Desconocido';
    }
  }

  isWebSocketConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private isValidMac(mac: string): boolean {
    // Verificar si la MAC tiene un formato válido (XX:XX:XX:XX:XX:XX)
    const macRegex = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
    return macRegex.test(mac);
  }

  private setupWebSocket() {
    try {
      // Verificar si tenemos una MAC válida
      if (!this.isValidMac(this.currentMacAddress)) {
        console.warn(
          '⚠️ No hay MAC válida disponible. MAC actual:',
          this.currentMacAddress
        );
        console.log(
          '💡 Intenta conectarte al ESP32 desde la configuración Bluetooth para obtener la MAC'
        );
        return;
      }

      // Cerrar conexión existente si existe
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.ws.close();
      }

      // Construir URL con la MAC actual
      const fullWsUrl = `${this.wsUrl}${this.currentMacAddress}`;
      console.log('🔌 Conectando a WebSocket con MAC:', this.currentMacAddress);
      console.log('🌐 URL completa:', fullWsUrl);

      this.ws = new WebSocket(fullWsUrl);

      this.ws.onopen = (event) => {
        console.log('✅ WebSocket conectado exitosamente');
        this.reconnectAttempts = 0; // Reset counter on successful connection
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const message = JSON.parse(data.content);
          const payload = JSON.parse(message.message).payload;

          this.updateChartData(payload);
          console.log('Payload recibido:', payload);
        } catch (error) {
          console.error('Error al parsear mensaje WebSocket:', error);
        }
      };

      this.ws.onerror = (error) => {
        console.error('❌ Error en WebSocket:', error);
      };

      this.ws.onclose = (event) => {
        console.log(
          '🔌 WebSocket desconectado. Código:',
          event.code,
          'Razón:',
          event.reason
        );

        // Intentar reconectar si no fue un cierre intencional
        if (
          event.code !== 1000 &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
          this.reconnectAttempts++;
          console.log(
            `🔄 Intentando reconectar... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
          );

          setTimeout(() => {
            this.setupWebSocket();
          }, this.reconnectInterval);
        } else if (this.reconnectAttempts >= this.maxReconnectAttempts) {
          console.error('❌ Máximo número de intentos de reconexión alcanzado');
        }
      };
    } catch (error) {
      console.error('❌ Error al configurar WebSocket:', error);
    }
  }

  private updateChartData(payload: any) {
    const time = new Date().toLocaleTimeString();

    this.timeData.push(time);
    this.voltageData.push(payload.voltage / 10);
    this.currentData.push(payload.current / 1000);
    this.powerData.push(payload.power / 10);
    this.energyData.push(payload.energy);

    if (this.timeData.length > 60) {
      this.timeData.shift();
      this.voltageData.shift();
      this.currentData.shift();
      this.powerData.shift();
      this.energyData.shift();
    }

    this.updateCharts();
  }

  private initCharts() {
    this.chartOption = {
      title: {
        text: 'Voltaje y Corriente en Tiempo Real',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
      },
      legend: {
        data: ['Voltaje (V)', 'Corriente (A)'],
        bottom: 0,
      },
      xAxis: {
        type: 'category',
        data: [],
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
          data: [],
          smooth: true,
          lineStyle: { width: 2 },
          itemStyle: { color: '#FF4560' },
        },
        {
          name: 'Corriente (A)',
          type: 'line',
          yAxisIndex: 1,
          data: [],
          smooth: true,
          lineStyle: { width: 2 },
          itemStyle: { color: '#00E396' },
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
        data: [],
      },
      yAxis: {
        type: 'value',
        name: 'Potencia (W)',
      },
      series: [
        {
          type: 'line',
          data: [],
          areaStyle: {},
          smooth: true,
          itemStyle: { color: '#008FFB' },
        },
      ],
    };

    this.energyChartOption = {
      title: {
        text: 'Consumo de Energía',
        left: 'center',
      },
      tooltip: {
        trigger: 'axis',
      },
      xAxis: {
        type: 'category',
        data: [],
      },
      yAxis: {
        type: 'value',
        name: 'Energía (kWh)',
      },
      series: [
        {
          type: 'bar',
          data: [],
          itemStyle: { color: '#FEB019' },
        },
      ],
    };
  }

  private updateCharts() {
    this.chartOption = {
      ...this.chartOption,
      xAxis: {
        type: 'category',
        data: [...this.timeData],
      },
      series: [
        {
          name: 'Voltaje (V)',
          type: 'line',
          data: [...this.voltageData],
          smooth: true,
          lineStyle: { width: 2 },
          itemStyle: { color: '#FF4560' },
        },
        {
          name: 'Corriente (A)',
          type: 'line',
          yAxisIndex: 1,
          data: [...this.currentData],
          smooth: true,
          lineStyle: { width: 2 },
          itemStyle: { color: '#00E396' },
        },
      ],
    };

    this.powerChartOption = {
      ...this.powerChartOption,
      xAxis: {
        type: 'category',
        data: [...this.timeData],
      },
      series: [
        {
          type: 'line',
          data: [...this.powerData],
          areaStyle: {},
          smooth: true,
          itemStyle: { color: '#008FFB' },
        },
      ],
    };

    this.energyChartOption = {
      ...this.energyChartOption,
      xAxis: {
        type: 'category',
        data: [...this.timeData],
      },
      series: [
        {
          type: 'bar',
          data: [...this.energyData],
          itemStyle: { color: '#FEB019' },
        },
      ],
    };
  }
}
