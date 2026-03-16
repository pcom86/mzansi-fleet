import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet],
  template: `

    <main>
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    main {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      display: block;
    }
  `]
})
export class AppComponent {
  title = 'Mzansi Fleet Management';
}
