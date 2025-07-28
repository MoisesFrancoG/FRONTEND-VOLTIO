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
  currentView: 'device-selection' | 'monitoring' | 'sensor-selection' =
    'device-selection';
  isLoading = false;
  hasError = false;
  errorMessage = '';

  // Datos de dispositivos y sensores
  userDevices: Device[] = [];
  selectedDevice: Device | null = null;
  selectedSensor: string | null = null; // 'dht22', 'light_sensor', 'pir'

  // Sensores disponibles para NODO_SENSADO_RPI
  availableSensors = {
    dht22: {
      name: 'DHT22 - Temperatura y Humedad',
      icon: '🌡️',
      description: 'Sensor de temperatura y humedad de alta precisión',
      variables: ['temperature', 'humidity'],
    },
    light_sensor: {
      name: 'Sensor de Luz LDR',
      icon: '💡',
      description: 'Detector de luminosidad ambiental en lux',
      variables: ['lux'],
    },
    pir: {
      name: 'PIR - Detector de Movimiento',
      icon: '🚶',
      description: 'Sensor de detección de movimiento por infrarrojos',
      variables: ['motion'],
    },
  };

  // WebSocket
  private webSocket: WebSocket | null = null;
  isWebSocketConnected = false;

  // Datos para gráficas - Sensores eléctricos (PZEM)
  timeData: string[] = [];
  voltageData: number[] = [];
  currentData: number[] = [];
  powerData: number[] = [];
  energyData: number[] = [];
  frequencyData: number[] = [];
  powerFactorData: number[] = [];

  // Datos para sensores ambientales (DHT22, Light, PIR)
  temperatureData: number[] = [];
  humidityData: number[] = [];
  lightData: number[] = [];
  motionData: boolean[] = [];
  motionEvents: { time: string; detected: boolean }[] = [];

  // Últimos valores para mostrar en tiempo real
  lastSensorValues = {
    temperature: 0,
    humidity: 0,
    light: 0,
    motion: false,
    lastMotionTime: '',
    voltage: 0,
    current: 0,
    power: 0,
    energy: 0,
    frequency: 0,
    powerFactor: 0,
  };

  // Configuración de gráficas
  selectedChart: 'main' | 'power' | 'energy' | 'environmental' | 'motion' =
    'main';
  chartOption: EChartsOption = {};
  powerChartOption: EChartsOption = {};
  energyChartOption: EChartsOption = {};
  environmentalChartOption: EChartsOption = {};
  motionChartOption: EChartsOption = {};

  // Variables por tipo de dispositivo
  deviceVariables: { [key: number]: string[] } = {
    1: ['voltage', 'current', 'power', 'energy', 'frequency', 'powerFactor'], // NODO_CONTROL_PZEM
    2: ['temperature', 'humidity', 'light', 'motion'], // NODO_CONTROL_IR - Con sensores individuales
    3: ['temperature', 'humidity', 'light'], // NODO_SENSADO_RPI
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

  // Métodos de selección de dispositivos y sensores
  selectDevice(device: Device): void {
    console.log('🎯 Dispositivo seleccionado:', device);
    this.selectedDevice = device;

    // Si es un nodo de control IR (tipo 2), mostrar selección de sensores
    if (device.device_type_id === 2) {
      this.currentView = 'sensor-selection';
    } else {
      // Para otros tipos, ir directamente al monitoreo
      this.currentView = 'monitoring';
      this.resetMonitoringData();
      this.setupWebSocket();
    }
  }

  selectSensor(sensorType: string): void {
    console.log('🔬 Sensor seleccionado:', sensorType);
    this.selectedSensor = sensorType;
    this.currentView = 'monitoring';
    this.resetMonitoringData();
    this.setupWebSocketForSensor();
  }

  backToDeviceSelection(): void {
    console.log('⬅️ Regresando a selección de dispositivos');
    this.currentView = 'device-selection';
    this.disconnectWebSocket();
    this.selectedDevice = null;
    this.selectedSensor = null;
    this.resetMonitoringData();
  }

  backToSensorSelection(): void {
    console.log('⬅️ Regresando a selección de sensores');
    this.currentView = 'sensor-selection';
    this.disconnectWebSocket();
    this.selectedSensor = null;
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

  setupWebSocketForSensor(): void {
    if (!this.selectedDevice || !this.selectedSensor) {
      console.error(
        '❌ No hay dispositivo o sensor seleccionado para WebSocket'
      );
      return;
    }

    console.log(
      '🔌 Configurando WebSocket para sensor:',
      this.selectedSensor,
      'del dispositivo:',
      this.selectedDevice.name
    );
    this.disconnectWebSocket(); // Desconectar WebSocket anterior si existe

    try {
      const deviceMac = this.selectedDevice.mac_address;

      // Para dispositivos tipo 2 (NODO_CONTROL_IR), usar el sensor específico como topic
      const topic = this.selectedSensor; // 'dht22', 'light_sensor', 'pir'

      const wsUrl = `wss://websocketvoltio.acstree.xyz/ws?topic=${topic}&mac=${deviceMac}`;
      console.log('🔗 Conectando WebSocket para sensor:', wsUrl);

      this.webSocket = new WebSocket(wsUrl);

      this.webSocket.onopen = () => {
        console.log(
          `✅ WebSocket conectado exitosamente para sensor ${this.selectedSensor}`
        );
        this.isWebSocketConnected = true;
      };

      this.webSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log(
            `📊 Datos recibidos del sensor ${this.selectedSensor}:`,
            data
          );
          this.processWebSocketDataForSensor(data);
        } catch (error) {
          console.error('❌ Error procesando datos del sensor:', error);
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
              this.setupWebSocketForSensor();
            }
          }, 5000);
        }
      };

      this.webSocket.onerror = (error) => {
        console.error('❌ Error en WebSocket:', error);
        this.isWebSocketConnected = false;
      };
    } catch (error) {
      console.error('❌ Error configurando WebSocket para sensor:', error);
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
    if (this.selectedSensor) {
      this.setupWebSocketForSensor();
    } else {
      this.setupWebSocket();
    }
  }

  // Procesamiento de datos del WebSocket
  processWebSocketData(data: any): void {
    const now = new Date().toLocaleTimeString();

    try {
      const contentObj = JSON.parse(data.content);
      const messageObj = JSON.parse(contentObj.message);

      console.log('📊 Datos procesados:', messageObj);

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
        this.temperatureData.shift();
        this.humidityData.shift();
        this.lightData.shift();
        this.motionData.shift();
      }

      // Procesar datos según el tipo de dispositivo
      if (this.selectedDevice?.device_type_id === 1) {
        // NODO_CONTROL_PZEM - Datos eléctricos
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
        }
      } else if (this.selectedDevice?.device_type_id === 3) {
        // NODO_SENSADO_RPI - Sensores ambientales
        const sensorType = messageObj.sensor_type;
        const sensorData = messageObj.data;

        // Inicializar con valores por defecto para mantener sincronización
        let tempValue =
          this.temperatureData.length > 0
            ? this.temperatureData[this.temperatureData.length - 1]
            : 0;
        let humidityValue =
          this.humidityData.length > 0
            ? this.humidityData[this.humidityData.length - 1]
            : 0;
        let lightValue =
          this.lightData.length > 0
            ? this.lightData[this.lightData.length - 1]
            : 0;
        let motionValue =
          this.motionData.length > 0
            ? this.motionData[this.motionData.length - 1]
            : false;

        // Procesar según el tipo de sensor
        switch (sensorType) {
          case 'dht22':
            tempValue = sensorData.temperature || 0;
            humidityValue = sensorData.humidity || 0;
            this.lastSensorValues.temperature = tempValue;
            this.lastSensorValues.humidity = humidityValue;
            console.log(
              '🌡️ DHT22 - Temp:',
              tempValue,
              '°C, Humidity:',
              humidityValue,
              '%'
            );
            break;

          case 'light':
            lightValue = sensorData.lux || 0;
            this.lastSensorValues.light = lightValue;
            console.log('💡 Light Sensor - Lux:', lightValue);
            break;

          case 'pir':
            motionValue = sensorData.motion || false;
            this.lastSensorValues.motion = motionValue;
            if (motionValue) {
              this.lastSensorValues.lastMotionTime = now;
              this.motionEvents.push({ time: now, detected: true });
              // Mantener solo los últimos 20 eventos
              if (this.motionEvents.length > 20) {
                this.motionEvents.shift();
              }
            }
            console.log('🚶 PIR - Motion:', motionValue);
            break;
        }

        // Agregar valores a las series (mantener sincronización)
        this.temperatureData.push(tempValue);
        this.humidityData.push(humidityValue);
        this.lightData.push(lightValue);
        this.motionData.push(motionValue);
      }

      this.updateChartData();
    } catch (error) {
      console.error('❌ Error procesando datos del sensor:', error);
    }
  }

  processWebSocketDataForSensor(data: any): void {
    const now = new Date().toLocaleTimeString();

    try {
      console.log(
        `📊 Procesando datos del sensor ${this.selectedSensor}:`,
        data
      );

      // Parsear el contenido del WebSocket
      const contentObj = JSON.parse(data.content);
      const messageObj = JSON.parse(contentObj.message);

      console.log('📊 Mensaje parseado:', messageObj);
      console.log('📊 Tipo de sensor recibido:', messageObj.sensor_type);
      console.log('📊 Datos del sensor:', messageObj.data);

      // Agregar tiempo
      this.timeData.push(now);

      // Mantener solo los últimos 50 puntos de datos
      if (this.timeData.length > 50) {
        this.timeData.shift();
        this.temperatureData.shift();
        this.humidityData.shift();
        this.lightData.shift();
        this.motionData.shift();
      }

      // Inicializar con valores por defecto para mantener sincronización
      let tempValue =
        this.temperatureData.length > 0
          ? this.temperatureData[this.temperatureData.length - 1]
          : 0;
      let humidityValue =
        this.humidityData.length > 0
          ? this.humidityData[this.humidityData.length - 1]
          : 0;
      let lightValue =
        this.lightData.length > 0
          ? this.lightData[this.lightData.length - 1]
          : 0;
      let motionValue =
        this.motionData.length > 0
          ? this.motionData[this.motionData.length - 1]
          : false;

      // Procesar según el sensor seleccionado y el tipo recibido
      const sensorType = messageObj.sensor_type;
      const sensorData = messageObj.data;

      // Mapear tipos de sensores del WebSocket a nuestros tipos internos
      const sensorTypeMapping: { [key: string]: string } = {
        dht22: 'dht22',
        light: 'light_sensor',
        pir: 'pir',
      };

      const mappedSensorType = sensorTypeMapping[sensorType] || sensorType;

      console.log(`🔍 Sensor seleccionado: ${this.selectedSensor}`);
      console.log(`🔍 Tipo de sensor mapeado: ${mappedSensorType}`);

      // Verificar si el sensor recibido coincide con el seleccionado
      if (mappedSensorType === this.selectedSensor) {
        switch (this.selectedSensor) {
          case 'dht22':
            if (sensorData.temperature !== undefined) {
              tempValue = sensorData.temperature;
              this.lastSensorValues.temperature = tempValue;
              console.log(`🌡️ Temperatura actualizada: ${tempValue}°C`);
            }
            if (sensorData.humidity !== undefined) {
              humidityValue = sensorData.humidity;
              this.lastSensorValues.humidity = humidityValue;
              console.log(`💧 Humedad actualizada: ${humidityValue}%`);
            }
            break;

          case 'light_sensor':
            if (sensorData.lux !== undefined) {
              lightValue = sensorData.lux;
              this.lastSensorValues.light = lightValue;
              console.log(`💡 Luz actualizada: ${lightValue} lux`);
            }
            break;

          case 'pir':
            if (sensorData.motion !== undefined) {
              motionValue = sensorData.motion;
              this.lastSensorValues.motion = motionValue;
              if (motionValue) {
                this.lastSensorValues.lastMotionTime = now;
                this.motionEvents.push({ time: now, detected: true });
                // Mantener solo los últimos 20 eventos
                if (this.motionEvents.length > 20) {
                  this.motionEvents.shift();
                }
              }
              console.log(`🚶 Movimiento actualizado: ${motionValue}`);
            }
            break;
        }
      } else {
        console.log(
          `⚠️ Tipo de sensor no coincide. Esperado: ${this.selectedSensor}, Recibido: ${mappedSensorType}`
        );
      }

      // Agregar valores a las series (mantener sincronización)
      this.temperatureData.push(tempValue);
      this.humidityData.push(humidityValue);
      this.lightData.push(lightValue);
      this.motionData.push(motionValue);

      console.log('📊 Valores actualizados:', {
        temperature: this.lastSensorValues.temperature,
        humidity: this.lastSensorValues.humidity,
        light: this.lastSensorValues.light,
        motion: this.lastSensorValues.motion,
      });

      this.updateChartData();
    } catch (error) {
      console.error('❌ Error procesando datos del sensor específico:', error);
      console.error('❌ Datos recibidos:', data);
    }
  }

  // Métodos de gráficas
  initializeChartOptions(): void {
    // Gráfica principal - Voltaje y Corriente
    this.chartOption = {
      title: {
        text: 'Voltaje y Corriente en Tiempo Real',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        textStyle: { color: '#fff' },
      },
      legend: {
        data: ['Voltaje (V)', 'Corriente (A)'],
        top: 30,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: this.timeData,
        axisLabel: { rotate: 45 },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Voltaje (V)',
          position: 'left',
          axisLine: { lineStyle: { color: '#3b82f6' } },
        },
        {
          type: 'value',
          name: 'Corriente (A)',
          position: 'right',
          axisLine: { lineStyle: { color: '#ef4444' } },
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
        },
        {
          name: 'Corriente (A)',
          type: 'line',
          data: this.currentData,
          smooth: true,
          yAxisIndex: 1,
          lineStyle: { color: '#ef4444', width: 3 },
          itemStyle: { color: '#ef4444' },
        },
      ],
    };

    // Gráfica de Potencia
    this.powerChartOption = {
      title: {
        text: 'Potencia en Tiempo Real',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        textStyle: { color: '#fff' },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: this.timeData,
        axisLabel: { rotate: 45 },
      },
      yAxis: {
        type: 'value',
        name: 'Potencia (W)',
        axisLine: { lineStyle: { color: '#10b981' } },
      },
      series: [
        {
          name: 'Potencia (W)',
          type: 'line',
          data: this.powerData,
          smooth: true,
          areaStyle: { color: 'rgba(16, 185, 129, 0.3)' },
          lineStyle: { color: '#10b981', width: 3 },
          itemStyle: { color: '#10b981' },
        },
      ],
    };

    // Gráfica de Energía
    this.energyChartOption = {
      title: {
        text: 'Energía Acumulada',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        textStyle: { color: '#fff' },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: this.timeData,
        axisLabel: { rotate: 45 },
      },
      yAxis: {
        type: 'value',
        name: 'Energía (kWh)',
        axisLine: { lineStyle: { color: '#8b5cf6' } },
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
        },
      ],
    };

    // Gráfica Ambiental - Temperatura y Humedad
    this.environmentalChartOption = {
      title: {
        text: 'Monitoreo Ambiental en Tiempo Real',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' },
      },
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        textStyle: { color: '#fff' },
      },
      legend: {
        data: ['Temperatura (°C)', 'Humedad (%)', 'Luz (lux)'],
        top: 30,
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: this.timeData,
        axisLabel: { rotate: 45 },
      },
      yAxis: [
        {
          type: 'value',
          name: 'Temp (°C) / Hum (%)',
          position: 'left',
          min: 0,
          max: 100,
          axisLine: { lineStyle: { color: '#f59e0b' } },
        },
        {
          type: 'value',
          name: 'Luz (lux)',
          position: 'right',
          axisLine: { lineStyle: { color: '#eab308' } },
        },
      ],
      series: [
        {
          name: 'Temperatura (°C)',
          type: 'line',
          data: this.temperatureData,
          smooth: true,
          yAxisIndex: 0,
          lineStyle: { color: '#dc2626', width: 3 },
          itemStyle: { color: '#dc2626' },
        },
        {
          name: 'Humedad (%)',
          type: 'line',
          data: this.humidityData,
          smooth: true,
          yAxisIndex: 0,
          lineStyle: { color: '#2563eb', width: 3 },
          itemStyle: { color: '#2563eb' },
        },
        {
          name: 'Luz (lux)',
          type: 'line',
          data: this.lightData,
          smooth: true,
          yAxisIndex: 1,
          lineStyle: { color: '#eab308', width: 3 },
          itemStyle: { color: '#eab308' },
        },
      ],
    };

    // Gráfica de Detección de Movimiento
    this.motionChartOption = {
      title: {
        text: 'Detección de Movimiento',
        left: 'center',
        textStyle: { fontSize: 16, fontWeight: 'bold' },
      },
      tooltip: {
        trigger: 'axis',
        formatter: (params: any) => {
          const motion = params[0].value ? 'Detectado' : 'Sin movimiento';
          return `${params[0].axisValue}<br/>Estado: ${motion}`;
        },
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        textStyle: { color: '#fff' },
      },
      grid: {
        left: '3%',
        right: '4%',
        bottom: '3%',
        containLabel: true,
      },
      xAxis: {
        type: 'category',
        data: this.timeData,
        axisLabel: { rotate: 45 },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 1,
        axisLabel: {
          formatter: (value: number) =>
            value === 1 ? 'Detectado' : 'Sin movimiento',
        },
        axisLine: { lineStyle: { color: '#7c3aed' } },
      },
      series: [
        {
          name: 'Movimiento',
          type: 'line',
          data: this.motionData.map((motion) => (motion ? 1 : 0)),
          step: 'end',
          lineStyle: { color: '#7c3aed', width: 3 },
          itemStyle: { color: '#7c3aed' },
          areaStyle: { color: 'rgba(124, 58, 237, 0.3)' },
        },
      ],
    };
  }

  updateChartData(): void {
    // Actualizar gráfica principal - Voltaje y Corriente
    this.chartOption = {
      ...this.chartOption,
      xAxis: {
        type: 'category',
        data: this.timeData,
        axisLabel: { rotate: 45 },
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
        },
        {
          name: 'Corriente (A)',
          type: 'line',
          data: this.currentData,
          smooth: true,
          yAxisIndex: 1,
          lineStyle: { color: '#ef4444', width: 3 },
          itemStyle: { color: '#ef4444' },
        },
      ],
    };

    // Actualizar gráfica de Potencia
    this.powerChartOption = {
      ...this.powerChartOption,
      xAxis: {
        type: 'category',
        data: this.timeData,
        axisLabel: { rotate: 45 },
      },
      series: [
        {
          name: 'Potencia (W)',
          type: 'line',
          data: this.powerData,
          smooth: true,
          areaStyle: { color: 'rgba(16, 185, 129, 0.3)' },
          lineStyle: { color: '#10b981', width: 3 },
          itemStyle: { color: '#10b981' },
        },
      ],
    };

    // Actualizar gráfica de Energía
    this.energyChartOption = {
      ...this.energyChartOption,
      xAxis: {
        type: 'category',
        data: this.timeData,
        axisLabel: { rotate: 45 },
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
        },
      ],
    };

    // Actualizar gráfica Ambiental
    this.environmentalChartOption = {
      ...this.environmentalChartOption,
      xAxis: {
        type: 'category',
        data: this.timeData,
        axisLabel: { rotate: 45 },
      },
      series: [
        {
          name: 'Temperatura (°C)',
          type: 'line',
          data: this.temperatureData,
          smooth: true,
          yAxisIndex: 0,
          lineStyle: { color: '#dc2626', width: 3 },
          itemStyle: { color: '#dc2626' },
        },
        {
          name: 'Humedad (%)',
          type: 'line',
          data: this.humidityData,
          smooth: true,
          yAxisIndex: 0,
          lineStyle: { color: '#2563eb', width: 3 },
          itemStyle: { color: '#2563eb' },
        },
        {
          name: 'Luz (lux)',
          type: 'line',
          data: this.lightData,
          smooth: true,
          yAxisIndex: 1,
          lineStyle: { color: '#eab308', width: 3 },
          itemStyle: { color: '#eab308' },
        },
      ],
    };

    // Actualizar gráfica de Movimiento
    this.motionChartOption = {
      ...this.motionChartOption,
      xAxis: {
        type: 'category',
        data: this.timeData,
        axisLabel: { rotate: 45 },
      },
      series: [
        {
          name: 'Movimiento',
          type: 'line',
          data: this.motionData.map((motion) => (motion ? 1 : 0)),
          step: 'end',
          lineStyle: { color: '#7c3aed', width: 3 },
          itemStyle: { color: '#7c3aed' },
          areaStyle: { color: 'rgba(124, 58, 237, 0.3)' },
        },
      ],
    };
  }

  setChart(
    chartType: 'main' | 'power' | 'energy' | 'environmental' | 'motion'
  ): void {
    console.log('📊 Cambiando a gráfica:', chartType);
    this.selectedChart = chartType;
  }

  // Métodos utilitarios
  resetMonitoringData(): void {
    // Datos eléctricos
    this.timeData = [];
    this.voltageData = [];
    this.currentData = [];
    this.powerData = [];
    this.energyData = [];
    this.frequencyData = [];
    this.powerFactorData = [];

    // Datos ambientales
    this.temperatureData = [];
    this.humidityData = [];
    this.lightData = [];
    this.motionData = [];
    this.motionEvents = [];

    // Últimos valores
    this.lastSensorValues = {
      temperature: 0,
      humidity: 0,
      light: 0,
      motion: false,
      lastMotionTime: '',
      voltage: 0,
      current: 0,
      power: 0,
      energy: 0,
      frequency: 0,
      powerFactor: 0,
    };

    // Seleccionar gráfica por defecto según el tipo de dispositivo
    if (this.selectedDevice?.device_type_id === 2) {
      this.selectedChart = 'environmental'; // NODO_CONTROL_IR con sensores
    } else if (this.selectedDevice?.device_type_id === 3) {
      this.selectedChart = 'environmental'; // NODO_SENSADO_RPI
    } else {
      this.selectedChart = 'main'; // NODO_CONTROL_PZEM por defecto
    }

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

  // Métodos para formateo de datos
  getTemperatureColor(temp: number): string {
    if (temp < 15) return 'text-blue-500';
    if (temp < 25) return 'text-green-500';
    if (temp < 35) return 'text-orange-500';
    return 'text-red-500';
  }

  getHumidityColor(humidity: number): string {
    if (humidity < 30) return 'text-orange-500';
    if (humidity < 60) return 'text-green-500';
    return 'text-blue-500';
  }

  getLightColor(lux: number): string {
    if (lux < 10) return 'text-gray-500';
    if (lux < 100) return 'text-yellow-500';
    if (lux < 500) return 'text-orange-500';
    return 'text-yellow-300';
  }

  getLightPercentage(lux: number): number {
    return lux > 0 ? Math.min((lux / 1000) * 100, 100) : 0;
  }

  getMotionStatus(): string {
    return this.lastSensorValues.motion
      ? 'Movimiento detectado'
      : 'Sin movimiento';
  }

  getMotionColor(): string {
    return this.lastSensorValues.motion ? 'text-red-500' : 'text-green-500';
  }

  // Método para obtener el tipo de gráficas disponibles según el dispositivo
  getAvailableCharts(): string[] {
    if (!this.selectedDevice) return [];

    switch (this.selectedDevice.device_type_id) {
      case 1: // NODO_CONTROL_PZEM
        return ['main', 'power', 'energy'];
      case 2: // NODO_CONTROL_IR - Sensores individuales
        return ['environmental', 'motion'];
      case 3: // NODO_SENSADO_RPI
        return ['environmental'];
      default:
        return ['main'];
    }
  }

  // Método para obtener el nombre legible de la gráfica
  getChartName(chartType: string): string {
    const chartNames: { [key: string]: string } = {
      main: 'Voltaje y Corriente',
      power: 'Potencia',
      energy: 'Energía',
      environmental: 'Ambiente',
      motion: 'Movimiento',
    };
    return chartNames[chartType] || chartType;
  }

  // Método para obtener el nombre del sensor seleccionado
  getSensorName(sensorKey: string): string {
    const sensorMap: { [key: string]: string } = {
      dht22: 'DHT22 - Temperatura y Humedad',
      light_sensor: 'Sensor de Luz LDR',
      pir: 'PIR - Detector de Movimiento',
    };
    return sensorMap[sensorKey] || sensorKey;
  }

  // Métodos para obtener tiempo actual
  getCurrentTime(): string {
    return new Date().toLocaleTimeString();
  }

  // Métodos para temperatura
  getTemperaturePercentage(temp: number): number {
    return temp > 0 ? Math.min((temp / 50) * 100, 100) : 0;
  }

  getTemperatureStatus(temp: number): string {
    if (temp < 10) return 'Muy Frío';
    if (temp < 18) return 'Frío';
    if (temp < 25) return 'Agradable';
    if (temp < 30) return 'Cálido';
    if (temp < 35) return 'Caliente';
    return 'Muy Caliente';
  }

  // Métodos para humedad
  getHumidityStatus(humidity: number): string {
    if (humidity < 30) return 'Seco';
    if (humidity < 50) return 'Confortable';
    if (humidity < 70) return 'Moderado';
    if (humidity < 80) return 'Húmedo';
    return 'Muy Húmedo';
  }

  // Método para nivel de confort
  getComfortLevel(temp: number, humidity: number): string {
    if (temp >= 20 && temp <= 26 && humidity >= 40 && humidity <= 60) {
      return 'Óptimo';
    } else if (temp >= 18 && temp <= 28 && humidity >= 30 && humidity <= 70) {
      return 'Confortable';
    } else if (temp >= 15 && temp <= 32 && humidity >= 25 && humidity <= 75) {
      return 'Aceptable';
    } else {
      return 'Incómodo';
    }
  }

  // Métodos para luz
  getLightDescription(lux: number): string {
    if (lux < 10) return 'Muy Oscuro';
    if (lux < 50) return 'Oscuro';
    if (lux < 200) return 'Tenue';
    if (lux < 500) return 'Moderado';
    if (lux < 1000) return 'Brillante';
    return 'Muy Brillante';
  }

  getLightStatus(lux: number): string {
    if (lux < 10) return 'Noche';
    if (lux < 50) return 'Interior Tenue';
    if (lux < 200) return 'Interior Normal';
    if (lux < 500) return 'Oficina';
    if (lux < 1000) return 'Día Nublado';
    return 'Pleno Sol';
  }

  getLightIntensity(lux: number): number {
    return lux > 0 ? Math.min((lux / 1000) * 100, 100) : 0;
  }

  getLightEnvironment(lux: number): string {
    if (lux < 10) return 'Nocturno';
    if (lux < 100) return 'Interior';
    if (lux < 500) return 'Mixto';
    return 'Exterior';
  }

  // Métodos para obtener información del sensor
  getSensorIcon(sensorKey: string): string {
    const sensorMap: { [key: string]: string } = {
      dht22: '🌡️',
      light_sensor: '💡',
      pir: '🚶',
    };
    return sensorMap[sensorKey] || '📡';
  }

  getSensorDescription(sensorKey: string): string {
    const sensorMap: { [key: string]: string } = {
      dht22: 'Sensor de temperatura y humedad de alta precisión',
      light_sensor: 'Detector de luminosidad ambiental en lux',
      pir: 'Sensor de detección de movimiento por infrarrojos',
    };
    return sensorMap[sensorKey] || '';
  }

  getSensorVariables(sensorKey: string): string {
    const sensorMap: { [key: string]: string[] } = {
      dht22: ['temperature', 'humidity'],
      light_sensor: ['lux'],
      pir: ['motion'],
    };
    return sensorMap[sensorKey]?.join(', ') || '';
  }
}
