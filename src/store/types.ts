import type { Clock, Random, Repository } from "@/domain/ports";
import type { Rep, Session, Setup } from "@/domain/session/schema";
import type { SessionEvent } from "@/domain/session/session-reducer";
import type { SetupEvent } from "@/domain/session/setup-reducer";

export type Status = "loading" | "ready";

export interface StoreState {
  /** AD-10: Repository hydration status. `setup` is only meaningful once this is `'ready'`. */
  status: Status;
  /** The library loader's status; `compose`-backed commands wait for `'ready'` (queued otherwise). */
  libraryStatus: Status;
  /** `null` until hydration resolves it -- either from storage, or (first visit) from the library. */
  setup: Setup | null;
  session: Session;
  history: Rep[];
}

/** The command layer (AD-7): calls into `compose()`. Later stories add `reroll`, `retry`, `vary`. */
export type StoreCommand = { type: "new_challenge" };

export interface StoreDeps {
  repository: Repository;
  clock: Clock;
  random: Random;
  /** Injected, never `src/generated/library.json` directly -- see `src/adapters/library`. */
  librarySource: () => Promise<unknown>;
}

export interface Store {
  getState(): StoreState;
  subscribe(listener: () => void): () => void;
  /** Reads the Repository and starts the library load. Idempotent -- safe to call from an effect more than once. */
  hydrate(): void;
  /** Plain AD-7 setup events (`set_level`, `toggle_medium`, ...). No-op before `setup` is resolved. */
  dispatchSetup(event: SetupEvent): void;
  /** Plain AD-7 session events (`reveal_next`, ...). */
  dispatchSession(event: SessionEvent): void;
  /** The command layer: calls `compose()` (if needed) and dispatches the resulting session event. */
  dispatch(command: StoreCommand): void;
}
