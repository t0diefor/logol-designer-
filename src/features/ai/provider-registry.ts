import { mockExpandCharacter, mockProviderStatus } from './providers/mock-provider'
import { mockExpandLocation } from './providers/mock-world-provider'
import type { AIToolId, ProposalGenerator, ProviderStatus } from './types'
import type { Character } from '@/types/character'
import type { Location } from '@/types/world'

/**
 * Chooses the active AI provider.
 *
 * Phase 3 ships mock mode only. The registry exists now so that phase 8 adds a
 * provider here and nothing in the character, world or story features changes:
 * they already talk to these generator signatures rather than to a vendor SDK.
 *
 * Note what is absent: any API key. Keys belong on the server that proxies the
 * request. `VITE_AI_PROXY_URL` is only the address of that server, which is
 * safe to ship in the bundle -- an actual key never is.
 */
export function getProviderStatus(): ProviderStatus {
  // Phase 8 will branch here on the configured proxy URL.
  return mockProviderStatus
}

/** Back-compat alias used by the panel. */
export function getProvider(): { status: ProviderStatus } {
  return { status: getProviderStatus() }
}

export const expandCharacter: ProposalGenerator<Character> = mockExpandCharacter
export const expandLocation: ProposalGenerator<Location> = mockExpandLocation

/** Whether the active provider can genuinely perform a tool. */
export function supportsTool(tool: AIToolId): boolean {
  return getProviderStatus().supports.includes(tool)
}

/** True when running without a configured provider. Drives the mock-mode badge. */
export function isMockMode(): boolean {
  return !getProviderStatus().configured
}
