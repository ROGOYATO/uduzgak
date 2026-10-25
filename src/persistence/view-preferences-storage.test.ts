import { describe, expect, it } from 'vitest'

import {
  createDefaultViewPreferences,
  getTaskViewMode,
  type ViewPreferences,
} from '../domain/view-preferences'
import type { KeyValueStore } from './workspace-storage'
import {
  loadViewPreferences,
  saveViewPreferences,
} from './view-preferences-storage'

class MemoryStore implements KeyValueStore {
  private readonly values = new Map<string, string>()

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

describe('view preference storage', () => {
  it('returns defaults when no preferences have been saved', () => {
    expect(loadViewPreferences(new MemoryStore())).toEqual(
      createDefaultViewPreferences(),
    )
  })

  it('round-trips preferences through a separate versioned document', () => {
    const storage = new MemoryStore()
    const preferences: ViewPreferences = {
      projectView: 'project-2',
      query: 'calibration',
      status: 'doing',
      priority: 'high',
      dueDate: 'withDueDate',
      sort: 'priority',
    }

    saveViewPreferences(storage, preferences)

    expect(loadViewPreferences(storage)).toEqual(preferences)
    expect(storage.getItem('workspace-app.workspace')).toBeNull()
  })
})


it('falls back to defaults for malformed preference JSON', () => {
  const storage: KeyValueStore = {
    getItem: () => '{not-json',
    setItem: () => undefined,
  }

  expect(loadViewPreferences(storage)).toEqual(createDefaultViewPreferences())
})

it('falls back to defaults for an unsupported preference version', () => {
  const storage: KeyValueStore = {
    getItem: () =>
      JSON.stringify({
        version: 2,
        preferences: {
          ...createDefaultViewPreferences(),
          projectView: 'project-2',
        },
      }),
    setItem: () => undefined,
  }

  expect(loadViewPreferences(storage)).toEqual(createDefaultViewPreferences())
})

it('falls back to defaults for invalid preference values', () => {
  const storage: KeyValueStore = {
    getItem: () =>
      JSON.stringify({
        version: 1,
        preferences: {
          ...createDefaultViewPreferences(),
          status: 'blocked',
        },
      }),
    setItem: () => undefined,
  }

  expect(loadViewPreferences(storage)).toEqual(createDefaultViewPreferences())
})


it('falls back to defaults when preference storage cannot be read', () => {
  const storage: KeyValueStore = {
    getItem: () => {
      throw new Error('Preference read failed')
    },
    setItem: () => undefined,
  }

  expect(loadViewPreferences(storage)).toEqual(createDefaultViewPreferences())
})


it('round-trips the manual task sort preference', () => {
  const storage = new MemoryStore()
  const preferences = {
    ...createDefaultViewPreferences(),
    sort: 'manual' as never,
  }

  saveViewPreferences(storage, preferences)

  expect(loadViewPreferences(storage).sort).toBe('manual')
})


describe('view-mode persistence compatibility', () => {
  it('round-trips Board and Calendar, retains legacy List, and rejects invalid modes', () => {
    for (const mode of ['board', 'calendar'] as const) {
      const storage = new MemoryStore()
      const preferences = { ...createDefaultViewPreferences(), projectView: 'project-2', viewMode: mode }
      saveViewPreferences(storage, preferences)
      expect(loadViewPreferences(storage)).toEqual(preferences)
    }

    const legacyStorage = new MemoryStore()
    legacyStorage.setItem('workspace-app.view-preferences', JSON.stringify({
      version: 1,
      preferences: { ...createDefaultViewPreferences(), projectView: 'project-legacy', sort: 'title' },
    }))
    const legacy = loadViewPreferences(legacyStorage)
    expect(legacy.projectView).toBe('project-legacy')
    expect(legacy.sort).toBe('title')
    expect(getTaskViewMode(legacy)).toBe('list')

    const invalidStorage = new MemoryStore()
    invalidStorage.setItem('workspace-app.view-preferences', JSON.stringify({
      version: 1,
      preferences: { ...createDefaultViewPreferences(), viewMode: 'matrix' },
    }))
    expect(loadViewPreferences(invalidStorage)).toEqual(createDefaultViewPreferences())
  })
})


it('persists only a valid optional Gantt workweek preset and rejects corrupted saved values', () => {
  const storage = new MemoryStore()
  const defaults = createDefaultViewPreferences()
  saveViewPreferences(storage, { ...defaults, ganttWorkingWeek: 'sun-thu' })
  expect(loadViewPreferences(storage)).toMatchObject({ ganttWorkingWeek: 'sun-thu' })
  saveViewPreferences(storage, { ...defaults, ganttWorkingWeek: 'friday-only' } as ViewPreferences)
  expect(loadViewPreferences(storage)).toEqual(defaults)
  saveViewPreferences(storage, defaults)
  expect(loadViewPreferences(storage)).toEqual(defaults)
})


it('round-trips canonical Gantt excluded dates and rejects malformed or duplicate dates', () => {
  const storage = new MemoryStore()
  const defaults = createDefaultViewPreferences()
  const valid = { ...defaults, ganttNonWorkingDates: ['2026-10-19', '2026-10-22'] }
  saveViewPreferences(storage, valid)
  expect(loadViewPreferences(storage)).toEqual(valid)
  for (const invalid of [['2026-10-19', '2026-10-19'], ['2026-02-30'], ['2026-10-22', '2026-10-19']]) {
    saveViewPreferences(storage, { ...defaults, ganttNonWorkingDates: invalid })
    expect(loadViewPreferences(storage)).toEqual(defaults)
  }
  saveViewPreferences(storage, { ...defaults, ganttNonWorkingDates: [] })
  expect(loadViewPreferences(storage)).toEqual({ ...defaults, ganttNonWorkingDates: [] })
})
