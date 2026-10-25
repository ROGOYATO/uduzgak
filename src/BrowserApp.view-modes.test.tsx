/** @vitest-environment jsdom */

import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { BrowserApp } from './BrowserApp'
import { createProject } from './domain/project'
import { createTask } from './domain/task'
import { getTaskViewMode, type TaskViewMode } from './domain/view-preferences'
import { loadViewPreferences } from './persistence/view-preferences-storage'
import { loadWorkspace, saveWorkspace, type KeyValueStore } from './persistence/workspace-storage'

class MemoryStore implements KeyValueStore {
  private readonly values = new Map<string, string>()

  getItem(key: string) { return this.values.get(key) ?? null }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

describe('BrowserApp view persistence', () => {
  it('persists every Task view without changing workspace data', async () => {
    const user = userEvent.setup()
    const storage = new MemoryStore()
    const project = createProject({ id: 'p-1', name: 'Research', now: '2026-10-16T10:00:00.000Z' })
    const task = createTask({ id: 't-1', projectId: project.id, title: 'Protocol', now: '2026-10-16T10:01:00.000Z' })
    const workspace = { projects: [project], tasks: [task] }
    saveWorkspace(storage, workspace)

    render(<BrowserApp storage={storage} runtime={{ nextId: () => 'unused-id', now: () => '2026-10-16T10:02:00.000Z' }} />)

    const modes: TaskViewMode[] = ['board', 'calendar', 'table', 'timeline', 'gantt']
    for (const mode of modes) {
      await user.selectOptions(screen.getByLabelText('Task view'), mode)
      expect(getTaskViewMode(loadViewPreferences(storage))).toBe(mode)
      expect(loadWorkspace(storage)).toEqual(workspace)
    }
  })
})


it('persists the Gantt workweek preset across BrowserApp reloads without editing Workspace', async () => {
  const user = userEvent.setup()
  const storage = new MemoryStore()
  const project = createProject({ id: 'saved-workweek-project', name: 'Workweek', now: '2026-10-16T10:00:00.000Z' })
  const workspace = { projects: [project], tasks: [] }
  saveWorkspace(storage, workspace)
  const runtime = { nextId: () => 'unexpected-id', now: () => '2026-10-16T10:01:00.000Z' }
  const first = render(<BrowserApp storage={storage} runtime={runtime} />)
  await user.selectOptions(screen.getByLabelText('Task view'), 'gantt')
  await user.click(screen.getByRole('button', { name: 'Show Gantt working-day analysis' }))
  await user.click(screen.getByRole('button', { name: 'Use Sunday-Thursday Gantt workweek' }))
  expect(loadViewPreferences(storage)).toMatchObject({ ganttWorkingWeek: 'sun-thu' })
  first.unmount()
  render(<BrowserApp storage={storage} runtime={runtime} />)
  await user.click(screen.getByRole('button', { name: 'Show Gantt working-day analysis' }))
  expect(screen.getByRole('button', { name: 'Use Sunday-Thursday Gantt workweek' }).getAttribute('aria-pressed')).toBe('true')
  expect(loadWorkspace(storage)).toEqual(workspace)
})


it('persists Gantt excluded dates across reloads and clears only removed entries', async () => {
  const user = userEvent.setup()
  const storage = new MemoryStore()
  const project = createProject({ id: 'saved-holiday-project', name: 'Holiday', now: '2026-10-16T10:00:00.000Z' })
  const workspace = { projects: [project], tasks: [] }
  saveWorkspace(storage, workspace)
  const runtime = { nextId: () => 'unexpected-id', now: () => '2026-10-16T10:01:00.000Z' }
  const first = render(<BrowserApp storage={storage} runtime={runtime} />)
  await user.selectOptions(screen.getByLabelText('Task view'), 'gantt')
  await user.click(screen.getByRole('button', { name: 'Show Gantt working-day analysis' }))
  fireEvent.change(screen.getByLabelText('Gantt non-working date'), { target: { value: '2026-10-19' } })
  await user.click(screen.getByRole('button', { name: 'Add Gantt non-working date' }))
  expect(loadViewPreferences(storage)).toMatchObject({ ganttNonWorkingDates: ['2026-10-19'] })
  first.unmount()
  render(<BrowserApp storage={storage} runtime={runtime} />)
  await user.click(screen.getByRole('button', { name: 'Show Gantt working-day analysis' }))
  await user.click(screen.getByRole('button', { name: 'Remove Gantt non-working date 2026-10-19' }))
  expect(loadViewPreferences(storage)).toMatchObject({ ganttNonWorkingDates: [] })
  expect(loadWorkspace(storage)).toEqual(workspace)
})
