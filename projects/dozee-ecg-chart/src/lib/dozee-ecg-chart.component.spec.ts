import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DozeeEcgChartComponent } from './dozee-ecg-chart.component';

describe('DozeeEcgChartComponent', () => {
  let component: DozeeEcgChartComponent;
  let fixture: ComponentFixture<DozeeEcgChartComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DozeeEcgChartComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DozeeEcgChartComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
