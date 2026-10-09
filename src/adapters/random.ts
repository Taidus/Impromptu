import type { Random } from "@/domain/ports";
import { uuidFromBytes } from "@/domain/uuid";

// getRandomValues (not randomUUID) so it also works outside secure contexts, e.g. LAN http.
export const cryptoRandom: Random = {
  next: () => crypto.getRandomValues(new Uint32Array(1))[0] / 4294967296,
  uuid: () => uuidFromBytes(crypto.getRandomValues(new Uint8Array(16))),
};
