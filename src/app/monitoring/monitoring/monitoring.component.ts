import { Component, OnInit, OnDestroy } from '@angular/core';
import { EChartsOption, SeriesOption } from 'echarts';

@Component({
  selector: 'app-monitoring',
  templateUrl: './monitoring.component.html',
  styleUrls: ['./monitoring.component.css']
})
export class MonitoringComponent implements OnInit, OnDestroy {
  private ws: WebSocket;

  chartOption: EChartsOption & { series: SeriesOption[] } = {
    series: []
  };

  powerChartOption: EChartsOption & { series: SeriesOption[] } = {
    series: []
  };

  energyChartOption: EChartsOption & { series: SeriesOption[] } = {
    series: []
  };

  timeData: string[] = [];
  voltageData: number[] = [];
  currentData: number[] = [];
  powerData: number[] = [];
  energyData: number[] = [];

  constructor() {
    this.ws = new WebSocket('wss://websocketvoltio.acstree.xyz/ws?topic=pzem&mac=CC:DB:A7:2F:AE:B0');
  }

  ngOnInit() {
    this.initCharts();
    this.setupWebSocket();
  }

  ngOnDestroy() {
    if (this.ws) {
      this.ws.close();
    }
  }

  private setupWebSocket() {
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
        left: 'center'
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' }
      },
      legend: {
        data: ['Voltaje (V)', 'Corriente (A)'],
        bottom: 0
      },
      xAxis: {
        type: 'category',
        data: []
      },
      yAxis: [
        {
          type: 'value',
          name: 'Voltaje (V)',
          position: 'left'
        },
        {
          type: 'value',
          name: 'Corriente (A)',
          position: 'right'
        }
      ],
      series: [
        {
          name: 'Voltaje (V)',
          type: 'line',
          data: [],
          smooth: true,
          lineStyle: { width: 2 },
          itemStyle: { color: '#FF4560' }
        },
        {
          name: 'Corriente (A)',
          type: 'line',
          yAxisIndex: 1,
          data: [],
          smooth: true,
          lineStyle: { width: 2 },
          itemStyle: { color: '#00E396' }
        }
      ]
    };

    this.powerChartOption = {
      title: {
        text: 'Potencia en Tiempo Real',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: []
      },
      yAxis: {
        type: 'value',
        name: 'Potencia (W)'
      },
      series: [
        {
          type: 'line',
          data: [],
          areaStyle: {},
          smooth: true,
          itemStyle: { color: '#008FFB' }
        }
      ]
    };

    this.energyChartOption = {
      title: {
        text: 'Consumo de Energía',
        left: 'center'
      },
      tooltip: {
        trigger: 'axis'
      },
      xAxis: {
        type: 'category',
        data: []
      },
      yAxis: {
        type: 'value',
        name: 'Energía (kWh)'
      },
      series: [
        {
          type: 'bar',
          data: [],
          itemStyle: { color: '#FEB019' }
        }
      ]
    };
  }

  private updateCharts() {
    this.chartOption = {
      ...this.chartOption,
      xAxis: {
        type: 'category',
        data: [...this.timeData]
      },
      series: [
        {
          name: 'Voltaje (V)',
          type: 'line',
          data: [...this.voltageData],
          smooth: true,
          lineStyle: { width: 2 },
          itemStyle: { color: '#FF4560' }
        },
        {
          name: 'Corriente (A)',
          type: 'line',
          yAxisIndex: 1,
          data: [...this.currentData],
          smooth: true,
          lineStyle: { width: 2 },
          itemStyle: { color: '#00E396' }
        }
      ]
    };

    this.powerChartOption = {
      ...this.powerChartOption,
      xAxis: {
        type: 'category',
        data: [...this.timeData]
      },
      series: [
        {
          type: 'line',
          data: [...this.powerData],
          areaStyle: {},
          smooth: true,
          itemStyle: { color: '#008FFB' }
        }
      ]
    };

    this.energyChartOption = {
      ...this.energyChartOption,
      xAxis: {
        type: 'category',
        data: [...this.timeData]
      },
      series: [
        {
          type: 'bar',
          data: [...this.energyData],
          itemStyle: { color: '#FEB019' }
        }
      ]
    };
  }
}
