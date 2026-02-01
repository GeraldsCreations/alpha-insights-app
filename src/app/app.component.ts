import { Component, OnInit } from '@angular/core';
import { UserPreferencesService } from './core/services/user-preferences.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  
  constructor(
    private userPreferencesService: UserPreferencesService
  ) {}

  ngOnInit() {
    // Initialize theme on app start
    this.userPreferencesService.initializeTheme();
  }
}
