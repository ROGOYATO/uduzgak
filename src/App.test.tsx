import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { App } from './App'
import { createProject } from './domain/project'
import { createTask } from './domain/task'
import { createDefaultViewPreferences } from './domain/view-preferences'

describe('App', () => {
  it('renders the empty workspace screen', () => {
    const html = renderToStaticMarkup(<App />)

    expect(html).toContain('uduzgak')
    expect(html).toContain('No projects yet.')
  })

  it('renders projects and their tasks from supplied state', () => {
    const project = createProject({
      id: 'project-1',
      name: 'Robotics Research',
      now: '2026-09-03T00:00:00.000Z',
    })
    const task = createTask({
      id: 'task-1',
      projectId: project.id,
      title: 'Draft experiment plan',
      now: '2026-09-03T00:05:00.000Z',
    })

    const html = renderToStaticMarkup(
      <App state={{ projects: [project], tasks: [task] }} />,
    )

    expect(html).toContain('Robotics Research')
    expect(html).toContain('Draft experiment plan')
  })

  it('shows the logical critical path and slack only for scheduled Gantt tasks', () => {
    const now = '2026-10-17T00:00:00.000Z'
    const project = createProject({ id: 'project-1', name: 'Demo', now })
    const scheduled = (id: string, title: string, startDate: string, dueDate: string) => ({
      ...createTask({ id, projectId: project.id, title, now }),
      startDate,
      dueDate,
    })
    const tasks = [
      scheduled('task-a', 'Alpha', '2026-10-19', '2026-10-20'),
      scheduled('task-b', 'Beta', '2026-10-21', '2026-10-23'),
      scheduled('task-c', 'Side task', '2026-10-21', '2026-10-21'),
      createTask({ id: 'task-u', projectId: project.id, title: 'Unscheduled', now }),
    ]
    const state = {
      projects: [project],
      tasks,
      relationships: [
        { id: 'r1', type: 'blocks' as const, sourceTaskId: 'task-a', targetTaskId: 'task-b', createdAt: now },
        { id: 'r2', type: 'blocks' as const, sourceTaskId: 'task-a', targetTaskId: 'task-c', createdAt: now },
      ],
    }
    const gantt = renderToStaticMarkup(
      <App
        state={state}
        initialViewPreferences={{ ...createDefaultViewPreferences(), viewMode: 'gantt' }}
      />,
    )

    expect(gantt).toContain('Logical critical path: 5 days')
    expect(gantt).toContain('Critical path status for Alpha">Critical (0 days slack)')
    expect(gantt).toContain('Critical path status for Beta">Critical (0 days slack)')
    expect(gantt).toContain('Critical path status for Side task">Not critical (2 days slack)')
    expect(gantt).not.toContain('Critical path status for Unscheduled')

    const list = renderToStaticMarkup(<App state={state} />)
    expect(list).not.toContain('Logical critical path:')
  })
})
