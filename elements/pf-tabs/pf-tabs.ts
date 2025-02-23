import { customElement } from 'lit/decorators/custom-element.js';
import { property } from 'lit/decorators/property.js';

import { cascades } from '@patternfly/pfe-core/decorators.js';

import { BaseTabs } from './BaseTabs.js';
import { TabExpandEvent } from './BaseTab.js';
import { PfTab } from './pf-tab.js';
import { PfTabPanel } from './pf-tab-panel.js';

import styles from './pf-tabs.css';

/**
 * **Tabs** allow users to navigate between views within the same page or context.
 *
 * @attr {number} active-key - DOM Property: `activeKey` {@default `0`}
 *
 * @csspart container - outer container
 * @csspart tabs-container - tabs container
 * @csspart tabs - tablist
 * @csspart panels - panels
 *
 * @slot tab - Must contain one or more `<pf-tab>`
 * @slot - Must contain one or more `<pf-panel>`
 *
 * @cssprop     {<length>} --pf-c-tabs--Width {@default `auto`}
 * @cssprop     {<length>} --pf-c-tabs--inset {@default `0`}
 *
 * @cssprop     {<color>}   --pf-c-tabs--before--BorderColor       {@default `#d2d2d2`}
 * @cssprop     {<length>}  --pf-c-tabs--before--BorderTopWidth    {@default `0`}
 * @cssprop     {<length>}  --pf-c-tabs--before--BorderRightWidth  {@default `0`}
 * @cssprop     {<length>}  --pf-c-tabs--before--BorderBottomWidth {@default `1px`}
 * @cssprop     {<length>}  --pf-c-tabs--before---BorderLeftWidth  {@default `0`}
 *
 * @cssprop     {<length>}  --pf-c-tabs--m-vertical--MaxWidth      {@default `15.625rem`}
 *
 * @cssprop     {<color>}   --pf-c-tabs--m-vertical__list--before--BorderColor       {@default `#d2d2d2`}
 * @cssprop     {<length>}  --pf-c-tabs--m-vertical__list--before--BorderTopWidth    {@default `0`}
 * @cssprop     {<length>}  --pf-c-tabs--m-vertical__list--before--BorderRightWidth  {@default `0`}
 * @cssprop     {<length>}  --pf-c-tabs--m-vertical__list--before--BorderBottomWidth {@default `0`}
 * @cssprop     {<length>}  --pf-c-tabs--m-vertical__list--before--BorderLeftWidth   {@default `1px`}
 *
 * @cssprop     {<length>}  --pf-c-tabs--m-vertical--m-box--inset  {@default `2rem`}
 *
 * @cssprop     {<display>} --pf-c-tabs__list--Display  {@default `flex`}
 *
 * @cssprop     {<length>}  --pf-c-tabs__scroll-button--Width                         {@default `3rem`}
 * @cssprop     {<color>}   --pf-c-tabs__scroll-button--Color                         {@default `#151515`}
 * @cssprop     {<color>}   --pf-c-tabs__scroll-button--BackgroundColor               {@default `#ffffff`}
 * @cssprop     {<length>}  --pf-c-tabs__scroll-button--OutlineOffset                 {@default `-0.25rem`}
 * @cssprop     {<time>}    --pf-c-tabs__scroll-button--TransitionDuration--margin    {@default `.125s`}
 * @cssprop     {<time>}    --pf-c-tabs__scroll-button--TransitionDuration--transform {@default `.125s`}
 * @cssprop     {<color>}   --pf-c-tabs__scroll-button--hover--Color                  {@default `#06c`}
 *
 * @cssprop     {<color>}   --pf-c-tabs__scroll-button--before--BorderColor           {@default `#d2d2d2`}
 * @cssprop     {<length>}  --pf-c-tabs__scroll-button--before--BorderRightWidth      {@default `0`}
 * @cssprop     {<length>}  --pf-c-tabs__scroll-button--before--BorderBottomWidth     {@default `1px`}
 * @cssprop     {<length>}  --pf-c-tabs__scroll-button--before--BorderLeftWidth       {@default `0`}
 * @cssprop     {<length>}  --pf-c-tabs__scroll-button--before--border-width--base    {@default `1px`}
 *
 * @cssprop     {<color>} --pf-c-tabs__scroll-button--disabled--Color                 {@default `#d2d2d2`}
 */
@customElement('pf-tabs')
export class PfTabs extends BaseTabs {
  static readonly styles = [...BaseTabs.styles, styles];

  protected static readonly scrollTimeoutDelay = 150;

  static isTab(element: HTMLElement): element is PfTab {
    return element instanceof PfTab;
  }

  static isPanel(element: HTMLElement): element is PfTabPanel {
    return element instanceof PfTabPanel;
  }

  static isExpandEvent(event: Event): event is TabExpandEvent {
    return event instanceof TabExpandEvent;
  }

  @cascades('pf-tab', 'pf-tab-panel')
  @property({ reflect: true }) box: 'light' | 'dark' | null = null;

  @cascades('pf-tab', 'pf-tab-panel')
  @property({ reflect: true, type: Boolean }) vertical = false;

  @cascades('pf-tab')
  @property({ reflect: true, type: Boolean }) fill = false;

  @cascades('pf-tab')
  @property({ attribute: 'border-bottom' }) borderBottom: 'true' | 'false' = 'true';

  protected get canShowScrollButtons(): boolean {
    return !this.vertical;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'pf-tabs': PfTabs;
  }
}
