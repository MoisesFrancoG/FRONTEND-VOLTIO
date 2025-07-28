import {
  Component,
  Input,
  OnInit,
  OnDestroy,
  OnChanges,
  SimpleChanges,
  ChangeDetectorRef,
} from '@angular/core';
import { EChartsOption } from 'echarts';
import { Device } from '../../devices/services/device.service';

@Component({
  selector: 'app-pzem-monitoring',
  templateUrl: './pzem-monitoring.component.html',
  styleUrls: ['./pzem-monitoring.component.css'],
})
export class PzemMonitoringComponent implements OnInit, OnDestroy, OnChanges {
  @Input() selectedDevice: Device | null = null;
  @Input() isWebSocketConnected: boolean = false;

  // WebSocket privado para este componente
  private webSocket: WebSocket | null = null;

  // Datos para gráficas - Sensores eléctricos (PZEM)
  timeData: string[] = [];
  voltageData: number[] = [];
  currentData: number[] = [];
  powerData: number[] = [];
  energyData: number[] = [];
  frequencyData: number[] = [];
  powerFactorData: number[] = [];

  // Últimos valores para mostrar en tiempo real
  lastSensorValues = {
    voltage: 0,
    current: 0,
    power: 0,
    energy: 0,
    frequency: 0,
    powerFactor: 0,
  };

  // Configuración de gráficas específicas para PZEM
  selectedChart: 'voltage-current' | 'power' | 'energy' | 'frequency-pf' =
    'voltage-current';
  voltageCurrentChartOption: EChartsOption = {};
  powerChartOption: EChartsOption = {};
  energyChartOption: EChartsOption = {};
  frequencyPfChartOption: EChartsOption = {};

  constructor(private cdRef: ChangeDetectorRef) {
    console.log('🔧 PzemMonitoringComponent: Constructor llamado');
    this.initializeChartOptions();
  }

