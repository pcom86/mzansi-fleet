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
      <!-- Background circle with gold -->
      <circle cx="40" cy="40" r="35" fill="#D4AF37" opacity="0.15"/>
      
      <!-- Truck icon with black and gold colors -->
      <g transform="translate(10, 20)">
        <!-- Truck body - Gold -->
        <rect x="20" y="15" width="35" height="20" rx="2" fill="#D4AF37"/>
        
        <!-- Truck cabin - Black -->
        <path d="M 15 20 L 20 15 L 20 35 L 15 35 Z" fill="#000000"/>
        
        <!-- Windshield - Light gold -->
        <rect x="16" y="22" width="3" height="8" fill="#F0E68C"/>
        
        <!-- Wheels - Black with gold centers -->
        <circle cx="25" cy="35" r="5" fill="#000000"/>
        <circle cx="25" cy="35" r="2.5" fill="#FFD700"/>
        <circle cx="50" cy="35" r="5" fill="#000000"/>
        <circle cx="50" cy="35" r="2.5" fill="#FFD700"/>
        
        <!-- Speed lines - Gold -->
        <line x1="5" y1="18" x2="12" y2="18" stroke="#D4AF37" stroke-width="2"/>
        <line x1="3" y1="25" x2="10" y2="25" stroke="#D4AF37" stroke-width="2"/>
        <line x1="5" y1="32" x2="12" y2="32" stroke="#D4AF37" stroke-width="2"/>
      </g>

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
      
      <!-- Decorative arc - Gold gradients -->
      <path d="M 75 58 Q 135 62, 185 58" 
            stroke="#D4AF37" 
            stroke-width="2" 
            fill="none"/>
      <path d="M 75 61 Q 135 65, 185 61" 
            stroke="#FFD700" 
            stroke-width="1.5" 
            fill="none"/>
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
