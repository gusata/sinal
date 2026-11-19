// Helpers mínimos de DOM. Sem framework: a UI é construída uma vez e
// depois só os textos/estados mudam a cada tick (barato e sem "piscar").

type Child = Node | string | null | undefined | false;

interface Props {
  class?: string;
  text?: string;
  onClick?: (e: MouseEvent) => void;
  attrs?: Record<string, string>;
}

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Props = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (props.class) el.className = props.class;
  if (props.text !== undefined) el.textContent = props.text;
  if (props.onClick) el.addEventListener('click', props.onClick as EventListener);
  if (props.attrs) for (const [k, v] of Object.entries(props.attrs)) el.setAttribute(k, v);
  for (const c of children) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c);
  }
  if (el instanceof HTMLButtonElement && !props.attrs?.type) el.type = 'button';
  return el;
}

/** Só escreve no DOM se o texto mudou. */
export function setText(el: Element, text: string): void {
  if (el.textContent !== text) el.textContent = text;
}

export function setVisible(el: HTMLElement, visible: boolean): void {
  if (el.hidden === visible) el.hidden = !visible;
}

export function setDisabled(el: HTMLButtonElement, disabled: boolean): void {
  if (el.disabled !== disabled) el.disabled = disabled;
}

/** Interface comum de cada aba. */
export interface Panel {
  el: HTMLElement;
  /** Chamado ~10x por segundo enquanto a aba está visível. */
  update(now: number): void;
  /** Chamado quando a aba é aberta. */
  onShow?(): void;
}