  ngOnInit(): void {
    console.log('🚀 PzemMonitoringComponent: ngOnInit iniciado');
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['selectedDevice'] && this.selectedDevice) {
      console.log('📱 Dispositivo PZEM seleccionado:', this.selectedDevice);
      this.resetMonitoringData();
      this.setupWebSocket();
    }
  }

  ngOnDestroy(): void {
    console.log('🛑 PzemMonitoringComponent: ngOnDestroy - Limpiando recursos');
    this.disconnectWebSocket();
  }

  // Métodos WebSocket específicos para PZEM
  setupWebSocket(): void {
    if (!this.selectedDevice) {
      console.error('❌ No hay dispositivo PZEM seleccionado para WebSocket');
      return;
    }

    console.log(
      '🔌 Configurando WebSocket para dispositivo PZEM:',
      this.selectedDevice.name
    );
    this.disconnectWebSocket(); // Desconectar WebSocket anterior si existe

    try {
      const deviceMac = this.selectedDevice.mac_address;
      const topic = 'pzem'; // Topic específico para PZEM

      const wsUrl = `wss://websocketvoltio.acstree.xyz/ws?topic=${topic}&mac=${deviceMac}`;
      console.log('🔗 Conectando WebSocket PZEM:', wsUrl);

      this.webSocket = new WebSocket(wsUrl);

      this.webSocket.onopen = () => {
        console.log('✅ WebSocket PZEM conectado exitosamente');
      };

      this.webSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('📊 Datos PZEM recibidos del WebSocket:', data);
          this.processWebSocketData(data);
        } catch (error) {
          console.error('❌ Error procesando datos del WebSocket PZEM:', error);
        }
      };

      this.webSocket.onclose = (event) => {
        console.log(
          '🔌 WebSocket PZEM desconectado:',
          event.code,
          event.reason
        );

        // Reconectar automáticamente después de 5 segundos si no fue intencional
        if (event.code !== 1000 && this.selectedDevice) {
          console.log('🔄 Reconectando WebSocket PZEM en 5 segundos...');
          setTimeout(() => {
            if (this.selectedDevice) {
              this.setupWebSocket();
            }
          }, 5000);
        }
      };

      this.webSocket.onerror = (error) => {
        console.error('❌ Error en WebSocket PZEM:', error);
      };
    } catch (error) {
      console.error('❌ Error configurando WebSocket PZEM:', error);
    }
  }

  disconnectWebSocket(): void {
    if (this.webSocket) {
      console.log('🔌 Desconectando WebSocket PZEM...');
      this.webSocket.close(1000, 'Desconexión intencional');
      this.webSocket = null;
    }
  }

  reconnectWebSocket(): void {
    console.log('🔄 Reconectando WebSocket PZEM...');
    this.setupWebSocket();
  }

  // Procesamiento de datos del WebSocket específico para PZEM
  processWebSocketData(data: any): void {
    const now = new Date().toLocaleTimeString();
    try {
      const contentObj = JSON.parse(data.content);
      const messageObj = JSON.parse(contentObj.message);
      console.log('📊 Datos PZEM procesados:', messageObj);
      // Agregar tiempo solo una vez por mensaje
      this.timeData.push(now);
      // Mantener solo los últimos 50 puntos de datos
      if (this.timeData.length > 50) {
        this.timeData.shift();
        this.voltageData.shift();
        this.currentData.shift();
        this.powerData.shift();
        this.energyData.shift();
        this.frequencyData.shift();
        this.powerFactorData.shift();
      }
      // Procesar datos eléctricos PZEM
      const payload = messageObj.payload;
      if (payload) {
        this.voltageData.push(payload.voltage || 0);
        this.currentData.push(payload.current || 0);
        this.powerData.push(payload.power || 0);
        this.energyData.push(payload.energy || 0);
        this.frequencyData.push(payload.frequency || 0);
        this.powerFactorData.push(payload.powerFactor || 0);
        // Actualizar últimos valores
        this.lastSensorValues.voltage = payload.voltage || 0;
        this.lastSensorValues.current = payload.current || 0;
        this.lastSensorValues.power = payload.power || 0;
        this.lastSensorValues.energy = payload.energy || 0;
        this.lastSensorValues.frequency = payload.frequency || 0;
        this.lastSensorValues.powerFactor = payload.powerFactor || 0;
        console.log('⚡ Valores PZEM actualizados:', this.lastSensorValues);
      }
      this.updateChartData();
      this.cdRef.detectChanges(); // Soluciona ExpressionChangedAfterItHasBeenCheckedError
    } catch (error) {
      console.error('❌ Error procesando datos del sensor PZEM:', error);
    }
  }

  // Métodos de gráficas específicas para PZEM
  initializeChartOptions(): void {
    // Gráfica de Voltaje y Corriente
    this.voltageCurrentChartOption = {
      title: {
        text: 'Voltaje y Corriente en Tiempo Real',
        left: 'center',
        textStyle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        textStyle: { color: '#fff' },
        borderColor: '#374151',
        borderWidth: 1,
      },
      legend: {
        data: ['Voltaje (V)', 'Corriente (A)'],
        top: 40,
        textStyle: { fontSize: 14 },
      },
      grid: {
        left: '5%',
        right: '5%',
        bottom: '10%',
        top: '20%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: this.timeData,
        axisLabel: { rotate: 45, fontSize: 12 },
        axisLine: { lineStyle: { color: '#d1d5db' } },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Voltaje (V)',
          position: 'left',
          axisLine: { lineStyle: { color: '#3b82f6' } },
          axisLabel: { color: '#3b82f6', fontSize: 12 },
          nameTextStyle: { color: '#3b82f6', fontSize: 14 },
        },
        {
          type: 'value',
          name: 'Corriente (A)',
          position: 'right',
          axisLine: { lineStyle: { color: '#ef4444' } },
          axisLabel: { color: '#ef4444', fontSize: 12 },
          nameTextStyle: { color: '#ef4444', fontSize: 14 },
        },
      ],
      series: [
        {
          name: 'Voltaje (V)',
          type: 'line',
          data: this.voltageData,
          smooth: true,
          yAxisIndex: 0,
          lineStyle: { color: '#3b82f6', width: 3 },
          itemStyle: { color: '#3b82f6' },
          symbol: 'circle',
          symbolSize: 6,
        },
        {
          name: 'Corriente (A)',
          type: 'line',
          data: this.currentData,
          smooth: true,
          yAxisIndex: 1,
          lineStyle: { color: '#ef4444', width: 3 },
          itemStyle: { color: '#ef4444' },
          symbol: 'circle',
          symbolSize: 6,
        },
      ],
    };

    // Gráfica de Potencia
    this.powerChartOption = {
      title: {
        text: 'Potencia en Tiempo Real',
        left: 'center',
        textStyle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        textStyle: { color: '#fff' },
        borderColor: '#374151',
        borderWidth: 1,
      },
      grid: {
        left: '5%',
        right: '5%',
        bottom: '10%',
        top: '20%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: this.timeData,
        axisLabel: { rotate: 45, fontSize: 12 },
        axisLine: { lineStyle: { color: '#d1d5db' } },
      },
      yAxis: {
        type: 'value',
        name: 'Potencia (W)',
        axisLine: { lineStyle: { color: '#10b981' } },
        axisLabel: { color: '#10b981', fontSize: 12 },
        nameTextStyle: { color: '#10b981', fontSize: 14 },
      },
      series: [
        {
          name: 'Potencia (W)',
          type: 'line',
          data: this.powerData,
          smooth: true,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16, 185, 129, 0.4)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.1)' },
              ],
            },
          },
          lineStyle: { color: '#10b981', width: 3 },
          itemStyle: { color: '#10b981' },
          symbol: 'circle',
          symbolSize: 6,
        },
      ],
    };

    // Gráfica de Energía
    this.energyChartOption = {
      title: {
        text: 'Energía Acumulada',
        left: 'center',
        textStyle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        textStyle: { color: '#fff' },
        borderColor: '#374151',
        borderWidth: 1,
      },
      grid: {
        left: '5%',
        right: '5%',
        bottom: '10%',
        top: '20%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: this.timeData,
        axisLabel: { rotate: 45, fontSize: 12 },
        axisLine: { lineStyle: { color: '#d1d5db' } },
      },
      yAxis: {
        type: 'value',
        name: 'Energía (kWh)',
        axisLine: { lineStyle: { color: '#8b5cf6' } },
        axisLabel: { color: '#8b5cf6', fontSize: 12 },
        nameTextStyle: { color: '#8b5cf6', fontSize: 14 },
      },
      series: [
        {
          name: 'Energía (kWh)',
          type: 'line',
          data: this.energyData,
          smooth: true,
          step: 'end',
          lineStyle: { color: '#8b5cf6', width: 3 },
          itemStyle: { color: '#8b5cf6' },
          symbol: 'circle',
          symbolSize: 6,
        },
      ],
    };

    // Gráfica de Frecuencia y Factor de Potencia
    this.frequencyPfChartOption = {
      title: {
        text: 'Frecuencia y Factor de Potencia',
        left: 'center',
        textStyle: { fontSize: 18, fontWeight: 'bold', color: '#1f2937' },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        textStyle: { color: '#fff' },
        borderColor: '#374151',
        borderWidth: 1,
      },
      legend: {
        data: ['Frecuencia (Hz)', 'Factor de Potencia'],
        top: 40,
        textStyle: { fontSize: 14 },
      },
      grid: {
        left: '5%',
        right: '5%',
        bottom: '10%',
        top: '20%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: this.timeData,
        axisLabel: { rotate: 45, fontSize: 12 },
        axisLine: { lineStyle: { color: '#d1d5db' } },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Frecuencia (Hz)',
          position: 'left',
          min: 59,
          max: 61,
          axisLine: { lineStyle: { color: '#f59e0b' } },
          axisLabel: { color: '#f59e0b', fontSize: 12 },
          nameTextStyle: { color: '#f59e0b', fontSize: 14 },
        },
        {
          type: 'value',
          name: 'Factor de Potencia',
          position: 'right',
          min: 0,
          max: 1,
          axisLine: { lineStyle: { color: '#06b6d4' } },
          axisLabel: { color: '#06b6d4', fontSize: 12 },
          nameTextStyle: { color: '#06b6d4', fontSize: 14 },
        },
      ],
      series: [
        {
          name: 'Frecuencia (Hz)',
          type: 'line',
          data: this.frequencyData,
          smooth: true,
          yAxisIndex: 0,
          lineStyle: { color: '#f59e0b', width: 3 },
          itemStyle: { color: '#f59e0b' },
          symbol: 'circle',
          symbolSize: 6,
        },
        {
          name: 'Factor de Potencia',
          type: 'line',
          data: this.powerFactorData,
          smooth: true,
          yAxisIndex: 1,
          lineStyle: { color: '#06b6d4', width: 3 },
          itemStyle: { color: '#06b6d4' },
          symbol: 'circle',
          symbolSize: 6,
        },
      ],
    };
  }

  updateChartData(): void {
    // Actualizar gráfica de Voltaje y Corriente
    this.voltageCurrentChartOption = {
      ...this.voltageCurrentChartOption,
      xAxis: {
        type: 'category',
        data: this.timeData,
        axisLabel: { rotate: 45, fontSize: 12 },
        axisLine: { lineStyle: { color: '#d1d5db' } },
      },
      series: [
        {
          name: 'Voltaje (V)',
          type: 'line',
          data: this.voltageData,
          smooth: true,
          yAxisIndex: 0,
          lineStyle: { color: '#3b82f6', width: 3 },
          itemStyle: { color: '#3b82f6' },
          symbol: 'circle',
          symbolSize: 6,
        },
        {
          name: 'Corriente (A)',
          type: 'line',
          data: this.currentData,
          smooth: true,
          yAxisIndex: 1,
          lineStyle: { color: '#ef4444', width: 3 },
          itemStyle: { color: '#ef4444' },
          symbol: 'circle',
          symbolSize: 6,
        },
      ],
    };

    // Actualizar gráfica de Potencia
    this.powerChartOption = {
      ...this.powerChartOption,
      xAxis: {
        type: 'category',
        data: this.timeData,
        axisLabel: { rotate: 45, fontSize: 12 },
        axisLine: { lineStyle: { color: '#d1d5db' } },
      },
      series: [
        {
          name: 'Potencia (W)',
          type: 'line',
          data: this.powerData,
          smooth: true,
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(16, 185, 129, 0.4)' },
                { offset: 1, color: 'rgba(16, 185, 129, 0.1)' },
              ],
            },
          },
          lineStyle: { color: '#10b981', width: 3 },
          itemStyle: { color: '#10b981' },
          symbol: 'circle',
          symbolSize: 6,
        },
      ],
    };

    // Actualizar gráfica de Energía
    this.energyChartOption = {
      ...this.energyChartOption,
      xAxis: {
        type: 'category',
        data: this.timeData,
        axisLabel: { rotate: 45, fontSize: 12 },
        axisLine: { lineStyle: { color: '#d1d5db' } },
      },
      series: [
        {
          name: 'Energía (kWh)',
          type: 'line',
          data: this.energyData,
          smooth: true,
          step: 'end',
          lineStyle: { color: '#8b5cf6', width: 3 },
          itemStyle: { color: '#8b5cf6' },
          symbol: 'circle',
          symbolSize: 6,
        },
      ],
    };

    // Actualizar gráfica de Frecuencia y Factor de Potencia
    this.frequencyPfChartOption = {
      ...this.frequencyPfChartOption,
      xAxis: {
        type: 'category',
        data: this.timeData,
        axisLabel: { rotate: 45, fontSize: 12 },
        axisLine: { lineStyle: { color: '#d1d5db' } },
      },
      series: [
        {
          name: 'Frecuencia (Hz)',
          type: 'line',
          data: this.frequencyData,
          smooth: true,
          yAxisIndex: 0,
          lineStyle: { color: '#f59e0b', width: 3 },
          itemStyle: { color: '#f59e0b' },
          symbol: 'circle',
          symbolSize: 6,
        },
        {
          name: 'Factor de Potencia',
          type: 'line',
          data: this.powerFactorData,
          smooth: true,
          yAxisIndex: 1,
          lineStyle: { color: '#06b6d4', width: 3 },
          itemStyle: { color: '#06b6d4' },
          symbol: 'circle',
          symbolSize: 6,
        },
      ],
    };
  }

  setChart(
    chartType: 'voltage-current' | 'power' | 'energy' | 'frequency-pf'
  ): void {
    console.log('📊 Cambiando a gráfica PZEM:', chartType);
    this.selectedChart = chartType;
  }

  // Método auxiliar para cambiar gráfica desde template
  setChartFromString(chartType: string): void {
    this.setChart(
      chartType as 'voltage-current' | 'power' | 'energy' | 'frequency-pf'
    );
  }

  // Métodos para calcular promedios
  getAverageVoltage(): number {
    return this.voltageData.length > 0
      ? this.voltageData.reduce((a, b) => a + b, 0) / this.voltageData.length
      : 0;
  }

  getAveragePower(): number {
    return this.powerData.length > 0
      ? this.powerData.reduce((a, b) => a + b, 0) / this.powerData.length
      : 0;
  }

  // Métodos utilitarios específicos para PZEM
  resetMonitoringData(): void {
    // Datos eléctricos
    this.timeData = [];
    this.voltageData = [];
    this.currentData = [];
    this.powerData = [];
    this.energyData = [];
    this.frequencyData = [];
    this.powerFactorData = [];

    // Últimos valores
    this.lastSensorValues = {
      voltage: 0,
      current: 0,
      power: 0,
      energy: 0,
      frequency: 0,
      powerFactor: 0,
    };

    // Gráfica por defecto
    this.selectedChart = 'voltage-current';
    this.updateChartData();
  }

  // Métodos para obtener gráficas disponibles
  getAvailableCharts(): string[] {
    return ['voltage-current', 'power', 'energy', 'frequency-pf'];
  }

  // Método para obtener el nombre legible de la gráfica
  getChartName(chartType: string): string {
    const chartNames: { [key: string]: string } = {
      'voltage-current': 'Voltaje y Corriente',
      power: 'Potencia',
      energy: 'Energía',
      'frequency-pf': 'Frecuencia y Factor de Potencia',
    };
    return chartNames[chartType] || chartType;
  }

  // Métodos para obtener el estado de conexión
  get isConnected(): boolean {
    return (
      this.webSocket !== null && this.webSocket.readyState === WebSocket.OPEN
    );
  }

  // Métodos para formateo de datos eléctricos
  getVoltageColor(voltage: number): string {
    if (voltage < 110) return 'text-red-500';
    if (voltage < 115) return 'text-orange-500';
    if (voltage > 125) return 'text-red-500';
    if (voltage > 120) return 'text-orange-500';
    return 'text-green-500';
  }

  getCurrentColor(current: number): string {
    if (current < 1) return 'text-green-500';
    if (current < 5) return 'text-blue-500';
    if (current < 10) return 'text-orange-500';
    return 'text-red-500';
  }

  getPowerColor(power: number): string {
    if (power < 100) return 'text-green-500';
    if (power < 500) return 'text-blue-500';
    if (power < 1000) return 'text-orange-500';
    return 'text-red-500';
  }

  getFrequencyColor(frequency: number): string {
    if (frequency >= 59.5 && frequency <= 60.5) return 'text-green-500';
    if (frequency >= 59 && frequency <= 61) return 'text-orange-500';
    return 'text-red-500';
  }

  getPowerFactorColor(pf: number): string {
    if (pf >= 0.9) return 'text-green-500';
    if (pf >= 0.8) return 'text-blue-500';
    if (pf >= 0.7) return 'text-orange-500';
    return 'text-red-500';
  }

  // Métodos para obtener información del dispositivo
  getCurrentTime(): string {
    return new Date().toLocaleTimeString();
  }

  getDeviceStatus(): string {
    if (this.isConnected && this.timeData.length > 0) {
      return 'Monitoreando';
    } else if (this.isConnected) {
      return 'Conectado';
    } else {
      return 'Desconectado';
    }
  }

  getDeviceStatusColor(): string {
    if (this.isConnected && this.timeData.length > 0) {
      return 'text-green-500';
    } else if (this.isConnected) {
      return 'text-blue-500';
    } else {
      return 'text-red-500';
    }
  }
}
