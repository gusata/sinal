import type { Game } from '../core/game';
import { TUTORIAL, type TutorialStep } from '../data/tutorial';
import { h, setText } from './dom';

const HIGHLIGHT = 'tut-target';

/**
 * Mostra as dicas de data/tutorial.ts num cartão acima das abas.
 * Não pausa o jogo: o jogador pode continuar tocando com a dica aberta.
 */
export class Tutorial {
  private current: TutorialStep | null = null;
  private highlighted: Element | null = null;
  private title = h('div', { class: 'tutorial-title' });
  private body = h('div', { class: 'tutorial-body' });
  private card: HTMLElement;

  constructor(
    host: HTMLElement,
    private game: Game,
    private onChange: () => void,
  ) {
    this.card = h(
      'div',
      { class: 'tutorial', attrs: { role: 'status', 'aria-live': 'polite' } },
      this.title,
      this.body,
      h('button', { class: 'btn tutorial-ok', text: 'Entendi', onClick: () => this.complete() }),
    );
    this.card.hidden = true;
    host.append(this.card);
  }

  update(): void {
    const done = this.game.state.tutorial.done;

    if (this.current) {
      if (this.current.doneWhen?.(this.game)) {
        this.complete();
        return;
      }
      this.render(this.current);
      return;
    }

    const next = TUTORIAL.find((s) => !done.includes(s.id) && s.when(this.game));
    if (!next) return;
    // Se o objetivo já foi cumprido, nem mostra.
    if (next.doneWhen?.(this.game)) {
      done.push(next.id);
      return;
    }
    this.current = next;
    this.card.hidden = false;
    this.card.classList.remove('tutorial-in');
    void this.card.offsetWidth; // reinicia a animação de entrada
    this.card.classList.add('tutorial-in');
    this.render(next);
  }

  private render(step: TutorialStep): void {
    setText(this.title, `► ${step.title}`);
    const text = step.lines(this.game).join('\n');
    setText(this.body, text);

    // O alvo pode ter sido recriado (troca de aba), então busca de novo.
    const target = step.target ? document.querySelector(step.target) : null;
    if (target !== this.highlighted) {
      this.highlighted?.classList.remove(HIGHLIGHT);
      target?.classList.add(HIGHLIGHT);
      this.highlighted = target;
    }
  }

  private complete(): void {
    if (!this.current) return;
    this.game.state.tutorial.done.push(this.current.id);
    this.current = null;
    this.highlighted?.classList.remove(HIGHLIGHT);
    this.highlighted = null;
    this.card.hidden = true;
    this.onChange();
  }

  /** Recomeça todas as dicas (botão "Rever dicas"). */
  reset(): void {
    this.complete();
    this.game.state.tutorial.done = [];
  }
}
