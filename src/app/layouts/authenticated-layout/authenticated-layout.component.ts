import { Component, OnInit } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/auth/auth.service';

interface NavItem {
  label: string;
  icon: string;
  route: string;
  activeIcon?: string;
}

@Component({
  selector: 'app-authenticated-layout',
  templateUrl: './authenticated-layout.component.html',
  styleUrls: ['./authenticated-layout.component.scss'],
  standalone: false
})
export class AuthenticatedLayoutComponent implements OnInit {
  currentRoute: string = '';
  isSidebarCollapsed: boolean = false;
  
  navItems: NavItem[] = [
    { 
      label: 'Home', 
      icon: 'home-outline', 
      activeIcon: 'home',
      route: '/home' 
    },
    { 
      label: 'Research', 
      icon: 'search-outline', 
      activeIcon: 'search',
      route: '/request-analysis' 
    },
    { 
      label: 'Search', 
      icon: 'search-circle-outline', 
      activeIcon: 'search-circle',
      route: '/search' 
    },
    { 
      label: 'Profile', 
      icon: 'person-outline', 
      activeIcon: 'person',
      route: '/profile' 
    }
  ];
  
  constructor(
    private router: Router,
    public authService: AuthService
  ) {}
  
  ngOnInit() {
    // Track current route
    this.currentRoute = this.router.url;
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.currentRoute = event.urlAfterRedirects || event.url;
      });
    
    // Check if sidebar should be collapsed on mobile
    this.checkScreenSize();
    window.addEventListener('resize', () => this.checkScreenSize());
  }
  
  isActive(route: string): boolean {
    return this.currentRoute.startsWith(route);
  }
  
  toggleSidebar() {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }
  
  private checkScreenSize() {
    if (window.innerWidth < 768) {
      this.isSidebarCollapsed = true;
    }
  }
  
  async logout() {
    await this.authService.signOut();
    this.router.navigate(['/login']);
  }
}
