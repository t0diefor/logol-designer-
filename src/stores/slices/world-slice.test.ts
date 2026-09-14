import { beforeEach, describe, expect, it } from 'vitest'
import { useWorkspaceStore } from '../workspace-store'
import { EMPTY_WORKSPACE } from './types'

const store = () => useWorkspaceStore.getState()

function reset() {
  useWorkspaceStore.setState({
    ...EMPTY_WORKSPACE,
    currentProjectId: null,
    currentComicId: null,
  })
}

describe('world slice', () => {
  beforeEach(reset)

  describe('locations', () => {
    it('spreads new locations so they never stack on the map', () => {
      const a = store().createLocation('p1', 'Harbour')
      const b = store().createLocation('p1', 'Old Town')
      const c = store().createLocation('p1', 'The Shelf')

      const positions = [a, b, c].map((l) => `${l.mapX},${l.mapY}`)
      expect(new Set(positions).size).toBe(3)
    })

    it('orphans children rather than deleting them', () => {
      const city = store().createLocation('p1', 'Vell')
      const district = store().createLocation('p1', 'Harbour')
      store().updateLocation(district.id, { parentLocationId: city.id })

      store().deleteLocation(city.id)

      // The district is still a real place the writer invented.
      const survivor = store().locations[district.id]
      expect(survivor).toBeDefined()
      expect(survivor!.parentLocationId).toBeNull()
    })

    it('clears references from factions and events when deleted', () => {
      const place = store().createLocation('p1', 'Vell')
      const faction = store().createFaction('p1', 'The Guild')
      const event = store().createWorldEvent('p1', 'The fire')

      store().updateFaction(faction.id, { homeLocationId: place.id })
      store().updateWorldEvent(event.id, { locationId: place.id })

      store().deleteLocation(place.id)

      expect(store().factions[faction.id]!.homeLocationId).toBeNull()
      expect(store().worldEvents[event.id]!.locationId).toBeNull()
      // But the faction and event themselves survive.
      expect(store().factions[faction.id]).toBeDefined()
      expect(store().worldEvents[event.id]).toBeDefined()
    })
  })

  describe('factions', () => {
    it('clears rivalries held by the other side on delete', () => {
      const a = store().createFaction('p1', 'The Guild')
      const b = store().createFaction('p1', 'The Ministry')

      store().updateFaction(a.id, { rivalFactionIds: [b.id] })
      store().updateFaction(b.id, { rivalFactionIds: [a.id] })

      store().deleteFaction(a.id)

      // A dangling rival id would render as a blank chip with no way to clear it.
      expect(store().factions[b.id]!.rivalFactionIds).toEqual([])
    })

    it('removes itself from events it was involved in', () => {
      const faction = store().createFaction('p1', 'The Guild')
      const event = store().createWorldEvent('p1', 'The fire')
      store().updateWorldEvent(event.id, { involvedFactionIds: [faction.id] })

      store().deleteFaction(faction.id)

      expect(store().worldEvents[event.id]!.involvedFactionIds).toEqual([])
    })
  })

  describe('timeline', () => {
    it('adds new events after everything else', () => {
      const first = store().createWorldEvent('p1', 'One')
      const second = store().createWorldEvent('p1', 'Two')
      // Adding an event must never reshuffle an order the user already set.
      expect(second.sortKey).toBeGreaterThan(first.sortKey)
    })

    it('swaps sort keys when moving an event earlier', () => {
      const first = store().createWorldEvent('p1', 'One')
      const second = store().createWorldEvent('p1', 'Two')

      store().moveWorldEvent(second.id, 'earlier')

      expect(store().worldEvents[second.id]!.sortKey).toBe(first.sortKey)
      expect(store().worldEvents[first.id]!.sortKey).toBe(second.sortKey)
    })

    it('does nothing at the ends of the timeline', () => {
      const first = store().createWorldEvent('p1', 'One')
      store().createWorldEvent('p1', 'Two')

      const before = store().worldEvents[first.id]!.sortKey
      store().moveWorldEvent(first.id, 'earlier')
      expect(store().worldEvents[first.id]!.sortKey).toBe(before)
    })

    it('only reorders within the same project', () => {
      const mine = store().createWorldEvent('p1', 'Mine')
      const theirs = store().createWorldEvent('p2', 'Theirs')

      const before = store().worldEvents[theirs.id]!.sortKey
      store().moveWorldEvent(mine.id, 'earlier')
      expect(store().worldEvents[theirs.id]!.sortKey).toBe(before)
    })
  })

  describe('cross-entity integrity', () => {
    it('detaches a deleted character from events and objects', () => {
      const character = store().createCharacter('p1', 'Mira')
      const event = store().createWorldEvent('p1', 'The fire')
      const object = store().createWorldObject('p1', 'The ledger')

      store().updateWorldEvent(event.id, { involvedCharacterIds: [character.id] })
      store().updateWorldObject(object.id, { holderCharacterId: character.id })

      store().deleteCharacter(character.id)

      expect(store().worldEvents[event.id]!.involvedCharacterIds).toEqual([])
      expect(store().worldObjects[object.id]!.holderCharacterId).toBeNull()
      // The event still happened; it just no longer links to a sheet.
      expect(store().worldEvents[event.id]).toBeDefined()
    })

    it('cascades every world collection when a project is deleted', () => {
      const project = store().createProject({ title: 'Doomed', logline: '', genre: '' })
      const other = store().createProject({ title: 'Safe', logline: '', genre: '' })

      store().createLocation(project.id, 'Vell')
      store().createFaction(project.id, 'Guild')
      store().createSystem(project.id, 'Tide-working')
      store().createWorldEvent(project.id, 'The fire')
      store().createWorldObject(project.id, 'Ledger')

      const survivor = store().createLocation(other.id, 'Elsewhere')

      store().deleteProject(project.id)

      expect(Object.keys(store().locations)).toEqual([survivor.id])
      expect(store().factions).toEqual({})
      expect(store().systems).toEqual({})
      expect(store().worldEvents).toEqual({})
      expect(store().worldObjects).toEqual({})
    })
  })
})
