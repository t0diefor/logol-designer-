import { mockProvider } from './providers/mock-provider'
import type { AIProvider, AIToolId } from './types'

/**
 * Chooses the active AI provider.
 *
 * Phase 2 ships mock mode only. The registry exists now so that phase 8 adds a
 * provider here and nothing in the character, world or story features changes:
 * they already talk to the `AIProvider` interface rather than to a vendor SDK.
 *
 * Note what is absent: any API key. Keys belong on the server that proxies the
 * request. `VITE_AI_PROXY_URL` is only the address of that server, which is
 * safe to ship in the bundle -- an actual key never is.
 */
export function getProvider(): AIProvider {
  // Phase 8 will branch here on the configured proxy URL.
  return mockProvider
}

/** Whether the active provider can genuinely perform a tool. */
export function supportsTool(tool: AIToolId): boolean {
  return getProvider().status.supports.includes(tool)
}

/** True when running without a configured provider. Drives the mock-mode badge. */
export function isMockMode(): boolean {
  return !getProvider().status.configured
}
