import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DozeeEcgChartComponent } from './dozee-ecg-chart.component';

@NgModule({
  declarations: [DozeeEcgChartComponent], // Declare the component
  imports: [CommonModule], // Import necessary modules
  exports: [DozeeEcgChartComponent], // Export the component so it can be used outside
})
export class DozeeEcgChartModule {}
