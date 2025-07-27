import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../auth/services/auth.service';
import { Device } from '../../devices/services/device.service';
import { EChartsOption } from 'echarts';
import { ChartData } from '../services/historial.service';
import {
  SensorHistoryService,
  EnvironmentReading,
  LightReading,
  MotionReading,
  SensorStatistics,
  ProbabilityAnalysis,
} from '../services/sensor-history.service';

@Component({
  selector: 'app-sensor-history',
  templateUrl: './sensor-history.component.html',
  styleUrl: './sensor-history.component.css',
})
export class SensorHistoryComponent implements OnInit {
  // Estados de la vista
  isLoading = false;
  hasError = false;
  errorMessage = '';

  // Datos de dispositivos
  userDevices: Device[] = [];
  sensorDevices: Device[] = [];
  selectedDevice: Device | null = null;

  // Configuración de sensores
  selectedSensorType: 'temperature' | 'light' | 'motion' | '' = '';
  selectedPeriod: '1d' | '1w' | '1m' = '1w';
  selectedAnalysisType: 'chart' | 'statistics' | 'both' = 'both';

  // Datos históricos
  temperatureHistory: EnvironmentReading[] = [];
  lightHistory: LightReading[] = [];
  motionHistory: MotionReading[] = [];

  // Configuración de gráficas
  chartOption: EChartsOption = {};

  // Datos para múltiples tipos de gráficas
  boxplotData: any = null;
  frequencyBarsData: ChartData[] = [];
  pieData: ChartData[] = [];
  selectedChartType: string = 'boxplot';

  // Opciones de tipos de gráficas
  graphTypes = [
    {
      value: 'boxplot',
      label: 'Boxplot',
      icon: '📦',
      description: 'Análisis de cuartiles (Q1, Q3) y valores extremos',
    },
    {
      value: 'frequencyBars',
      label: 'Barras de Frecuencia',
      icon: '📊',
      description: 'Frecuencia por rangos',
    },
    {
      value: 'pie',
      label: 'Gráfico de Pastel',
      icon: '🥧',
      description: 'Distribución porcentual',
    },
  ];

  // Estadísticas
  statistics: SensorStatistics | null = null;

  // Probabilidades para análisis
  probabilities: ProbabilityAnalysis = {};

  // Configuración de tipos de sensores
  sensorTypes = [
    {
      value: 'temperature',
      label: '🌡️ Temperatura y Humedad',
      description: 'Análisis de condiciones ambientales',
      variables: ['temperature', 'humidity'],
    },
    {
      value: 'light',
      label: '💡 Nivel de Luz',
      description: 'Medición de luminosidad ambiental',
      variables: ['light_level'],
    },
    {
      value: 'motion',
      label: '🚶 Detección de Movimiento',
      description: 'Eventos de presencia y actividad',
      variables: ['motion_detected'],
    },
  ];

  // Períodos disponibles
  periods = [
    {
      value: '1d',
      label: 'Último día',
      description: '24 horas de datos',
      icon: '📅',
    },
    {
      value: '1w',
      label: 'Última semana',
      description: '7 días de datos',
      icon: '📆',
    },
    {
      value: '1m',
      label: 'Último mes',
      description: '30 días de datos',
      icon: '🗓️',
    },
  ];

  // Tipos de análisis
  analysisTypes = [
    {
      value: 'chart',
      label: '📊 Solo Gráficas',
      description: 'Visualización temporal',
      icon: '📈',
    },
    {
      value: 'statistics',
      label: '📋 Solo Estadísticas',
      description: 'Análisis numérico',
      icon: '🔢',
    },
    {
      value: 'both',
      label: '📊📋 Completo',
      description: 'Gráficas + Estadísticas',
      icon: '💯',
    },
  ];

  constructor(
    private authService: AuthService,
    private sensorHistoryService: SensorHistoryService,
    public router: Router
  ) {}

  ngOnInit(): void {
    console.log('🔬 SensorHistoryComponent: Iniciando componente');
    if (this.isAuthenticated()) {
      this.loadUserDevices();
    }
  }

  // Métodos de autenticación
  isAuthenticated(): boolean {
    return this.authService.isLoggedIn();
  }

  goToLogin(): void {
    this.router.navigate(['/auth/login']);
  }

