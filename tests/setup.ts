import ws from "ws";
import { config } from "dotenv";
import { vi } from "vitest";

// Route handlers and server libs validate env at import time, so the local
// env file must be loaded before any test module is imported.
config({ path: ".env.local" });

// supabase-js needs a global WebSocket; Node 20 does not ship one.
(globalThis as unknown as { WebSocket?: unknown }).WebSocket ??= ws;

// "server-only" guards RSC-only modules; tests run in plain Node.
vi.mock("server-only", () => ({}));
