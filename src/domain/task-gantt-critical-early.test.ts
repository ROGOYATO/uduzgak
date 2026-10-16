import { describe, expect, it } from 'vitest'
import { createTaskGanttEarliestOffsets } from './task-gantt'
import { createTask, type Task } from './task'

function task(id: string, startDate?: string, dueDate?: string, isMilestone = false): Task {
  const base = createTask({ id, projectId: 'p-1', title: id, now: '2026-10-16T08:00:00.000Z' })
  return { ...base, ...(startDate ? { startDate } : {}), ...(dueDate ? { dueDate } : {}), ...(isMilestone ? { isMilestone: true } : {}) }
}

import type { TaskRelationship } from './task-relationship'

function blocks(id: string, sourceTaskId: string, targetTaskId: string): TaskRelationship {
  return { id, type: 'blocks', sourceTaskId, targetTaskId, createdAt: '2026-10-16T08:00:00.000Z' }
}

describe('Gantt earliest logical offsets', () => {
  it('propagates finish-to-start precedence and preserves input projection order', () => {
    const tasks = [task('b', '2026-10-19', '2026-10-21'), task('d', '2026-10-19', '2026-10-20'), task('a', '2026-10-19', '2026-10-20'), task('c', '2026-10-22', '2026-10-22')]
    expect(createTaskGanttEarliestOffsets(tasks, [blocks('r1', 'a', 'b'), blocks('r2', 'b', 'c')])).toEqual([
      { taskId: 'b', earliestStart: 2, earliestFinish: 5 },
      { taskId: 'd', earliestStart: 0, earliestFinish: 2 },
      { taskId: 'a', earliestStart: 0, earliestFinish: 2 },
      { taskId: 'c', earliestStart: 5, earliestFinish: 6 },
    ])
  })
})