  getCurrentUser(): any {
    return this.authService.getCurrentUserData();
  }

  // Métodos de carga de dispositivos
  async loadUserDevices(): Promise<void> {
    console.log('📱 Cargando dispositivos del usuario...');
    this.isLoading = true;
    this.hasError = false;

    try {
      this.sensorDevices =
        (await this.sensorHistoryService.getUserSensorDevices().toPromise()) ||
        [];
      this.userDevices = this.sensorDevices; // Para mantener compatibilidad
      console.log(
        '✅ Dispositivos sensores cargados:',
        this.sensorDevices.length
      );
    } catch (error) {
      console.error('❌ Error cargando dispositivos:', error);
      this.hasError = true;
      this.errorMessage = this.sensorHistoryService.handleApiError(error);
    } finally {
      this.isLoading = false;
    }
  }

  // Métodos de selección
  onDeviceChange(): void {
    console.log('📱 Dispositivo seleccionado:', this.selectedDevice?.name);
    this.selectedSensorType = '';
    this.resetData();
  }

  onSensorTypeChange(): void {
    console.log('🔬 Tipo de sensor seleccionado:', this.selectedSensorType);
    if (this.selectedDevice && this.selectedSensorType) {
      this.loadSensorData();
    }
  }

  onPeriodChange(): void {
    console.log('📅 Período seleccionado:', this.selectedPeriod);
    if (this.selectedDevice && this.selectedSensorType) {
      this.loadSensorData();
    }
  }

  onAnalysisTypeChange(): void {
    console.log('📊 Tipo de análisis seleccionado:', this.selectedAnalysisType);
  }

  onGraphTypeChange(graphType: string): void {
    this.selectedChartType = graphType;
    console.log(`📊 Tipo de gráfica cambiado a: ${graphType}`);
  }

  // Métodos de carga de datos
  async loadSensorData(): Promise<void> {
    if (!this.selectedDevice || !this.selectedSensorType) {
      return;
    }

    // Validar parámetros antes de hacer la petición
    const validation = this.sensorHistoryService.validateHistoryParams(
      this.selectedDevice.mac_address,
      this.selectedPeriod,
      this.selectedSensorType
    );

    if (!validation.isValid) {
      this.hasError = true;
      this.errorMessage = validation.error || 'Parámetros inválidos';
      return;
    }

    this.isLoading = true;
    this.hasError = false;
    this.resetData();

    const mac = this.selectedDevice.mac_address;

    try {
      switch (this.selectedSensorType) {
        case 'temperature':
          await this.loadTemperatureData(mac);
          break;
        case 'light':
          await this.loadLightData(mac);
          break;
        case 'motion':
          await this.loadMotionData(mac);
          break;
      }
    } catch (error: any) {
      console.error('❌ Error cargando datos del sensor:', error);
      this.hasError = true;
      this.errorMessage = this.sensorHistoryService.handleApiError(error);
    } finally {
      this.isLoading = false;
    }
  }

  private async loadTemperatureData(mac: string): Promise<void> {
    const data = await this.sensorHistoryService
      .getTemperatureHistory(mac, this.selectedPeriod)
      .toPromise();

    if (data && data.length > 0) {
      this.temperatureHistory = data;
      this.createTemperatureChart();
      this.calculateTemperatureStatistics();
      this.prepareMultipleChartData(); // Preparar datos para múltiples gráficas
      console.log(
        '✅ Datos de temperatura cargados:',
        this.temperatureHistory.length
      );
    } else {
      throw new Error(
        'No se encontraron datos de temperatura para el período seleccionado'
      );
    }
  }

  private async loadLightData(mac: string): Promise<void> {
    const data = await this.sensorHistoryService
      .getLightHistory(mac, this.selectedPeriod)
      .toPromise();

    if (data && data.length > 0) {
      this.lightHistory = data;
      this.createLightChart();
      this.calculateLightStatistics();
      this.prepareMultipleChartData(); // Preparar datos para múltiples gráficas
      console.log('✅ Datos de luz cargados:', this.lightHistory.length);
    } else {
      throw new Error(
        'No se encontraron datos de luz para el período seleccionado'
      );
    }
  }

