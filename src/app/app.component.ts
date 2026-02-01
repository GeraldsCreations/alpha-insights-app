import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { UserPreferencesService } from './core/services/user-preferences.service';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  standalone: false,
})
export class AppComponent implements OnInit {
  showAppShell: boolean = false;
  
  private authRoutes = ['/login', '/register'];

  constructor(
    private userPreferencesService: UserPreferencesService,
    private router: Router
  ) {}

  ngOnInit() {
    // Initialize theme on app start
    this.userPreferencesService.initializeTheme();
    
    // Determine whether to show app shell based on current route
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.showAppShell = !this.authRoutes.some(route => 
          event.urlAfterRedirects.startsWith(route)
        );
      });
    
    // Set initial state
    this.showAppShell = !this.authRoutes.some(route => 
      this.router.url.startsWith(route)
    );
  }
}
