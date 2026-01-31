import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AnalysisDetailPage } from './analysis-detail.page';

describe('AnalysisDetailPage', () => {
  let component: AnalysisDetailPage;
  let fixture: ComponentFixture<AnalysisDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AnalysisDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
