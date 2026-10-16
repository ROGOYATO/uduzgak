import { describe, expect, it } from 'vitest'
import { createTaskGanttCriticalGraph } from './task-gantt'
import { createTask, type Task } from './task'

function task(id: string, startDate?: string, dueDate?: string, isMilestone = false): Task {
  const base = createTask({ id, projectId: 'p-1', title: id, now: '2026-10-16T08:00:00.000Z' })
  return { ...base, ...(startDate ? { startDate } : {}), ...(dueDate ? { dueDate } : {}), ...(isMilestone ? { isMilestone: true } : {}) }
}

import type { TaskRelationship } from './task-relationship'

function blocks(id: string, sourceTaskId: string, targetTaskId: string): TaskRelationship {
  return { id, type: 'blocks', sourceTaskId, targetTaskId, createdAt: '2026-10-16T08:00:00.000Z' }
}

describe('Gantt critical-path graph projection', () => {
  it('keeps scheduled input Tasks and only unique in-scope blocking edges', () => {
    const tasks = [task('a', '2026-10-19', '2026-10-20'), task('b', '2026-10-19'), task('c', '2026-10-21', '2026-10-21')]
    const unrelated: TaskRelationship = { ...blocks('r4', 'a', 'c'), type: 'related' }
    const edges = [blocks('r1', 'a', 'c'), blocks('r2', 'a', 'b'), blocks('r3', 'a', 'c'), unrelated, blocks('r5', 'c', 'missing')]
    const before = JSON.stringify({ tasks, edges })
    expect(createTaskGanttCriticalGraph(tasks, edges)).toEqual({
      nodes: [{ taskId: 'a', durationDays: 2, isMilestone: false }, { taskId: 'c', durationDays: 1, isMilestone: false }],
      edges: [{ sourceTaskId: 'a', targetTaskId: 'c' }],
    })
    expect(JSON.stringify({ tasks, edges })).toBe(before)
  })
})
