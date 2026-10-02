export type TileId = number;
export type Seat = 0 | 1 | 2 | 3;
export type LocalMode = 'single' | 'east' | 'half';
export interface FutureEvent {
  sessionId: string;
  hand: number;
  seq: number;
  rulesVersion: string;
  kind: 'draw' | 'discard' | 'riichiAccepted' | 'call' | 'kanOffer' | 'win' | 'drawEnd' | 'finished';
  payload: Record<string, unknown>;
  visibility: 'public' | 'seat-private' | 'after-hand';
}
export interface FutureReplay {
  schema: 1;
  seed: number;
  rulesVersion: string;
  commands: Array<{seq: number; seat: Seat; kind: string; tileId?: TileId}>;
  events: FutureEvent[];
}
export interface FutureMatchRecord {
  matchId: string;
  completed: boolean;
  mode: LocalMode;
  points: [number,number,number,number];
  ranking: Seat[];
  rulesVersion: string;
}
