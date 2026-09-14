import { newId, nowIso } from '@/lib/id'
import type {
  Faction,
  Location,
  WorldEvent,
  WorldObject,
  WorldSystem,
} from '@/types/world'
import type { WorldSlice, WorldSliceCreator } from './types'

/**
 * World entities: places, peoples, powers, history and objects.
 *
 * They are kept as five flat records rather than one nested "world" document
 * because they cross-reference each other constantly -- a faction has a home
 * location, an event involves both factions and characters -- and a nested
 * tree would force every reference to be a path rather than an id.
 */

/** New locations are laid out on a loose spiral so they never stack on the map. */
function nextMapPosition(existing: Location[]): { mapX: number; mapY: number } {
  const index = existing.length
  const angle = index * 2.399963 // golden angle, spreads points evenly
  const radius = 90 * Math.sqrt(index + 1)
  return {
    mapX: Math.round(500 + radius * Math.cos(angle)),
    mapY: Math.round(360 + radius * Math.sin(angle)),
  }
}

export const createWorldSlice: WorldSliceCreator<WorldSlice> = (set, get) => ({
  locations: {},
  factions: {},
  systems: {},
  worldEvents: {},
  worldObjects: {},

  createLocation: (projectId, name) => {
    const timestamp = nowIso()
    const siblings = Object.values(get().locations).filter((l) => l.projectId === projectId)
    const location: Location = {
      id: newId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      ownerId: null,
      projectId,
      name,
      kind: '',
      summary: '',
      description: '',
      atmosphere: '',
      parentLocationId: null,
      ...nextMapPosition(siblings),
      references: [],
      notes: [],
      tags: [],
    }
    set((state) => ({ locations: { ...state.locations, [location.id]: location } }))
    return location
  },

  updateLocation: (id, changes) =>
    set((state) => {
      const existing = state.locations[id]
      if (!existing) return state
      return {
        locations: {
          ...state.locations,
          [id]: { ...existing, ...changes, id, updatedAt: nowIso() },
        },
      }
    }),

  deleteLocation: (id) =>
    set((state) => {
      const locations = { ...state.locations }
      delete locations[id]

      /*
       * Detach rather than cascade. A district inside a deleted city is still
       * a real place the writer invented; orphaning it to the top level keeps
       * the work and lets them re-parent it. Deleting it would not.
       */
      for (const [locationId, location] of Object.entries(locations)) {
        if (location.parentLocationId !== id) continue
        locations[locationId] = { ...location, parentLocationId: null, updatedAt: nowIso() }
      }

      const factions = { ...state.factions }
      for (const [factionId, faction] of Object.entries(factions)) {
        if (faction.homeLocationId !== id) continue
        factions[factionId] = { ...faction, homeLocationId: null, updatedAt: nowIso() }
      }

      const worldEvents = { ...state.worldEvents }
      for (const [eventId, event] of Object.entries(worldEvents)) {
        if (event.locationId !== id) continue
        worldEvents[eventId] = { ...event, locationId: null, updatedAt: nowIso() }
      }

      return { locations, factions, worldEvents }
    }),

  createFaction: (projectId, name) => {
    const timestamp = nowIso()
    const faction: Faction = {
      id: newId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      ownerId: null,
      projectId,
      name,
      kind: '',
      goal: '',
      beliefs: '',
      structure: '',
      rivalFactionIds: [],
      homeLocationId: null,
      notes: [],
      tags: [],
    }
    set((state) => ({ factions: { ...state.factions, [faction.id]: faction } }))
    return faction
  },

  updateFaction: (id, changes) =>
    set((state) => {
      const existing = state.factions[id]
      if (!existing) return state
      return {
        factions: {
          ...state.factions,
          [id]: { ...existing, ...changes, id, updatedAt: nowIso() },
        },
      }
    }),

  deleteFaction: (id) =>
    set((state) => {
      const factions = { ...state.factions }
      delete factions[id]

      // Rivalries are mutual, so the other side has to be cleaned up too.
      for (const [factionId, faction] of Object.entries(factions)) {
        if (!faction.rivalFactionIds.includes(id)) continue
        factions[factionId] = {
          ...faction,
          rivalFactionIds: faction.rivalFactionIds.filter((rival) => rival !== id),
          updatedAt: nowIso(),
        }
      }

      const worldEvents = { ...state.worldEvents }
      for (const [eventId, event] of Object.entries(worldEvents)) {
        if (!event.involvedFactionIds.includes(id)) continue
        worldEvents[eventId] = {
          ...event,
          involvedFactionIds: event.involvedFactionIds.filter((factionId) => factionId !== id),
          updatedAt: nowIso(),
        }
      }

      return { factions, worldEvents }
    }),

  createSystem: (projectId, name) => {
    const timestamp = nowIso()
    const system: WorldSystem = {
      id: newId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      ownerId: null,
      projectId,
      name,
      category: 'other',
      summary: '',
      mechanics: '',
      limits: '',
      rules: [],
      notes: [],
      tags: [],
    }
    set((state) => ({ systems: { ...state.systems, [system.id]: system } }))
    return system
  },

  updateSystem: (id, changes) =>
    set((state) => {
      const existing = state.systems[id]
      if (!existing) return state
      return {
        systems: { ...state.systems, [id]: { ...existing, ...changes, id, updatedAt: nowIso() } },
      }
    }),

  deleteSystem: (id) =>
    set((state) => {
      const systems = { ...state.systems }
      delete systems[id]
      return { systems }
    }),

  createWorldEvent: (projectId, title) => {
    const timestamp = nowIso()
    const siblings = Object.values(get().worldEvents).filter((e) => e.projectId === projectId)
    // New events land after everything else, so adding one never reshuffles
    // a timeline the user has already ordered.
    const sortKey = siblings.reduce((max, event) => Math.max(max, event.sortKey), 0) + 10

    const event: WorldEvent = {
      id: newId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      ownerId: null,
      projectId,
      title,
      whenLabel: '',
      sortKey,
      summary: '',
      description: '',
      locationId: null,
      involvedFactionIds: [],
      involvedCharacterIds: [],
      significance: 'notable',
      tags: [],
    }
    set((state) => ({ worldEvents: { ...state.worldEvents, [event.id]: event } }))
    return event
  },

  updateWorldEvent: (id, changes) =>
    set((state) => {
      const existing = state.worldEvents[id]
      if (!existing) return state
      return {
        worldEvents: {
          ...state.worldEvents,
          [id]: { ...existing, ...changes, id, updatedAt: nowIso() },
        },
      }
    }),

  deleteWorldEvent: (id) =>
    set((state) => {
      const worldEvents = { ...state.worldEvents }
      delete worldEvents[id]
      return { worldEvents }
    }),

  /**
   * Moves an event one place earlier or later on the timeline by swapping
   * sort keys with its neighbour. Swapping rather than renumbering keeps the
   * change to two records, which matters for autosave size.
   */
  moveWorldEvent: (id, direction) =>
    set((state) => {
      const event = state.worldEvents[id]
      if (!event) return state

      const ordered = Object.values(state.worldEvents)
        .filter((candidate) => candidate.projectId === event.projectId)
        .sort((a, b) => a.sortKey - b.sortKey || a.createdAt.localeCompare(b.createdAt))

      const index = ordered.findIndex((candidate) => candidate.id === id)
      const neighbour = ordered[direction === 'earlier' ? index - 1 : index + 1]
      if (!neighbour) return state

      const timestamp = nowIso()
      return {
        worldEvents: {
          ...state.worldEvents,
          [event.id]: { ...event, sortKey: neighbour.sortKey, updatedAt: timestamp },
          [neighbour.id]: { ...neighbour, sortKey: event.sortKey, updatedAt: timestamp },
        },
      }
    }),

  createWorldObject: (projectId, name) => {
    const timestamp = nowIso()
    const object: WorldObject = {
      id: newId(),
      createdAt: timestamp,
      updatedAt: timestamp,
      ownerId: null,
      projectId,
      name,
      description: '',
      significance: '',
      holderCharacterId: null,
      references: [],
      tags: [],
    }
    set((state) => ({ worldObjects: { ...state.worldObjects, [object.id]: object } }))
    return object
  },

  updateWorldObject: (id, changes) =>
    set((state) => {
      const existing = state.worldObjects[id]
      if (!existing) return state
      return {
        worldObjects: {
          ...state.worldObjects,
          [id]: { ...existing, ...changes, id, updatedAt: nowIso() },
        },
      }
    }),

  deleteWorldObject: (id) =>
    set((state) => {
      const worldObjects = { ...state.worldObjects }
      delete worldObjects[id]
      return { worldObjects }
    }),
})
