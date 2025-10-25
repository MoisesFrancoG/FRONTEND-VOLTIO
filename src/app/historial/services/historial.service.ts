import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, map, switchMap, throwError, of } from 'rxjs';
import { AuthService } from '../../auth/services/auth.service';
import { DeviceService, Device } from '../../devices/services/device.service';

export interface EnergyData {
  _time: string;
  deviceId: string;
  mac: string;
  voltage: number;
  current: number;
  power: number;
  energy: number;
  frequency: number;
  powerFactor: number;
}

export interface ChartData {
  name: string;
  value: number;
}

export interface SeriesData {
  name: string;
  series: ChartData[];
}

export interface StatisticalSummary {
  mean: number;
  median: number;
  mode: number | null;
  standardDeviation: number;
  min: number;
  max: number;
  range: number;
  q1: number;
  q3: number;
  outliers: number[];
}

@Injectable({
  providedIn: 'root',
})
export class HistorialService {
  private baseUrl = 'https://voltioapi.acstree.xyz/api/v1';

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    private deviceService: DeviceService
  ) {}

  // Obtener dispositivos PZEM del usuario
  getUserPzemDevices(): Observable<Device[]> {
    console.log('📱 Obteniendo dispositivos PZEM del usuario...');

    return this.deviceService.getMyDevices().pipe(
      map((devices) => {
        console.log('📱 Todos los dispositivos del usuario:', devices);

        // Filtrar solo dispositivos tipo PZEM (device_type_id === 1)
        const pzemDevices = devices.filter(
          (device) => device.device_type_id === 1
        );
        console.log('⚡ Dispositivos PZEM encontrados:', pzemDevices);

        return pzemDevices;
      })
    );
  }

  // Obtener MAC addresses de dispositivos PZEM
  getPzemMacAddresses(): Observable<string[]> {
    return this.getUserPzemDevices().pipe(
      map((pzemDevices) => {
        const macAddresses = pzemDevices.map((device) => device.mac_address);
        console.log('🔗 MAC addresses de dispositivos PZEM:', macAddresses);
        return macAddresses;
      })
    );
  }

  getEnergyHistory(
    mac?: string,
    period: string = '1d'
  ): Observable<EnergyData[]> {
    console.log('🚀 Iniciando getEnergyHistory...');

    // Si se proporciona una MAC específica, usarla
    if (mac) {
      console.log('📍 Usando MAC específica proporcionada:', mac);
      return this.getEnergyHistoryForMac(mac, period);
    }

    // Si no se proporciona MAC, obtener la primera MAC de dispositivos PZEM del usuario
    console.log(
      '🔍 No se proporcionó MAC, obteniendo dispositivos PZEM del usuario...'
    );

    return this.getPzemMacAddresses().pipe(
      switchMap((macAddresses) => {
        if (macAddresses.length === 0) {
          console.log('⚠️ No se encontraron dispositivos PZEM para el usuario');
          return throwError(
            () =>
              new Error(
                'No tienes dispositivos PZEM registrados. Por favor registra un dispositivo PZEM primero.'
              )
          );
        }

        // Usar la primera MAC encontrada
        const firstMac = macAddresses[0];
        console.log('✅ Usando primera MAC de dispositivo PZEM:', firstMac);

        return this.getEnergyHistoryForMac(firstMac, period);
      })
    );
  }

  private getEnergyHistoryForMac(
    mac: string,
    period: string
  ): Observable<EnergyData[]> {
    const headers = this.getAuthHeaders();

    const encodedMac = encodeURIComponent(mac);
    const url = `${this.baseUrl}/energy/history/${period}?mac=${encodedMac}`;

    console.log('🚀 Realizando petición HTTP GET:');
    console.log('URL completa:', url);
    console.log('MAC address:', mac);
    console.log('Period:', period);

    return this.http.get<EnergyData[]>(url, { headers });
  }

  // Preparar datos para histograma
  prepareHistogramData(
    data: EnergyData[],
    variable: keyof EnergyData,
    bins: number = 10
  ): ChartData[] {
    const values = data
      .map((d) => Number(d[variable]))
      .filter((v) => !isNaN(v));

    if (values.length === 0) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / bins;

    const histogram: { [key: string]: number } = {};

    for (let i = 0; i < bins; i++) {
      const rangeStart = min + i * binWidth;
      const rangeEnd = min + (i + 1) * binWidth;
      const label = `${rangeStart.toFixed(2)}-${rangeEnd.toFixed(2)}`;
      histogram[label] = 0;
    }

    values.forEach((value) => {
      const binIndex = Math.floor((value - min) / binWidth);
      const safeBinIndex = Math.min(binIndex, bins - 1);
      const rangeStart = min + safeBinIndex * binWidth;
      const rangeEnd = min + (safeBinIndex + 1) * binWidth;
      const label = `${rangeStart.toFixed(2)}-${rangeEnd.toFixed(2)}`;
      histogram[label]++;
    });

    return Object.entries(histogram).map(([name, value]) => ({ name, value }));
  }

  // Preparar datos para gráfica de línea temporal
  prepareTimeSeriesData(
    data: EnergyData[],
    variables: (keyof EnergyData)[]
  ): SeriesData[] {
    return variables.map((variable) => ({
      name: this.getVariableLabel(variable),
      series: data
        .map((d) => ({
          name: new Date(d._time).toLocaleTimeString(),
          value: Number(d[variable]),
        }))
        .filter((item) => !isNaN(item.value)),
    }));
  }

  // Preparar datos para boxplot (aproximación usando estadísticas)
  prepareBoxplotData(data: EnergyData[], variable: keyof EnergyData): any {
    const values = data
      .map((d) => Number(d[variable]))
      .filter((v) => !isNaN(v))
      .sort((a, b) => a - b);

    if (values.length === 0) return null;

    const stats = this.calculateStatistics(values);

    return {
      name: this.getVariableLabel(variable),
      min: stats.min,
      q1: stats.q1,
      median: stats.median,
      q3: stats.q3,
      max: stats.max,
      outliers: stats.outliers,
    };
  }

  // Preparar datos para gráfico de barras por rangos
  prepareFrequencyBarsData(
    data: EnergyData[],
    variable: keyof EnergyData,
    ranges: number = 5
  ): ChartData[] {
    const values = data
      .map((d) => Number(d[variable]))
      .filter((v) => !isNaN(v));

    if (values.length === 0) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const rangeSize = (max - min) / ranges;

    const frequencies: { [key: string]: number } = {};

    for (let i = 0; i < ranges; i++) {
      const rangeStart = min + i * rangeSize;
      const rangeEnd = min + (i + 1) * rangeSize;
      const label = `${rangeStart.toFixed(2)} - ${rangeEnd.toFixed(2)}`;
      frequencies[label] = 0;
    }

    values.forEach((value) => {
      const rangeIndex = Math.floor((value - min) / rangeSize);
      const safeRangeIndex = Math.min(rangeIndex, ranges - 1);
      const rangeStart = min + safeRangeIndex * rangeSize;
      const rangeEnd = min + (safeRangeIndex + 1) * rangeSize;
      const label = `${rangeStart.toFixed(2)} - ${rangeEnd.toFixed(2)}`;
      frequencies[label]++;
    });

    return Object.entries(frequencies).map(([name, value]) => ({
      name,
      value,
    }));
  }

  // Preparar datos para gráfico de pastel (para variables categóricas)
  preparePieData(data: EnergyData[], variable: keyof EnergyData): ChartData[] {
    const values = data.map((d) => d[variable]);
    const frequencies: { [key: string]: number } = {};

    values.forEach((value) => {
      const key = String(value);
      frequencies[key] = (frequencies[key] || 0) + 1;
    });

    return Object.entries(frequencies).map(([name, value]) => ({
      name,
      value,
    }));
  }

  // Calcular estadísticas descriptivas
  calculateStatistics(values: number[]): StatisticalSummary {
    const sorted = [...values].sort((a, b) => a - b);
    const n = sorted.length;

    // Media
    const mean = values.reduce((sum, val) => sum + val, 0) / n;

    // Mediana
    const median =
      n % 2 === 0
        ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
        : sorted[Math.floor(n / 2)];

    // Moda (valor más frecuente)
    const frequencyMap: { [key: number]: number } = {};
    let maxFreq = 0;
    let mode: number | null = null;

    values.forEach((val) => {
      frequencyMap[val] = (frequencyMap[val] || 0) + 1;
      if (frequencyMap[val] > maxFreq) {
        maxFreq = frequencyMap[val];
        mode = val;
      }
    });

    // Si no hay un valor que se repita más de una vez, no hay moda
    if (maxFreq === 1) mode = null;

    // Desviación estándar
    const variance =
      values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / n;
    const standardDeviation = Math.sqrt(variance);

    // Min, Max, Rango
    const min = sorted[0];
    const max = sorted[n - 1];
    const range = max - min;

    // Cuartiles
    const q1Index = Math.floor(n * 0.25);
    const q3Index = Math.floor(n * 0.75);
    const q1 = sorted[q1Index];
    const q3 = sorted[q3Index];

    // Outliers (valores fuera de 1.5 * IQR)
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;
    const outliers = values.filter(
      (val) => val < lowerBound || val > upperBound
    );

    return {
      mean,
      median,
      mode,
      standardDeviation,
      min,
      max,
      range,
      q1,
      q3,
      outliers,
    };
  }

  // Calcular probabilidad clásica
  calculateClassicalProbability(
    data: EnergyData[],
    variable: keyof EnergyData,
    condition: (value: number) => boolean
  ): number {
    const values = data
      .map((d) => Number(d[variable]))
      .filter((v) => !isNaN(v));
    const favorableCases = values.filter(condition).length;
    return values.length > 0 ? favorableCases / values.length : 0;
  }

  private getVariableLabel(variable: keyof EnergyData): string {
    const labels: { [key in keyof EnergyData]: string } = {
      _time: 'Tiempo',
      deviceId: 'ID Dispositivo',
      mac: 'MAC',
      voltage: 'Voltaje (V)',
      current: 'Corriente (A)',
      power: 'Potencia (W)',
      energy: 'Energía (kWh)',
      frequency: 'Frecuencia (Hz)',
      powerFactor: 'Factor de Potencia',
    };
    return labels[variable] || String(variable);
  }

  // Método helper para verificar autenticación
  isUserAuthenticated(): boolean {
    return this.authService.isLoggedIn();
  }

  // Método helper para obtener información del usuario actual
  getCurrentUserInfo() {
    return this.authService.getCurrentUserData();
  }

  // Método helper para obtener headers con autenticación
  private getAuthHeaders(): HttpHeaders {
    const token = this.authService.getToken();

    if (!token) {
      throw new Error(
        'No hay token de autenticación disponible. Por favor, inicia sesión.'
      );
    }

    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`,
      accept: 'application/json',
    });

    // Log para debugging de las cabeceras
    console.log('🔧 Cabeceras HTTP generadas en HistorialService:');
    console.log('Authorization:', `Bearer ${token}`);
    console.log('Accept:', 'application/json');
    console.log('Headers object:', headers);

    return headers;
  }
}
