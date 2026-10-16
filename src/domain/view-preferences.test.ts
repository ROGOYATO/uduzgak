import { describe, expect, it } from 'vitest'

import {
  createDefaultViewPreferences,
  getTaskViewMode,
  isTaskViewMode,
  updateViewPreferences,
} from './view-preferences'

describe('view preferences', () => {
  it('creates the default workspace view', () => {
    expect(createDefaultViewPreferences()).toEqual({
      projectView: 'all',
      query: '',
      status: 'all',
      priority: 'all',
      dueDate: 'all',
      sort: 'created',
    })
  })

  it('updates selected preferences without mutating the previous value', () => {
    const current = createDefaultViewPreferences()
    const next = updateViewPreferences(current, {
      projectView: 'project-2',
      status: 'done',
      sort: 'priority',
    })

    expect(next).toEqual({
      ...current,
      projectView: 'project-2',
      status: 'done',
      sort: 'priority',
    })
    expect(current).toEqual(createDefaultViewPreferences())
  })
  it('accepts each Task layout, rejects unsupported modes, and preserves the original preferences', () => {
    const current = createDefaultViewPreferences()
    expect(getTaskViewMode(current)).toBe('list')
    expect(isTaskViewMode('matrix')).toBe(false)

    for (const mode of ['list', 'board', 'calendar', 'table', 'timeline', 'gantt'] as const) {
      expect(isTaskViewMode(mode)).toBe(true)
      const next = updateViewPreferences(current, { viewMode: mode })
      expect(getTaskViewMode(next)).toBe(mode)
    }

    expect(current).toEqual(createDefaultViewPreferences())
  })

})
