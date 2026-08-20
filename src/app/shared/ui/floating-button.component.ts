import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { FaIconComponent } from '@fortawesome/angular-fontawesome';
import { IconDefinition } from '@fortawesome/fontawesome-svg-core';

/**
 * Reusable floating action button pinned to the bottom-right corner.
 * Presentational only: the parent decides when to show it and what happens on click.
 */
@Component({
  selector: 'app-floating-button',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FaIconComponent],
  template: `
    <button
      type="button"
      class="fab-enter fixed bottom-5 right-5 z-20 btn btn-primary shadow-xl"
      (click)="action.emit()"
    >
      @if (icon(); as ic) { <fa-icon [icon]="ic" /> }
      {{ label() }}
    </button>
  `,
})
export class FloatingButtonComponent {
  readonly label = input.required<string>();
  readonly icon = input<IconDefinition>();
  readonly action = output<void>();
}
