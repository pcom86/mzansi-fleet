import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'theme';
  private darkThemeSubject = new BehaviorSubject<boolean>(false);
  
  public isDarkTheme$ = this.darkThemeSubject.asObservable();

  constructor() {
    this.initializeTheme();
  }

  private initializeTheme(): void {
    const storedTheme = localStorage.getItem(this.THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const isDark = storedTheme === 'dark' || (!storedTheme && prefersDark);
    
    this.setTheme(isDark);
  }

  public toggleTheme(): void {
    const currentTheme = this.darkThemeSubject.value;
    const newTheme = !currentTheme;
    this.setTheme(newTheme);
  }

  public setTheme(isDark: boolean): void {
    this.darkThemeSubject.next(isDark);
    localStorage.setItem(this.THEME_KEY, isDark ? 'dark' : 'light');
    
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }

  public getCurrentTheme(): boolean {
    return this.darkThemeSubject.value;
  }
}
