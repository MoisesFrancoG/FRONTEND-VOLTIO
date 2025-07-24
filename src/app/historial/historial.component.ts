import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import {
  HistorialService,
  EnergyData,
  ChartData,
  SeriesData,
  StatisticalSummary,
} from './services/historial.service';
import { AuthService } from '../auth/services/auth.service';

@Component({
  selector: 'app-historial',
  templateUrl: './historial.component.html',
  styleUrls: ['./historial.component.css'],
})
export class HistorialComponent implements OnInit {
  // Propiedades para manejar las gráficas
  selectedGraphType: string = 'histogram';
  selectedVariable: string = 'voltage';
  selectedPeriod: string = '1d'; // Nueva propiedad para el período
  rawData: EnergyData[] = [];
  isLoading: boolean = false;
  hasError: boolean = false;
  errorMessage: string = '';
  noPzemDevices: boolean = false; // Nueva propiedad para identificar error específico

  // Datos para diferentes tipos de gráficas
  histogramData: ChartData[] = [];
  timeSeriesData: SeriesData[] = [];
  boxplotData: any = null;
  frequencyBarsData: ChartData[] = [];
  pieData: ChartData[] = [];

  // Estadísticas descriptivas
  statistics: StatisticalSummary | null = null;

  // Probabilidades calculadas
  probabilities: { [key: string]: number } = {};

  // Tipos de gráficas disponibles
  graphTypes = [
    {
      value: 'histogram',
      label: 'Histograma',
      icon: '📊',
      description: 'Distribución de valores',
    },
    {
      value: 'timeSeries',
      label: 'Serie Temporal',
      icon: '📈',
      description: 'Variación en el tiempo',
    },
    {
      value: 'boxplot',
      label: 'Diagrama de Caja',
      icon: '📉',
      description: 'Análisis de dispersión',
    },
    {
      value: 'frequencyBars',
      label: 'Barras de Frecuencia',
      icon: '📶',
      description: 'Frecuencia por rangos',
    },
    {
      value: 'pie',
      label: 'Gráfico de Pastel',
      icon: '🍰',
      description: 'Distribución porcentual',
    },
  ];

  // Variables disponibles para analizar
  variables = [
    { value: 'voltage', label: 'Voltaje (V)', unit: 'V' },
    { value: 'current', label: 'Corriente (A)', unit: 'A' },
    { value: 'power', label: 'Potencia (W)', unit: 'W' },
    { value: 'energy', label: 'Energía (kWh)', unit: 'kWh' },
    { value: 'frequency', label: 'Frecuencia (Hz)', unit: 'Hz' },
    { value: 'powerFactor', label: 'Factor de Potencia', unit: '' },
  ];

  // Períodos de tiempo disponibles
  periods = [
    {
      value: '1d',
      label: 'Último Día',
      icon: '📅',
      description: 'Datos de las últimas 24 horas',
    },
    {
      value: '1w',
      label: 'Última Semana',
      icon: '📆',
      description: 'Datos de los últimos 7 días',
    },
    {
      value: '1mo',
      label: 'Último Mes',
      icon: '🗓️',
      description: 'Datos del último mes',
    },
  ];

  // Configuraciones para ngx-charts
  view: [number, number] = [700, 400];
  showXAxis = true;
  showYAxis = true;
  gradient = false;
  showLegend = true;
  showXAxisLabel = true;
  showYAxisLabel = true;
  animations = true;

  colorScheme: any = {
    domain: ['#5AA454', '#A10A28', '#C7B42C', '#AAAAAA', '#FF6B6B', '#4ECDC4'],
  };

  constructor(
    private historialService: HistorialService,
    private router: Router,
    private authService: AuthService
  ) {}

  ngOnInit(): void {
    // Log del token y cabeceras para debugging
    const token = this.authService.getToken();
    const currentUser = this.authService.getCurrentUserData();

    console.log('=== HISTORIAL COMPONENT DEBUG ===');
    console.log('Token desde localStorage:', token);
    console.log('Usuario actual:', currentUser);
    console.log('Está autenticado:', this.authService.isLoggedIn());

    if (token) {
      console.log('Cabeceras que se enviarán:');
      console.log({
        Authorization: `Bearer ${token}`,
        accept: 'application/json',
      });
    } else {
      console.log('❌ No hay token disponible en localStorage');
    }
    console.log('==================================');

    this.loadData();
  }

