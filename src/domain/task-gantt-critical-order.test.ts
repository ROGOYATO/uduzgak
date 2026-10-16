import { describe, expect, it } from 'vitest'
import { createTaskGanttCriticalOrder } from './task-gantt'
import { createTask, type Task } from './task'

function task(id: string, startDate?: string, dueDate?: string, isMilestone = false): Task {
  const base = createTask({ id, projectId: 'p-1', title: id, now: '2026-10-16T08:00:00.000Z' })
  return { ...base, ...(startDate ? { startDate } : {}), ...(dueDate ? { dueDate } : {}), ...(isMilestone ? { isMilestone: true } : {}) }
}

import type { TaskRelationship } from './task-relationship'

function blocks(id: string, sourceTaskId: string, targetTaskId: string): TaskRelationship {
  return { id, type: 'blocks', sourceTaskId, targetTaskId, createdAt: '2026-10-16T08:00:00.000Z' }
}

describe('Gantt dependency topological order', () => {
  it('respects blocking precedence, stable ties, and rejects dependency cycles', () => {
    const tasks = ['c', 'b', 'a', 'd'].map((id) => task(id, '2026-10-19', '2026-10-19'))
    const edges = [blocks('r1', 'a', 'c'), blocks('r2', 'b', 'c'), blocks('r3', 'c', 'd')]
    expect(createTaskGanttCriticalOrder(tasks, edges)).toEqual(['b', 'a', 'c', 'd'])
    expect(() => createTaskGanttCriticalOrder(tasks, [...edges, blocks('r4', 'd', 'a')])).toThrow('Gantt dependency cycle')
  })
})
