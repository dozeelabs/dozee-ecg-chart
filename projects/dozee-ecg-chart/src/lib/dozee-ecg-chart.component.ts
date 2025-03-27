import { Component, OnInit, Input, Renderer2 } from '@angular/core';
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
  templateUrl: './dozee-ecg-chart.component.html',
  styleUrls: ['./dozee-ecg-chart.component.css'],
})
export class DozeeEcgChartComponent implements OnInit {
  @Input() accessToken!: string;
  @Input() userId!: string;
  @Input() stage!: string;
  @Input() strokeColor: string = '#00ff00';
  @Input() backgroundColor: string = '#000000';

  private eventSource!: EventSource;
  private buffer: Xy[][] = [];
  private chart!: Chart;
  private frequency = 256; // Hz
  private duration = 8; // seconds
  private maxPoints = this.frequency * this.duration; // 2048 points
  private ecgData = Array(this.maxPoints).fill(null);
  private bufferLimit = 64 * 64;
  private isPageActive = true;
  private intervalId: any;
  private inactivityTimeout: any; // Timer to track inactivity
  private inactiveDelay = 30000;

  constructor(private renderer: Renderer2) {}

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
    ctx.style.backgroundColor = this.backgroundColor;

    this.chart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: Array(this.maxPoints).fill(0.0), // Empty labels as X axis is fixed
        datasets: [
          {
            label: 'ECG Data',
            data: this.ecgData,
            borderColor: this.strokeColor,
            borderWidth: 1,
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
            display: false, // Hide the x-axis
            grid: { display: false },
          },
          y: {
            max: 4000, // Adjust based on ECG value range
            min: 0,
            type: 'linear',
            beginAtZero: true,
            grid: { display: false },
            display: false,
          },
        },
        plugins: {
          legend: {
            display: false,
          },
        },
        elements: {
          line: {
            tension: 0.4,
          },
        },
      },
    });

    // Initialize SSE connection
    this.initializeSse();

    this.renderer.listen('document', 'visibilitychange', () => {
      if (document.hidden) {
        console.log('Page became inactive, starting 30s timeout...');
        this.startInactivityTimer();
      } else {
        console.log('Page is active again, canceling inactivity timeout');
        this.cancelInactivityTimer();
        this.startInterval();
      }
    });

    // Start interval initially
    this.startInterval();
  }

  private startInterval() {
    if (!this.intervalId) {
      // Update chart data at regular intervals
      this.intervalId = setInterval(() => {

        if (this.buffer.length > this.bufferLimit && this.currentIndex === 0) {
          if (this.stage === 'sit') {
            console.warn(`Buffer overflow: Skipping ${this.buffer.length - 64} old entries`);
          }
          this.buffer.splice(0, this.buffer.length - 64);
        }

        if (this.buffer.length > 0) {
          const entry = this.buffer.shift() as Xy[];
          for (const e of entry) {
            this.addData(e);
          }
        }
      }, 16); // Update frequency (256 Hz)
    }
  }

  private startInactivityTimer() {
    this.inactivityTimeout = setTimeout(() => {
      console.log('Page has been inactive for 30 seconds, stopping updates.');
      this.isPageActive = false;
      this.clearInterval();
    }, this.inactiveDelay);
  }

  private cancelInactivityTimer() {
    if (this.inactivityTimeout) {
      clearTimeout(this.inactivityTimeout);
      this.inactivityTimeout = null;
    }
    this.isPageActive = true;
  }

  private clearInterval() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
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
      if (this.stage === 'sit') {
      console.log('Current index:', this.currentIndex);
      }

      // Update the chart data
      this.chart.data.datasets[0].data = this.ecgData;
      this.chart.update();
    }
  }

  initializeSse(): void {
    const sseUrl = `https://sse${this.stage ? `-${this.stage}`: ''}.dozee.cloud/sse/ecgstream?userId=${this.userId}&accessToken=${this.accessToken}&ngsw-bypass=true`;
    this.eventSource = new EventSource(sseUrl);

    this.eventSource.onmessage = (e: MessageEvent) => {
      const data = JSON.parse(e.data) as EcgSignalData;
      if (data.Key === 'SIGNAL' && this.isPageActive) {
        let entry: Xy[] = [];
        data.Values.forEach((s: number, i: number) => {
          entry.push({
            Timestamp: data.Timestamp + i * (1000 / this.frequency), // Adjust timestamp for frequency
            Value: s,
          });

          if (entry.length === 4) {
            this.buffer.push(entry);
            if (this.stage === 'sit') {
            console.log('Buffer length:', this.buffer.length);
            }
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