  // Método para cargar datos de la API
  loadData(): void {
    this.isLoading = true;
    this.hasError = false;
    this.noPzemDevices = false; // Reset de la nueva propiedad
    this.errorMessage = '';

    // Verificar autenticación antes de hacer la llamada
    if (!this.historialService.isUserAuthenticated()) {
      this.isLoading = false;
      this.hasError = true;
      this.errorMessage =
        'Usuario no autenticado. Por favor, inicia sesión para ver los datos.';
      return;
    }

    // Log adicional antes de hacer la llamada a la API
    console.log('--- INICIANDO LLAMADA A LA API ---');
    console.log(
      'URL:',
      `https://voltioapi.acstree.xyz/api/v1/energy/history/${this.selectedPeriod}`
    );
    console.log('Período seleccionado:', this.selectedPeriod);
    console.log('Token activo:', this.authService.getToken());

    this.historialService
      .getEnergyHistory(undefined, this.selectedPeriod)
      .subscribe({
        next: (data) => {
          if (data && data.length > 0) {
            this.rawData = data;
            this.processData();
            this.calculateStatistics();
            this.calculateProbabilities();
            console.log(
              'Datos cargados correctamente desde la API:',
              data.length,
              'registros'
            );
          } else {
            this.hasError = true;
            this.errorMessage =
              'No se encontraron datos históricos para el dispositivo.';
          }
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error cargando datos:', error);
          this.isLoading = false;
          this.hasError = true;

          // Mostrar mensaje específico según el tipo de error
          if (
            error.message?.includes('No tienes dispositivos PZEM registrados')
          ) {
            this.noPzemDevices = true; // Marcar como error específico de no PZEM
            this.errorMessage =
              'No tienes dispositivos PZEM registrados. Para ver el historial de energía, primero debes registrar un dispositivo tipo PZEM en la sección de Dispositivos.';
          } else if (error.message?.includes('token de autenticación')) {
            this.errorMessage =
              'Error de autenticación. Por favor, inicia sesión nuevamente.';
          } else if (error.status === 401) {
            // Token expirado o inválido - cerrar sesión automáticamente
            this.handleTokenExpired();
          } else if (error.status === 403) {
            this.errorMessage =
              'No tienes permisos para acceder a estos datos.';
          } else if (error.status === 404) {
            this.errorMessage =
              'No se encontraron datos para el dispositivo especificado.';
          } else if (error.status === 0) {
            this.errorMessage =
              'Error de conexión. Verifica tu conexión a internet.';
          } else {
            this.errorMessage =
              'Error al cargar los datos desde la API. Intenta nuevamente.';
          }
        },
      });
  }

  // Método para manejar token expirado
  private handleTokenExpired(): void {
    this.errorMessage = 'Tu sesión ha expirado. Redirigiendo al login...';

    // Cerrar sesión
    this.authService.logout();

    // Redireccionar al login después de un breve delay
    setTimeout(() => {
      this.router.navigate(['/auth/login'], {
        queryParams: { returnUrl: '/historial' },
      });
    }, 2000);
  }

  // Método para redireccionar al login
  goToLogin(): void {
    this.router.navigate(['/auth/login'], {
      queryParams: { returnUrl: '/historial' },
    });
  }

  // Método para redireccionar a la sección de dispositivos
  goToDevices(): void {
    this.router.navigate(['/devices']);
  }

  // Método para cambiar el tipo de gráfica
  onGraphTypeChange(type: string): void {
    this.selectedGraphType = type;
    this.processData();
  }

  // Método para cambiar la variable analizada
  onVariableChange(variable: string): void {
    this.selectedVariable = variable;
    this.processData();
    this.calculateStatistics();
    this.calculateProbabilities();
  }

  // Método para cambiar el período de tiempo
  onPeriodChange(period: string): void {
    this.selectedPeriod = period;
    console.log('🕒 Cambiando período a:', period);
    this.loadData(); // Recargar datos con el nuevo período
  }

