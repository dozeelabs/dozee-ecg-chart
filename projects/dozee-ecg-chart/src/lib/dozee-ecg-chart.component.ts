import { Component, OnInit, Input } from '@angular/core';
import {
  Chart,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';

interface EcgSignalData {
  Key: string;
  Timestamp: number;
  Values: number[];
}

interface Xy {
  Timestamp: number;
  Value: number;
}

@Component({
  selector: 'app-ecg-chart',
  templateUrl: './ecg-chart.component.html',
  styleUrls: ['./ecg-chart.component.css'],
})
export class EcgChartComponent implements OnInit {
  @Input() accessToken!: string;
  @Input() userId!: string;

  private eventSource!: EventSource;
  private buffer: Xy[][] = [];
  private chart!: Chart;
  private frequency = 256; // Hz
  private duration = 8; // seconds
  private maxPoints = this.frequency * this.duration; // 2048 points
  private ecgData = Array(this.maxPoints).fill(null);

  constructor() {}

  ngOnInit(): void {
    // Register necessary chart components
    Chart.register(
      CategoryScale,
      LinearScale,
      LineController,
      LineElement,
      PointElement,
      Title,
      Tooltip,
      Legend
    );

    const ctx = document.getElementById('ecgChart') as HTMLCanvasElement;

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array(this.maxPoints).fill(0.0), // Empty labels as X axis is fixed
        datasets: [
          {
            label: 'ECG Data',
            data: this.ecgData,
            borderColor: 'rgba(75, 192, 192, 1)',
            borderWidth: 2,
            fill: false,
            pointRadius: 0, // Hide points for smooth line
          },
        ],
      },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            type: 'linear',
            min: 0,
            max: this.maxPoints, // Set fixed X-axis range (8 seconds)
            display: true, // Hide the x-axis
          },
          y: {
            max: 4000, // Adjust based on ECG value range
            min: 0,
            type: 'linear',
            beginAtZero: true,
            title: {
              display: true,
              text: 'ECG Signal',
            },
          },
        },
      },
    });

    // Initialize SSE connection
    this.initializeSse();

    // Update chart data at regular intervals
    setInterval(() => {
      if (this.buffer.length > 0) {
        const entry = this.buffer.shift() as Xy[];
        for (const e of entry) {
          this.addData(e);
        }
      }
    }, 16); // Update frequency (256 Hz)
  }

  private currentIndex = 0;
  addData(e: Xy) {
    if (this.chart.data.labels) {
      this.ecgData[this.currentIndex] = e.Value;
      this.chart.data.labels[this.currentIndex] = this.currentIndex;

      for (
        let i = this.currentIndex + 1;
        i < Math.min(this.currentIndex + 64, this.maxPoints);
        i++
      ) {
        this.ecgData[i] = null;
      }

      // Advance the index, and wrap around if it exceeds maxPoints
      this.currentIndex = (this.currentIndex + 1) % this.maxPoints;

      // Update the chart data
      this.chart.data.datasets[0].data = this.ecgData;
      this.chart.update();
    }
  }

  initializeSse(): void {
    const sseUrl = `https://sse.dozee.cloud/sse/ecgstream?userId=${this.userId}&accessToken=${this.accessToken}`;
    this.eventSource = new EventSource(sseUrl);

    this.eventSource.onmessage = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as EcgSignalData;
      if (data.Key === 'SIGNAL') {
        let entry: Xy[] = [];
        data.Values.forEach((s: number, i: number) => {
          entry.push({
            Timestamp: data.Timestamp + i * (1000 / this.frequency), // Adjust timestamp for frequency
            Value: s,
          });

          if (entry.length === 4) {
            this.buffer.push(entry);
            entry = [];
          }
        });
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('SSE error:', error);
    };
  }

  ngOnDestroy(): void {
    if (this.eventSource) {
      this.eventSource.close();
    }
  }
}
