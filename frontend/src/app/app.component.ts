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
      margin-top: 2rem;
    }
  `]
})
export class AppComponent {
  title = 'Mzansi Fleet Management';
}