  // Procesar datos para las gráficas
  processData(): void {
    if (this.rawData.length === 0) return;

    const variable = this.selectedVariable as keyof EnergyData;

    switch (this.selectedGraphType) {
      case 'histogram':
        this.histogramData = this.historialService.prepareHistogramData(
          this.rawData,
          variable,
          10
        );
        break;

      case 'timeSeries':
        this.timeSeriesData = this.historialService.prepareTimeSeriesData(
          this.rawData,
          [variable]
        );
        break;

      case 'boxplot':
        this.boxplotData = this.historialService.prepareBoxplotData(
          this.rawData,
          variable
        );
        break;

      case 'frequencyBars':
        this.frequencyBarsData = this.historialService.prepareFrequencyBarsData(
          this.rawData,
          variable,
          10
        );
        break;

      case 'pie':
        // Para el gráfico de pastel, usar barras de frecuencia
        this.pieData = this.historialService.prepareFrequencyBarsData(
          this.rawData,
          variable,
          5
        );
        break;
    }
  }

  // Calcular estadísticas descriptivas
  calculateStatistics(): void {
    if (this.rawData.length === 0) return;

    const variable = this.selectedVariable as keyof EnergyData;
    const values = this.rawData
      .map((d) => Number(d[variable]))
      .filter((v) => !isNaN(v));

    if (values.length > 0) {
      this.statistics = this.historialService.calculateStatistics(values);
    }
  }

  // Calcular probabilidades clásicas
  calculateProbabilities(): void {
    if (this.rawData.length === 0 || !this.statistics) return;

    const variable = this.selectedVariable as keyof EnergyData;

    // Calcular probabilidades específicas según la variable
    switch (variable) {
      case 'voltage':
        this.probabilities = {
          'Voltaje > 121.5V':
            this.historialService.calculateClassicalProbability(
              this.rawData,
              variable,
              (v) => v > 121.5
            ),
          'Voltaje Normal (121-122V)':
            this.historialService.calculateClassicalProbability(
              this.rawData,
              variable,
              (v) => v >= 121.0 && v <= 122.0
            ),
          'Voltaje > Promedio':
            this.historialService.calculateClassicalProbability(
              this.rawData,
              variable,
              (v) => v > this.statistics!.mean
            ),
        };
        break;

      case 'power':
        this.probabilities = {
          'Potencia > 10W': this.historialService.calculateClassicalProbability(
            this.rawData,
            variable,
            (v) => v > 10
          ),
          'Potencia Baja < 5W':
            this.historialService.calculateClassicalProbability(
              this.rawData,
              variable,
              (v) => v < 5
            ),
          'Potencia > Promedio':
            this.historialService.calculateClassicalProbability(
              this.rawData,
              variable,
              (v) => v > this.statistics!.mean
            ),
        };
        break;

      default:
        this.probabilities = {
          'Valor > Promedio':
            this.historialService.calculateClassicalProbability(
              this.rawData,
              variable,
              (v) => v > this.statistics!.mean
            ),
          'Valor < Mediana':
            this.historialService.calculateClassicalProbability(
              this.rawData,
              variable,
              (v) => v < this.statistics!.median
            ),
        };
    }
  }

  // Método para refrescar los datos
  refreshData(): void {
    this.loadData();
  }

  // Obtener etiqueta para eje X
  get xAxisLabel(): string {
    if (this.selectedGraphType === 'timeSeries') return 'Tiempo';
    return this.getVariableInfo().label;
  }

  // Obtener etiqueta para eje Y
  get yAxisLabel(): string {
    return this.selectedGraphType === 'histogram' ||
      this.selectedGraphType === 'frequencyBars'
      ? 'Frecuencia'
      : this.getVariableInfo().label;
  }

  // Obtener información de la variable seleccionada
  getVariableInfo() {
    const variable = this.variables.find(
      (v) => v.value === this.selectedVariable
    );
    return variable || { label: 'Variable', unit: '' };
  }

  // Obtener información del tipo de gráfica seleccionada
  getGraphTypeInfo() {
    const graph = this.graphTypes.find(
      (g) => g.value === this.selectedGraphType
    );
    return graph || { label: 'Gráfica', icon: '📊', description: '' };
  }

  // Obtener información del período seleccionado
  getPeriodInfo() {
    const period = this.periods.find((p) => p.value === this.selectedPeriod);
    return period || { label: 'Período', icon: '📅', description: '' };
  }

  // Obtener información del usuario actual
  getCurrentUser() {
    return this.historialService.getCurrentUserInfo();
  }

  // Verificar si el usuario está autenticado
  isAuthenticated(): boolean {
    return this.historialService.isUserAuthenticated();
  }
}
