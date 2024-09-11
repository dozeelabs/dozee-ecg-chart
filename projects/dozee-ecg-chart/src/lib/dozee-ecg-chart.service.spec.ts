import { TestBed } from '@angular/core/testing';

import { DozeeEcgChartService } from './dozee-ecg-chart.service';

describe('DozeeEcgChartService', () => {
  let service: DozeeEcgChartService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DozeeEcgChartService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
