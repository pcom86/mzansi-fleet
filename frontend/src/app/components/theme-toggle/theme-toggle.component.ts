import { Component } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ThemeService } from '../../services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  standalone: true,
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <button mat-icon-button 
            (click)="toggleTheme()" 
            class="theme-toggle-btn"
            [matTooltip]="isDarkTheme ? 'Switch to light theme' : 'Switch to dark theme'"
            matTooltipPosition="below">
      <mat-icon>{{ isDarkTheme ? 'light_mode' : 'dark_mode' }}</mat-icon>
    </button>
  `,
  styles: [`
    .theme-toggle-btn {
      transition: all 0.3s ease;
    }
    
    .theme-toggle-btn:hover {
      transform: scale(1.1);
    }
    
    .theme-toggle-btn mat-icon {
      transition: all 0.3s ease;
    }
  `]
})
export class ThemeToggleComponent {
  isDarkTheme: boolean = false;

  constructor(private themeService: ThemeService) {
    this.themeService.isDarkTheme$.subscribe((isDark: boolean) => {
      this.isDarkTheme = isDark;
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }
}