  private async loadMotionData(mac: string): Promise<void> {
    const data = await this.sensorHistoryService
      .getMotionHistory(mac, this.selectedPeriod)
      .toPromise();

    if (data && data.length > 0) {
      this.motionHistory = data;
      this.createMotionChart();
      this.calculateMotionStatistics();
      this.prepareMultipleChartData(); // Preparar datos para múltiples gráficas
      console.log(
        '✅ Datos de movimiento cargados:',
        this.motionHistory.length
      );
    } else {
      throw new Error(
        'No se encontraron datos de movimiento para el período seleccionado'
      );
    }
  }

  // Métodos de creación de gráficas
  private createTemperatureChart(): void {
    const chartData = this.sensorHistoryService.prepareTemperatureChartData(
      this.temperatureHistory
    );
    const times = chartData.timestamps.map((timestamp) =>
      this.sensorHistoryService.formatTimestampForChart(timestamp)
    );

    this.chartOption = {
      title: {
        text: '🌡️ Historial de Temperatura y Humedad',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
        },
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: {
          type: 'cross',
          animation: false,
        },
        formatter: (params: any) => {
          const time = params[0].name;
          let tooltip = `<strong>${time}</strong><br/>`;
          params.forEach((param: any) => {
            tooltip += `${param.marker} ${param.seriesName}: <strong>${
              param.value
            }${
              param.seriesName.includes('Temperatura') ? '°C' : '%'
            }</strong><br/>`;
          });
          return tooltip;
        },
      },
      legend: {
        data: ['Temperatura', 'Humedad'],
        top: '10%',
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '20%',
      },
      xAxis: {
        type: 'category',
        data: times,
        axisLabel: {
          formatter: (value: string) => {
            const date = new Date(value);
            return `${
              date.getMonth() + 1
            }/${date.getDate()}\n${date.getHours()}:${date
              .getMinutes()
              .toString()
              .padStart(2, '0')}`;
          },
          rotate: 45,
        },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Temperatura (°C)',
          position: 'left',
          axisLine: {
            lineStyle: {
              color: '#ff6b6b',
            },
          },
          axisLabel: {
            formatter: '{value}°C',
          },
        },
        {
          type: 'value',
          name: 'Humedad (%)',
          position: 'right',
          axisLine: {
            lineStyle: {
              color: '#4ecdc4',
            },
          },
          axisLabel: {
            formatter: '{value}%',
          },
        },
      ],
      series: [
        {
          name: 'Temperatura',
          type: 'line',
          yAxisIndex: 0,
          data: chartData.temperatures,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          itemStyle: {
            color: '#ff6b6b',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(255, 107, 107, 0.3)' },
                { offset: 1, color: 'rgba(255, 107, 107, 0.1)' },
              ],
            },
          },
        },
        {
          name: 'Humedad',
          type: 'line',
          yAxisIndex: 1,
          data: chartData.humidities,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          itemStyle: {
            color: '#4ecdc4',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(78, 205, 196, 0.3)' },
                { offset: 1, color: 'rgba(78, 205, 196, 0.1)' },
              ],
            },
          },
        },
      ],
    };
  }

  private createLightChart(): void {
    const chartData = this.sensorHistoryService.prepareLightChartData(
      this.lightHistory
    );
    const times = chartData.timestamps.map((timestamp) =>
      this.sensorHistoryService.formatTimestampForChart(timestamp)
    );

    this.chartOption = {
      title: {
        text: '💡 Historial de Nivel de Luz',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
        },
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const data = params[0];
          return `<strong>${data.name}</strong><br/>💡 Nivel de Luz: <strong>${data.value} lux</strong>`;
        },
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '15%',
      },
      xAxis: {
        type: 'category',
        data: times,
        axisLabel: {
          formatter: (value: string) => {
            const date = new Date(value);
            return `${
              date.getMonth() + 1
            }/${date.getDate()}\n${date.getHours()}:${date
              .getMinutes()
              .toString()
              .padStart(2, '0')}`;
          },
          rotate: 45,
        },
      },
      yAxis: {
        type: 'value',
        name: 'Nivel de Luz (lux)',
        axisLabel: {
          formatter: '{value} lux',
        },
      },
      series: [
        {
          name: 'Nivel de Luz',
          type: 'line',
          data: chartData.lightLevels,
          smooth: true,
          symbol: 'circle',
          symbolSize: 4,
          itemStyle: {
            color: '#ffd93d',
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(255, 217, 61, 0.4)' },
                { offset: 1, color: 'rgba(255, 217, 61, 0.1)' },
              ],
            },
          },
        },
      ],
    };
  }

  private createMotionChart(): void {
    const chartData = this.sensorHistoryService.prepareMotionChartData(
      this.motionHistory
    );
    const times = chartData.timestamps.map((timestamp) =>
      this.sensorHistoryService.formatTimestampForChart(timestamp)
    );

    this.chartOption = {
      title: {
        text: '🚶 Historial de Detección de Movimiento',
        left: 'center',
        textStyle: {
          fontSize: 16,
          fontWeight: 'bold',
        },
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const data = params[0];
          const detected = data.value === 1 ? 'Detectado' : 'No detectado';
          return `<strong>${data.name}</strong><br/>🚶 Movimiento: <strong>${detected}</strong>`;
        },
      },
      grid: {
        left: '10%',
        right: '10%',
        bottom: '15%',
        top: '15%',
      },
      xAxis: {
        type: 'category',
        data: times,
        axisLabel: {
          formatter: (value: string) => {
            const date = new Date(value);
            return `${
              date.getMonth() + 1
            }/${date.getDate()}\n${date.getHours()}:${date
              .getMinutes()
              .toString()
              .padStart(2, '0')}`;
          },
          rotate: 45,
        },
      },
      yAxis: {
        type: 'value',
        name: 'Estado',
        min: 0,
        max: 1,
        axisLabel: {
          formatter: (value: number) => {
            return value === 1 ? 'Detectado' : 'No detectado';
          },
        },
      },
      series: [
        {
          name: 'Movimiento',
          type: 'line',
          data: chartData.motionValues,
          step: 'end',
          symbol: 'circle',
          symbolSize: 6,
          itemStyle: {
            color: '#a78bfa',
          },
          lineStyle: {
            width: 3,
          },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(167, 139, 250, 0.4)' },
                { offset: 1, color: 'rgba(167, 139, 250, 0.1)' },
              ],
            },
          },
        },
      ],
    };
  }

  // Métodos de cálculo de estadísticas
  private calculateTemperatureStatistics(): void {
    const analysis = this.sensorHistoryService.calculateTemperatureStatistics(
      this.temperatureHistory
    );
    this.statistics = analysis.temperatureStats; // Usar estadísticas de temperatura como principales
    this.probabilities = analysis.probabilities;
  }

  private calculateLightStatistics(): void {
    const analysis = this.sensorHistoryService.calculateLightStatistics(
      this.lightHistory
    );
    this.statistics = analysis.lightStats;
    this.probabilities = analysis.probabilities;
  }

  private calculateMotionStatistics(): void {
    const analysis = this.sensorHistoryService.calculateMotionStatistics(
      this.motionHistory
    );
    this.statistics = analysis.motionStats;
    this.probabilities = analysis.probabilities;
  }

  // Métodos utilitarios
  private resetData(): void {
    this.temperatureHistory = [];
    this.lightHistory = [];
    this.motionHistory = [];
    this.chartOption = {};
    this.statistics = null;
    this.probabilities = {};
  }

  // Métodos de información
  getSensorTypeInfo() {
    return (
      this.sensorTypes.find((type) => type.value === this.selectedSensorType) ||
      this.sensorTypes[0]
    );
  }

  getPeriodInfo() {
    return (
      this.periods.find((period) => period.value === this.selectedPeriod) ||
      this.periods[1]
    );
  }

  getAnalysisTypeInfo() {
    return (
      this.analysisTypes.find(
        (type) => type.value === this.selectedAnalysisType
      ) || this.analysisTypes[2]
    );
  }

  // Métodos de navegación
  refreshData(): void {
    if (this.selectedDevice && this.selectedSensorType) {
      this.loadSensorData();
    }
  }

  goToDevices(): void {
    this.router.navigate(['/devices']);
  }

  goToEnergyAnalysis(): void {
    this.router.navigate(['/historial']);
  }

  // Getters para mostrar datos en el template
  getCurrentData(): any[] {
    switch (this.selectedSensorType) {
      case 'temperature':
        return this.temperatureHistory;
      case 'light':
        return this.lightHistory;
      case 'motion':
        return this.motionHistory;
      default:
        return [];
    }
  }

  // Preparar datos para múltiples tipos de gráficas
  private prepareMultipleChartData(): void {
    if (!this.selectedDevice || !this.selectedSensorType) return;

    const values = this.getCurrentValues();
    if (values.length === 0) return;

    // Preparar datos para boxplot
    this.boxplotData = this.prepareBoxplotDataFromValues(values);

    // Preparar datos para barras de frecuencia
    this.frequencyBarsData = this.prepareFrequencyData(values);

    // Preparar datos para gráfico de pastel
    this.pieData = this.preparePieData(values);

    console.log('✅ Datos preparados para múltiples gráficas');
  }

  private getCurrentValues(): number[] {
    switch (this.selectedSensorType) {
      case 'temperature':
        return this.temperatureHistory.map((reading) => reading.temperature);
      case 'light':
        return this.lightHistory.map((reading) => reading.light_level);
      case 'motion':
        return this.motionHistory.map((reading) =>
          reading.motion_detected ? 1 : 0
        );
      default:
        return [];
    }
  }

  private getCurrentTimestamps(): string[] {
    switch (this.selectedSensorType) {
      case 'temperature':
        return this.temperatureHistory.map((reading) => reading.timestamp);
      case 'light':
        return this.lightHistory.map((reading) => reading.timestamp);
      case 'motion':
        return this.motionHistory.map((reading) => reading.timestamp);
      default:
        return [];
    }
  }

  private prepareBoxplotDataFromValues(values: number[]): any {
    if (values.length === 0) return null;

    const sorted = [...values].sort((a, b) => a - b);
    const q1Index = Math.floor(sorted.length * 0.25);
    const q2Index = Math.floor(sorted.length * 0.5);
    const q3Index = Math.floor(sorted.length * 0.75);

    return {
      name: this.getSensorLabel(),
      data: [
        [
          sorted[0], // min
          sorted[q1Index], // q1
          sorted[q2Index], // median
          sorted[q3Index], // q3
          sorted[sorted.length - 1], // max
        ],
      ],
      extra: {
        code: this.selectedSensorType,
      },
    };
  }

  private prepareFrequencyData(values: number[]): ChartData[] {
    const frequencyMap = new Map<string, number>();

    values.forEach((value) => {
      const range = this.getValueRange(value);
      frequencyMap.set(range, (frequencyMap.get(range) || 0) + 1);
    });

    return Array.from(frequencyMap.entries()).map(([range, count]) => ({
      name: range,
      value: count,
      extra: {
        code: range,
      },
    }));
  }

  private preparePieData(values: number[]): ChartData[] {
    const total = values.length;
    const ranges = ['Bajo', 'Medio', 'Alto'];
    const counts = [0, 0, 0];

    values.forEach((value) => {
      const normalized = this.normalizeValue(value);
      if (normalized < 0.33) counts[0]++;
      else if (normalized < 0.66) counts[1]++;
      else counts[2]++;
    });

    return ranges.map((range, index) => ({
      name: range,
      value: Math.round((counts[index] / total) * 100),
      extra: {
        code: range,
      },
    }));
  }

  private getValueRange(value: number): string {
    const normalized = this.normalizeValue(value);
    if (normalized < 0.33) return 'Bajo';
    if (normalized < 0.66) return 'Medio';
    return 'Alto';
  }

  private normalizeValue(value: number): number {
    const values = this.getCurrentValues();
    const min = Math.min(...values);
    const max = Math.max(...values);
    return max === min ? 0.5 : (value - min) / (max - min);
  }

  getSensorLabel(): string {
    switch (this.selectedSensorType) {
      case 'temperature':
        return 'Temperatura (°C)';
      case 'light':
        return 'Nivel de Luz (lux)';
      case 'motion':
        return 'Detección de Movimiento';
      default:
        return 'Sensor';
    }
  }

  getDataUnit(): string {
    if (!this.selectedSensorType) return '';
    return this.sensorHistoryService.getDataUnit(
      this.selectedSensorType as 'temperature' | 'light' | 'motion'
    );
  }
}
