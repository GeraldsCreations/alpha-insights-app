import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RequestAnalysisPage } from './request-analysis.page';

describe('RequestAnalysisPage', () => {
  let component: RequestAnalysisPage;
  let fixture: ComponentFixture<RequestAnalysisPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RequestAnalysisPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
