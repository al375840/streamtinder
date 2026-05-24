import { Injectable, computed, signal } from '@angular/core';

export type GamePhase =
  | 'idle' | 'lobby' | 'card' | 'cardReveal'
  | 'tallyTransition' | 'criba' | 'victory';

export interface LobbyPlayerDto {
  nick: string;
  joinedAt: string;
}

export interface CardDto {
  id: string;
  imagePath: string;
  subtitle?: string;
}

export interface PackDto {
  id: string;
  name: string;
  question: string;
  palettePrimary?: string;
  paletteAccent?: string;
  cards: CardDto[];
}

export interface GameStateDto {
  phase: GamePhase;
  pack?: PackDto;
  cardIndex: number;
  cardTimerEndsAt?: string;
  streamerVote?: 'left' | 'right';
  lobbyPlayers: LobbyPlayerDto[];
  lobbyCountdownEndsAt?: string;
  currentCardVotes: Record<string, { direction: 'left' | 'right' }>;
  aciertosByNick: Record<string, number>;
  eliminatedTiers: number[];
}

export interface GameWinnerDto {
  nick: string;
  aciertos: number;
  bonus: number;
  totalPoints: number;
}

@Injectable({ providedIn: 'root' })
export class GameStateStore {
  readonly state = signal<GameStateDto | null>(null);
  readonly winners = signal<GameWinnerDto[]>([]);
  readonly phase = computed(() => this.state()?.phase ?? 'idle');

  // Computed útiles
  readonly lobbyPlayers = computed(() => this.state()?.lobbyPlayers ?? []);
  readonly currentCard = computed(() => {
    const s = this.state();
    if (!s?.pack) return null;
    return s.pack.cards[s.cardIndex] ?? null;
  });
  readonly eliminatedTiers = computed(() => this.state()?.eliminatedTiers ?? []);
  readonly aciertosByNick = computed(() => this.state()?.aciertosByNick ?? {});
}
