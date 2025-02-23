import { customElement } from 'lit/decorators/custom-element.js';

import styles from './pf-tab-panel.css';

import { BaseTabPanel } from './BaseTabPanel.js';

/**
 * @slot - Tab panel content
 *
 * @cssprop {<color>} --pf-c-tab-content--m-light-300 {@default `#f0f0f0`}
 *
 * @csspart container - container for the panel content
 */
@customElement('pf-tab-panel')
export class PfTabPanel extends BaseTabPanel {
  static readonly styles = [...BaseTabPanel.styles, styles];
}

declare global {
  interface HTMLElementTagNameMap {
    'pf-tab-panel': PfTabPanel;
  }
}
