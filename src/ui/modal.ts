import { h } from './dom';

/** Modal simples com título, conteúdo e um botão de fechar. */
export function showModal(title: string, body: (Node | string)[], buttonText = 'Continuar'): void {
  const close = () => backdrop.remove();
  const backdrop = h(
    'div',
    { class: 'modal-backdrop' },
    h(
      'div',
      { class: 'modal', attrs: { role: 'dialog', 'aria-modal': 'true' } },
      h('h2', { text: title }),
      ...body.map((b) => (typeof b === 'string' ? h('p', { text: b }) : b)),
      h('button', { class: 'btn wide', text: buttonText, onClick: close }),
    ),
  );
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  document.body.append(backdrop);
}
