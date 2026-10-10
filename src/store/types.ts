import type { ComposeLibrary } from "@/domain/compose/compose";
import type { Clock, Random, Repository } from "@/domain/ports";
import type { Rep, Session, Setup } from "@/domain/session/schema";
import type { SessionEvent } from "@/domain/session/session-reducer";
import type { SetupEvent, SetupReducerResult } from "@/domain/session/setup-reducer";

export type Status = "loading" | "ready" | "error";

export interface StoreState {
  /** AD-10: Repository hydration status. `setup` is only meaningful once this is `'ready'`; `'error'` when no Setup is stored and the library failed to load (or couldn't build a default one). */
  status: Status;
  /** The library loader's status; `compose`-backed commands wait for `'ready'` (queued otherwise, dropped on `'error'`). */
  libraryStatus: Status;
  /** `null` until hydration resolves it -- either from storage, or (first visit) from the library. */
  setup: Setup | null;
  /** The loaded library (the same object `compose()` uses); `null` until `libraryStatus` is `'ready'`, and stays `null` when it is `'error'`. Setup reads `.mediums`/`.skills` for Medium/Skill names (NFR-6) -- never a hardcoded string. */
  library: ComposeLibrary | null;
  session: Session;
  history: Rep[];
  /** True after a save failed for a reason other than a rev conflict (the change is held in memory only); cleared by the next successful save. */
  saveFailed: boolean;
  /** `deps.repository.storageAvailable`, read once during `hydrate()`. False drives the FR-29 "storage unavailable" copy and hides Export/Clear. */
  storageAvailable: boolean;
  /** True if `setup`, `session`, or `history` failed to migrate (OR-ed together after their loads in `hydrate()`). */
  migrationFailed: boolean;
}

/**
 * The command layer (AD-7): calls into `compose()`, or otherwise needs more
 * than one storage slice (session + history) in one transition. `vary` is
 * phase 2 (Story 5.8); `reroll` is a later story.
 */
export type StoreCommand =
  | { type: "new_challenge" }
  | { type: "finish_rep" }
  | { type: "save_rep" }
  | { type: "retry"; fromRepId: string };

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
  /** Plain AD-7 setup events (`set_level`, `toggle_medium`, ...). No-op before `setup` is resolved. Returns the reducer's notice (e.g. `last_medium` when a toggle was blocked), if any. */
  dispatchSetup(event: SetupEvent): SetupReducerResult["notice"];
  /** Plain AD-7 session events (`reveal_next`, ...). */
  dispatchSession(event: SessionEvent): void;
  /** The command layer: calls `compose()` (if needed) and dispatches the resulting session event. */
  dispatch(command: StoreCommand): void;
}
