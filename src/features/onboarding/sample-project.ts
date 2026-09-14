import { newId } from '@/lib/id'
import type { WorkspaceState } from '@/stores/slices/types'

/**
 * A worked example project.
 *
 * Reason it exists: an empty app is impossible to evaluate. Every screen shows
 * its empty state, so nothing demonstrates what a populated character sheet,
 * timeline or script actually looks like. This fills one project with enough
 * real content to explore, and every screen it touches becomes reachable.
 *
 * It is plainly labelled as a sample, it is created through the same store
 * actions a user's own work uses (so nothing about it is special-cased), and
 * removing it is an ordinary project delete.
 */

export const SAMPLE_PROJECT_TITLE = 'The Lantern Wars (sample)'

/** True when the sample is already loaded, so it is never duplicated. */
export function hasSampleProject(state: WorkspaceState): boolean {
  return Object.values(state.projects).some((project) => project.title === SAMPLE_PROJECT_TITLE)
}

/**
 * Takes a *getter* rather than a state snapshot.
 *
 * A snapshot captured at call time never sees the records written during this
 * function, so reading back a scene to fill in its beats would silently find
 * the version from before the scene existed. Every read here must go through
 * the getter to see the writes above it.
 */
export function loadSampleProject(getState: () => WorkspaceState): string {
  const store = getState()

  const project = store.createProject({
    title: SAMPLE_PROJECT_TITLE,
    logline: "A lamplighter discovers the city's lights are keeping something asleep.",
    genre: 'Gothic fantasy',
  })

  store.updateProject(project.id, {
    status: 'drafting',
    description:
      'Sample content, loaded so the app can be explored with something in it. Delete this project whenever you like — it is an ordinary project with nothing special about it.',
    palette: { name: 'Lamplight', colors: ['#C9A227', '#2E2740', '#8E4A2F', '#EDE6D6'] },
    tags: ['sample'],
  })

  /* ---------------- Characters ---------------- */

  const mira = store.createCharacter(project.id, 'Mira Halloway')
  store.updateCharacter(mira.id, {
    role: 'Protagonist',
    pronouns: 'she/her',
    ageRange: 'Late twenties',
    appearance: {
      hair: 'Shoulder-length, dark auburn, tied back with a length of lamp cord. Escapes constantly.',
      eyes: 'Deep brown, set close. Narrows before she speaks rather than after.',
      skinTone: 'Warm brown, weathered across the nose and forearms from working outdoors at night.',
      bodyType: 'Lean and wiry, built for climbing ladders rather than fighting.',
      height: 'Slightly below average',
      distinguishingMarks: 'Burn scar across the left palm, from a lamp she should not have touched.',
      general: 'Moves like someone used to being up high and unobserved.',
    },
    personality: ['stubborn', 'watchful', 'dryly funny', 'slow to trust'],
    goals: 'Wants to know why the lamps are lit, and cannot say out loud why that matters so much.',
    weaknesses: 'Cannot walk away from an unfinished argument. It has cost her two friendships already.',
    powers: 'None. She can climb anything in the city and knows every roofline by touch.',
    dialogueStyle: 'Short sentences. Answers questions with questions. Says "fine" when it is not.',
    backstory:
      'Third generation on the lamps. Her grandmother stopped lighting them one winter and was never spoken of again.',
    palette: { name: 'Mira', colors: ['#8E4A2F', '#2E2740', '#EDE6D6'] },
    tags: ['lead', 'lamplighter'],
    outfits: [
      {
        id: newId(),
        name: 'Working nights',
        description: 'Heavy canvas coat over a patched jumper. Boots worn through at the heel.',
        accessories: 'Brass lighting pole, tinderbox, a ledger she should not have.',
        palette: { name: '', colors: ['#3A3226', '#8E4A2F'] },
        references: [],
        isDefault: true,
      },
      {
        id: newId(),
        name: 'Ministry summons',
        description: 'Borrowed grey coat that does not fit. She keeps checking the cuffs.',
        accessories: 'Nothing. They take the pole at the door.',
        palette: { name: '', colors: ['#6E6A5E'] },
        references: [],
        isDefault: false,
      },
    ],
    expressions: [
      { id: newId(), name: 'Neutral', description: 'Jaw set, eyes up, reading the roofline.', reference: null },
      { id: newId(), name: 'Caught out', description: 'Very still. One hand flat against her coat.', reference: null },
      { id: newId(), name: 'Furious', description: 'Quieter, not louder. Looks slightly past you.', reference: null },
    ],
  })

  const elias = store.createCharacter(project.id, 'Elias Warde')
  store.updateCharacter(elias.id, {
    role: 'Antagonist',
    pronouns: 'he/him',
    ageRange: 'Sixties',
    appearance: {
      hair: 'Close-cropped and grey, cut by his own hand rather than a barber.',
      eyes: 'Pale grey and slow-blinking, which people mistake for calm.',
      skinTone: 'Fair and quick to flush, which gives away every lie he tells.',
      bodyType: 'Broad through the shoulders and slightly stooped, as though ducking a low doorway.',
      height: 'Tall',
      distinguishingMarks: 'Ink stains worked permanently into the first two fingers of his writing hand.',
      general: '',
    },
    personality: ['meticulous', 'guarded', 'unexpectedly sentimental'],
    goals: 'Wants Mira to keep believing the lights matter, for reasons he will not state.',
    weaknesses: 'Trusts competence over character, and is repeatedly taken in by people good at their jobs.',
    dialogueStyle: 'Formal, slightly archaic. Never uses contractions when he is angry.',
    tags: ['ministry'],
    relationships: [
      {
        id: newId(),
        targetCharacterId: mira.id,
        targetName: '',
        kind: 'Former mentor',
        description:
          'He taught her the trade, then testified against her grandmother. Neither has said so out loud.',
      },
    ],
  })

  /* ---------------- World ---------------- */

  const harbour = store.createLocation(project.id, 'Vell Harbour')
  store.updateLocation(harbour.id, {
    kind: 'Working district',
    summary: 'A district that keeps the rest of the city fed, and resents being reminded of it.',
    description:
      'Narrow streets that flood twice a year, so every ground floor is storage and every family lives above it. The stonework is older than the records describing it.',
    atmosphere: 'Wet rope and coal smoke. Constant low noise from machinery somewhere below, never visible.',
    tags: ['starting-location'],
  })

  const oldTown = store.createLocation(project.id, 'Old Town')
  store.updateLocation(oldTown.id, {
    kind: 'District',
    summary: 'Where the first lamps were lit, and where nobody will build.',
    parentLocationId: harbour.id,
    atmosphere: 'Too bright. The lights are never switched off and residents have stopped mentioning it.',
  })

  store.updateLocation(store.createLocation(project.id, 'The Shelf').id, {
    kind: 'Wilderness',
    summary: 'The last inhabited place before the map stops being reliable.',
    atmosphere: 'Very quiet, and the quiet is maintained rather than natural.',
  })

  const guild = store.createFaction(project.id, 'The Lamplighters Guild')
  store.updateFaction(guild.id, {
    kind: 'Trade guild',
    goal: 'Keep every lamp in the city burning, and keep anyone from asking why.',
    beliefs: 'That the work is a service. Most of them have never been told what it is a service against.',
    structure: 'Apprentice, lighter, warden. Wardens hold the keys and the ledger.',
    homeLocationId: harbour.id,
  })

  const ministry = store.createFaction(project.id, 'The Ministry of Nights')
  store.updateFaction(ministry.id, {
    kind: 'Government department',
    goal: 'Maintain the arrangement, and ensure nobody discovers there is one.',
    beliefs: 'That the truth would cost more lives than the lie does.',
    structure: 'Opaque by design. Elias is the only name most people know.',
    homeLocationId: oldTown.id,
  })

  // Rivalry is mutual, so it is written to both sides, exactly as the UI does.
  store.updateFaction(guild.id, { rivalFactionIds: [ministry.id] })
  store.updateFaction(ministry.id, { rivalFactionIds: [guild.id] })

  store.updateSystem(store.createSystem(project.id, 'Lamplight').id, {
    category: 'magic',
    summary: 'The lamps do not produce light. They hold something down.',
    mechanics:
      'Each lamp is bound to a fixed point. Lit, it holds. Unlit, it does not. Nobody alive knows how the binding was made.',
    limits: 'A lamp that goes out cannot simply be relit. The binding has to be remade, and that costs a life.',
    rules: [
      'Nothing is created. Every light is taken from somewhere.',
      'A lamp remembers who lit it.',
      'The Ministry keeps a count. The Guild is not shown it.',
    ],
  })

  store.updateWorldEvent(store.createWorldEvent(project.id, 'The Lighting').id, {
    whenLabel: 'Third Age, year 412',
    significance: 'world-changing',
    summary: 'The first lamps are lit across Vell in a single night.',
    description:
      'Four hundred years later nobody can say who gave the order, and the records begin the following morning.',
    locationId: oldTown.id,
    involvedFactionIds: [guild.id, ministry.id],
  })

  store.updateWorldEvent(store.createWorldEvent(project.id, 'The First Dark Night').id, {
    whenLabel: 'Third Age, year 786',
    significance: 'major',
    summary: 'Nine lamps go out in the harbour. Six lighters do not come home.',
    locationId: harbour.id,
    involvedFactionIds: [guild.id],
    involvedCharacterIds: [elias.id],
  })

  store.updateWorldObject(store.createWorldObject(project.id, 'The Warden’s Ledger').id, {
    description: 'A water-stained book of lamp numbers and dates, bound in oilcloth.',
    significance:
      'It records which lamps have gone out, and the Ministry has been editing it for two hundred years.',
    holderCharacterId: mira.id,
  })

  /* ---------------- Story ---------------- */

  const story = store.createStory(project.id, 'Episode one: The Ledger')
  store.updateStory(story.id, {
    logline: 'Mira takes a ledger she was not meant to see, and asks the one person who cannot answer.',
    theme: 'What we agree not to look at.',
    premise:
      'The city has burned its lamps every night for four hundred years and nobody remembers why. Mira is the first lamplighter in a generation to ask out loud.',
    outline:
      'Cold open on the lighting round. Mira finds the ledger. She takes it to Elias, who lies. She realises he is lying and says nothing. Ends with her not lighting a lamp.',
  })

  const sceneOne = store.createScene(story.id, 'The round')
  store.updateScene(sceneOne.id, {
    slug: 'EXT. HARBOUR ROOFLINE — NIGHT',
    locationId: harbour.id,
    summary: 'Mira works her round. The ninth lamp is already out, and the ledger says it never existed.',
    goal: 'Mira wants to finish the round without incident, as she has every night for nine years.',
    conflict: 'The ninth lamp is cold, and the ledger in her coat says there is no ninth lamp.',
    outcome: 'She keeps the ledger instead of reporting it.',
    status: 'drafted',
    tags: ['opening'],
    characterObjectives: { [mira.id]: 'Get to the end of the street without having to decide anything.' },
  })

  store.addBeat(sceneOne.id, 'Mira lights seven lamps, fast, in silence.')
  store.addBeat(sceneOne.id, 'The eighth is warm. The ninth is cold and has no number.')
  store.addBeat(sceneOne.id, 'She checks the ledger. The page has been cut out.')
  store.addBeat(sceneOne.id, 'She puts the ledger back in her coat and walks on.')

  const beats = getState().scenes[sceneOne.id]?.beats ?? []
  if (beats[1]) store.updateBeat(sceneOne.id, beats[1].id, { change: 'The round stops being routine.' })
  if (beats[2]) store.updateBeat(sceneOne.id, beats[2].id, { change: 'It stops being an accident.' })
  if (beats[3]) store.updateBeat(sceneOne.id, beats[3].id, { change: 'She becomes complicit.' })

  store.addLine(sceneOne.id, 'caption')
  store.addLine(sceneOne.id, 'sfx')
  store.addLine(sceneOne.id, 'dialogue', mira.id)

  const lines = getState().scenes[sceneOne.id]?.lines ?? []
  if (lines[0]) {
    store.updateLine(sceneOne.id, lines[0].id, { text: 'Four hundred years, and not one dark night.' })
  }
  if (lines[1]) store.updateLine(sceneOne.id, lines[1].id, { text: 'TSSK' })
  if (lines[2]) {
    store.updateLine(sceneOne.id, lines[2].id, {
      parenthetical: '(to herself)',
      // Deliberately padded, so the Tighten tool has something to do.
      text: 'That is basically just not possible, in order for the count to work.',
    })
  }

  const sceneTwo = store.createScene(story.id, 'The office')
  store.updateScene(sceneTwo.id, {
    slug: 'INT. HARBOUR OFFICE — LATER',
    locationId: harbour.id,
    summary: 'Mira asks Elias about the missing page. He lies, and she already knew he would.',
    goal: 'Mira wants Elias to admit the page was cut out.',
    conflict: 'Elias needs her to keep believing the lamps are simply lamps.',
    outcome: 'She stops trusting him and says nothing about it.',
    status: 'outlined',
    characterObjectives: {
      [mira.id]: 'Make him say it first.',
      [elias.id]: 'Find out how much she has already read.',
    },
  })

  store.addBeat(sceneTwo.id, 'Elias offers tea. Mira does not sit down.')
  store.addBeat(sceneTwo.id, 'She asks about lamp nine. He answers a different question.')
  store.addBeat(sceneTwo.id, 'She lets it go, out loud.')

  store.updateScene(store.createScene(story.id, 'The lamp she does not light').id, {
    slug: 'EXT. HARBOUR ROOFLINE — NIGHT',
    locationId: harbour.id,
    summary: 'The last beat of the episode. She stands at lamp nine with the pole lit and does nothing.',
    status: 'idea',
  })

  return project.id
}
