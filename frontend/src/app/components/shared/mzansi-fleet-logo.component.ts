import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-mzansi-fleet-logo',
  standalone: true,
  imports: [CommonModule],
  template: `
    <svg 
      [attr.width]="width" 
      [attr.height]="height" 
      viewBox="0 0 200 80" 
      xmlns="http://www.w3.org/2000/svg"
      class="mzansi-logo">
      <!-- Truck body - Gold -->
      <rect x="30" y="35" width="35" height="20" rx="2" fill="#D4AF37"/>
      
      <!-- Truck cabin - Black -->
      <path d="M 25 40 L 30 35 L 30 55 L 25 55 Z" fill="#000000"/>
      
      <!-- Windshield - Light gold -->
      <rect x="26" y="42" width="3" height="8" fill="#F0E68C"/>
      
      <!-- Wheels - Black with gold centers -->
      <circle cx="35" cy="55" r="5" fill="#000000"/>
      <circle cx="35" cy="55" r="2.5" fill="#FFD700"/>
      <circle cx="60" cy="55" r="5" fill="#000000"/>
      <circle cx="60" cy="55" r="2.5" fill="#FFD700"/>
      
      <!-- Speed lines - Gold -->
      <line x1="15" y1="38" x2="22" y2="38" stroke="#D4AF37" stroke-width="2"/>
      <line x1="13" y1="45" x2="20" y2="45" stroke="#D4AF37" stroke-width="2"/>
      <line x1="15" y1="52" x2="22" y2="52" stroke="#D4AF37" stroke-width="2"/>

      <!-- Text "MZANSI" -->
      <text x="75" y="35" 
            font-family="Arial, sans-serif" 
            font-size="22" 
            font-weight="bold" 
            fill="#000000">
        MZANSI
      </text>
      
      <!-- Text "FLEET" -->
      <text x="75" y="55" 
            font-family="Arial, sans-serif" 
            font-size="22" 
            font-weight="bold" 
            fill="#D4AF37">
        FLEET
      </text>
    </svg>
  `,
  styles: [`
    .mzansi-logo {
      display: inline-block;
    }
  `]
})
export class MzansiFleetLogoComponent {
  @Input() width: number = 200;
  @Input() height: number = 80;
}
