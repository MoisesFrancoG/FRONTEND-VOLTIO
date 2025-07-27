import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, switchMap, throwError } from 'rxjs';
import { AuthService } from '../../auth/services/auth.service';
import { DeviceService, Device } from '../../devices/services/device.service';

// Interfaces para datos de sensores
export interface EnvironmentReading {
  mac: string;
  temperature: number;
  humidity: number;
  timestamp: string;
}

export interface LightReading {
  mac: string;
  light_level: number;
  timestamp: string;
}

export interface MotionReading {
  mac: string;
  motion_detected: boolean;
  timestamp: string;
}

export interface SensorHistoricalData {
  lecturas: EnvironmentReading[] | LightReading[] | MotionReading[];
}

export interface SensorStatistics {
  mean: number;
  median: number;
  mode: number | null;
  standardDeviation: number;
  min: number;
  max: number;
  range: number;
  count: number;
}

export interface ChartSeriesData {
  name: string;
  data: number[];
  timestamps: string[];
}

export interface ProbabilityAnalysis {
  [key: string]: number;
}

@Injectable({
  providedIn: 'root',
})
export class SensorHistoryService {
  private baseUrl = 'https://voltioapi.acstree.xyz/api/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private deviceService: DeviceService
  ) {}

  // ========== MÉTODOS DE DISPOSITIVOS ==========

  /**
   * Obtiene dispositivos sensores del usuario (tipo 2 - nodos de sensado)
   */
  getUserSensorDevices(): Observable<Device[]> {
    console.log(
      '🔬 SensorHistoryService: Obteniendo dispositivos sensores del usuario...'
    );

    return this.deviceService.getMyDevices().pipe(
      map((devices) => {
        console.log('📱 Todos los dispositivos del usuario:', devices);

        // Filtrar solo dispositivos tipo sensor (device_type_id === 2)
        const sensorDevices = devices.filter(
          (device) => device.device_type_id === 2
        );
        console.log('🔬 Dispositivos sensores encontrados:', sensorDevices);

        return sensorDevices;
      })
    );
  }

  /**
   * Obtiene MAC addresses de dispositivos sensores
   */
  getSensorMacAddresses(): Observable<string[]> {
    return this.getUserSensorDevices().pipe(
      map((sensorDevices) => {
        const macAddresses = sensorDevices.map((device) => device.mac_address);
        console.log('🔗 MAC addresses de dispositivos sensores:', macAddresses);
        return macAddresses;
      })
    );
  }

  // ========== MÉTODOS DE CARGA DE DATOS ==========

  /**
   * Carga datos de temperatura y humedad
   */
  getTemperatureHistory(
    mac: string,
    period: '1d' | '1w' | '1m' = '1w'
  ): Observable<EnvironmentReading[]> {
    console.log(
      '🌡️ Cargando historial de temperatura para MAC:',
      mac,
      'Período:',
      period
    );

    const encodedMac = encodeURIComponent(mac);
    const url = `${this.baseUrl}/environment/history/${period}?mac=${encodedMac}`;
    const headers = this.getAuthHeaders();

    return this.http.get<SensorHistoricalData>(url, { headers }).pipe(
      map((response) => {
        const readings = (response?.lecturas as EnvironmentReading[]) || [];
        console.log(
          '✅ Datos de temperatura cargados:',
          readings.length,
          'registros'
        );
        return readings;
      })
    );
  }

  /**
   * Carga datos de nivel de luz
   */
  getLightHistory(
    mac: string,
    period: '1d' | '1w' | '1m' = '1w'
  ): Observable<LightReading[]> {
    console.log(
      '💡 Cargando historial de luz para MAC:',
      mac,
      'Período:',
      period
    );

    const encodedMac = encodeURIComponent(mac);
    const url = `${this.baseUrl}/light/history/${period}?mac=${encodedMac}`;
    const headers = this.getAuthHeaders();

    return this.http.get<SensorHistoricalData>(url, { headers }).pipe(
      map((response) => {
        const readings = (response?.lecturas as LightReading[]) || [];
        console.log('✅ Datos de luz cargados:', readings.length, 'registros');
        return readings;
      })
    );
  }

  /**
   * Carga datos de detección de movimiento
   */
  getMotionHistory(
    mac: string,
    period: '1d' | '1w' | '1m' = '1w'
  ): Observable<MotionReading[]> {
    console.log(
      '🚶 Cargando historial de movimiento para MAC:',
      mac,
      'Período:',
      period
    );

    const encodedMac = encodeURIComponent(mac);
    const url = `${this.baseUrl}/motion/events/${period}?mac=${encodedMac}`;
    const headers = this.getAuthHeaders();

    return this.http.get<SensorHistoricalData>(url, { headers }).pipe(
      map((response) => {
        const readings = (response?.lecturas as MotionReading[]) || [];
        console.log(
          '✅ Datos de movimiento cargados:',
          readings.length,
          'registros'
        );
        return readings;
      })
    );
  }

  // ========== MÉTODOS DE ANÁLISIS ESTADÍSTICO ==========

  /**
   * Calcula estadísticas básicas para un conjunto de valores numéricos
   */
  calculateBasicStatistics(values: number[]): SensorStatistics {
    if (values.length === 0) {
      return {
        mean: 0,
        median: 0,
        mode: null,
        standardDeviation: 0,
        min: 0,
        max: 0,
        range: 0,
        count: 0,
      };
    }

    const sortedValues = [...values].sort((a, b) => a - b);
    const count = values.length;

    // Cálculos básicos
    const mean = values.reduce((sum, val) => sum + val, 0) / count;
    const median =
      count % 2 === 0
        ? (sortedValues[count / 2 - 1] + sortedValues[count / 2]) / 2
        : sortedValues[Math.floor(count / 2)];

    // Moda (valor más frecuente)
    const frequencyMap = values.reduce((acc, val) => {
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {} as { [key: number]: number });

    const maxFreq = Math.max(...Object.values(frequencyMap));
    const modes = Object.keys(frequencyMap).filter(
      (key) => frequencyMap[Number(key)] === maxFreq
    );
    const mode = modes.length === count ? null : Number(modes[0]); // Si todos son únicos, no hay moda

    // Desviación estándar
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / count;
    const standardDeviation = Math.sqrt(variance);

    const min = Math.min(...values);
    const max = Math.max(...values);

    return {
      mean,
      median,
      mode,
      standardDeviation,
      min,
      max,
      range: max - min,
      count,
    };
  }

  /**
   * Calcula estadísticas específicas para datos de temperatura
   */
  calculateTemperatureStatistics(data: EnvironmentReading[]): {
    temperatureStats: SensorStatistics;
    humidityStats: SensorStatistics;
    probabilities: ProbabilityAnalysis;
  } {
    const temperatures = data.map((r) => r.temperature);
    const humidities = data.map((r) => r.humidity);

    const temperatureStats = this.calculateBasicStatistics(temperatures);
    const humidityStats = this.calculateBasicStatistics(humidities);

    // Calcular probabilidades específicas para temperatura
    const probabilities: ProbabilityAnalysis = {
      'Temperatura > 25°C':
        temperatures.filter((t) => t > 25).length / temperatures.length,
      'Temperatura < 20°C':
        temperatures.filter((t) => t < 20).length / temperatures.length,
      'Temperatura 20-25°C':
        temperatures.filter((t) => t >= 20 && t <= 25).length /
        temperatures.length,
      'Humedad > 60%':
        humidities.filter((h) => h > 60).length / humidities.length,
      'Humedad < 40%':
        humidities.filter((h) => h < 40).length / humidities.length,
      'Condiciones Confortables (20-25°C, 40-60%)':
        data.filter(
          (r) =>
            r.temperature >= 20 &&
            r.temperature <= 25 &&
            r.humidity >= 40 &&
            r.humidity <= 60
        ).length / data.length,
    };

    return { temperatureStats, humidityStats, probabilities };
  }

  /**
   * Calcula estadísticas específicas para datos de luz
   */
  calculateLightStatistics(data: LightReading[]): {
    lightStats: SensorStatistics;
    probabilities: ProbabilityAnalysis;
  } {
    const lightLevels = data.map((r) => r.light_level);
    const lightStats = this.calculateBasicStatistics(lightLevels);

    // Calcular probabilidades específicas para luz
    const probabilities: ProbabilityAnalysis = {
      'Luz Alta (>50 lux)':
        lightLevels.filter((l) => l > 50).length / lightLevels.length,
      'Luz Media (20-50 lux)':
        lightLevels.filter((l) => l >= 20 && l <= 50).length /
        lightLevels.length,
      'Luz Baja (<20 lux)':
        lightLevels.filter((l) => l < 20).length / lightLevels.length,
      'Condiciones Diurnas (>30 lux)':
        lightLevels.filter((l) => l > 30).length / lightLevels.length,
      'Condiciones Nocturnas (<10 lux)':
        lightLevels.filter((l) => l < 10).length / lightLevels.length,
      'Iluminación Óptima (>100 lux)':
        lightLevels.filter((l) => l > 100).length / lightLevels.length,
    };

    return { lightStats, probabilities };
  }

  /**
   * Calcula estadísticas específicas para datos de movimiento
   */
  calculateMotionStatistics(data: MotionReading[]): {
    motionStats: SensorStatistics;
    probabilities: ProbabilityAnalysis;
  } {
    const motionEvents = data.map((r) => (r.motion_detected ? 1 : 0));
    const motionStats = this.calculateBasicStatistics(motionEvents);

    // Calcular probabilidades específicas para movimiento
    const totalEvents = data.length;
    const detectedEvents = data.filter((r) => r.motion_detected).length;
    const detectionRate = detectedEvents / totalEvents;

    const probabilities: ProbabilityAnalysis = {
      'Movimiento Detectado': detectionRate,
      'Sin Movimiento': 1 - detectionRate,
      'Actividad Alta (>70%)': detectionRate > 0.7 ? 1 : 0,
      'Actividad Media (30-70%)':
        detectionRate >= 0.3 && detectionRate <= 0.7 ? 1 : 0,
      'Actividad Baja (<30%)': detectionRate < 0.3 ? 1 : 0,
      'Zona Activa': detectionRate > 0.5 ? 1 : 0,
    };

    return { motionStats, probabilities };
  }

  // ========== MÉTODOS PARA PREPARACIÓN DE DATOS DE GRÁFICAS ==========

  /**
   * Prepara datos de temperatura para gráficas ECharts
   */
  prepareTemperatureChartData(data: EnvironmentReading[]): {
    timestamps: string[];
    temperatures: number[];
    humidities: number[];
  } {
    const timestamps = data.map((reading) =>
      new Date(reading.timestamp).toLocaleString()
    );
    const temperatures = data.map((reading) => reading.temperature);
    const humidities = data.map((reading) => reading.humidity);

    return { timestamps, temperatures, humidities };
  }

  /**
   * Prepara datos de luz para gráficas ECharts
   */
  prepareLightChartData(data: LightReading[]): {
    timestamps: string[];
    lightLevels: number[];
  } {
    const timestamps = data.map((reading) =>
      new Date(reading.timestamp).toLocaleString()
    );
    const lightLevels = data.map((reading) => reading.light_level);

    return { timestamps, lightLevels };
  }

  /**
   * Prepara datos de movimiento para gráficas ECharts
   */
  prepareMotionChartData(data: MotionReading[]): {
    timestamps: string[];
    motionValues: number[];
  } {
    const timestamps = data.map((reading) =>
      new Date(reading.timestamp).toLocaleString()
    );
    const motionValues = data.map((reading) =>
      reading.motion_detected ? 1 : 0
    );

    return { timestamps, motionValues };
  }

  // ========== MÉTODOS DE ANÁLISIS DE PROBABILIDADES ==========

  /**
   * Calcula probabilidad clásica para una condición específica
   */
  calculateClassicalProbability<T>(
    data: T[],
    condition: (item: T) => boolean
  ): number {
    if (data.length === 0) return 0;
    const favorableCases = data.filter(condition).length;
    return favorableCases / data.length;
  }

  /**
   * Analiza patrones temporales en los datos
   */
  analyzeTemporalPatterns(timestamps: string[]): {
    hourlyDistribution: { [hour: number]: number };
    dailyDistribution: { [day: string]: number };
    peakHours: number[];
  } {
    const hourlyDistribution: { [hour: number]: number } = {};
    const dailyDistribution: { [day: string]: number } = {};

    // Inicializar distribución horaria
    for (let i = 0; i < 24; i++) {
      hourlyDistribution[i] = 0;
    }

    timestamps.forEach((timestamp) => {
      const date = new Date(timestamp);
      const hour = date.getHours();
      const day = date.toLocaleDateString();

      hourlyDistribution[hour]++;
      dailyDistribution[day] = (dailyDistribution[day] || 0) + 1;
    });

    // Encontrar horas pico (top 3)
    const hourEntries = Object.entries(hourlyDistribution);
    const peakHours = hourEntries
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => parseInt(hour));

    return { hourlyDistribution, dailyDistribution, peakHours };
  }

  // ========== MÉTODOS DE UTILIDAD ==========

  /**
   * Formatea una fecha para mostrar en gráficas
   */
  formatTimestampForChart(timestamp: string): string {
    const date = new Date(timestamp);
    return `${date.getMonth() + 1}/${date.getDate()}\n${date.getHours()}:${date
      .getMinutes()
      .toString()
      .padStart(2, '0')}`;
  }

  /**
   * Obtiene la etiqueta de una variable de sensor
   */
  getVariableLabel(
    sensorType: 'temperature' | 'light' | 'motion',
    variable?: string
  ): string {
    const labels: { [key: string]: { [key: string]: string } } = {
      temperature: {
        temperature: 'Temperatura (°C)',
        humidity: 'Humedad (%)',
        combined: 'Temperatura y Humedad',
      },
      light: {
        light_level: 'Nivel de Luz (lux)',
        combined: 'Iluminación',
      },
      motion: {
        motion_detected: 'Detección de Movimiento',
        combined: 'Actividad',
      },
    };

    return labels[sensorType]?.[variable || 'combined'] || 'Sensor';
  }

  /**
   * Obtiene la unidad de medida para un tipo de sensor
   */
  getDataUnit(sensorType: 'temperature' | 'light' | 'motion'): string {
    const units: { [key: string]: string } = {
      temperature: '°C / %',
      light: 'lux',
      motion: 'eventos',
    };

    return units[sensorType] || '';
  }

  // ========== MÉTODOS DE AUTENTICACIÓN Y HEADERS ==========

  /**
   * Verifica si el usuario está autenticado
   */
  isUserAuthenticated(): boolean {
    return this.authService.isLoggedIn();
  }

  /**
   * Obtiene información del usuario actual
   */
  getCurrentUserInfo() {
    return this.authService.getCurrentUserData();
  }

  /**
   * Obtiene headers con autenticación para las peticiones HTTP
   */
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();

    if (!token) {
      throw new Error(
        'No hay token de autenticación disponible. Por favor, inicia sesión.'
      );
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      accept: 'application/json',
    });

    // Log para debugging de las cabeceras
    console.log('🔧 Cabeceras HTTP generadas en SensorHistoryService:');
    console.log('Authorization:', `Bearer ${token}`);
    console.log('Content-Type:', 'application/json');
    console.log('Headers object:', headers);

    return headers;
  }

  // ========== MÉTODOS DE MANEJO DE ERRORES ==========

  /**
   * Maneja errores de peticiones HTTP y retorna mensajes user-friendly
   */
  handleApiError(error: any): string {
    console.error('❌ Error en SensorHistoryService:', error);

    if (error?.status === 401) {
      return 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
    } else if (error?.status === 404) {
      return 'No se encontraron datos para el dispositivo y período seleccionados.';
    } else if (error?.status === 500) {
      return 'Error del servidor. Intenta nuevamente más tarde.';
    } else if (error?.status === 403) {
      return 'No tienes permisos para acceder a estos datos.';
    } else if (error?.status === 0) {
      return 'Error de conexión. Verifica tu conexión a internet.';
    }

    return (
      error?.message || 'Error desconocido al cargar los datos del sensor.'
    );
  }

  // ========== MÉTODOS DE VALIDACIÓN ==========

  /**
   * Valida que un dispositivo sea compatible con análisis de sensores
   */
  validateSensorDevice(device: Device): boolean {
    return (
      device && device.device_type_id === 2 && device.mac_address?.length > 0
    );
  }

  /**
   * Valida parámetros de consulta de historial
   */
  validateHistoryParams(
    mac: string,
    period: string,
    sensorType: string
  ): { isValid: boolean; error?: string } {
    if (!mac || mac.trim().length === 0) {
      return { isValid: false, error: 'MAC address es requerida' };
    }

    if (!['1d', '1w', '1m'].includes(period)) {
      return {
        isValid: false,
        error: 'Período no válido. Debe ser 1d, 1w o 1m',
      };
    }

    if (!['temperature', 'light', 'motion'].includes(sensorType)) {
      return { isValid: false, error: 'Tipo de sensor no válido' };
    }

    return { isValid: true };
  }
}
