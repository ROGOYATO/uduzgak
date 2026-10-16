import { describe, expect, it } from 'vitest'
import { createTaskGanttCriticalPath } from './task-gantt'
import { createTask, type Task } from './task'

function task(id: string, startDate?: string, dueDate?: string, isMilestone = false): Task {
  const base = createTask({ id, projectId: 'p-1', title: id, now: '2026-10-16T08:00:00.000Z' })
  return { ...base, ...(startDate ? { startDate } : {}), ...(dueDate ? { dueDate } : {}), ...(isMilestone ? { isMilestone: true } : {}) }
}

import type { TaskRelationship } from './task-relationship'

function blocks(id: string, sourceTaskId: string, targetTaskId: string): TaskRelationship {
  return { id, type: 'blocks', sourceTaskId, targetTaskId, createdAt: '2026-10-16T08:00:00.000Z' }
}

describe('Gantt critical-path slack calculation', () => {
  it('computes backward slack, milestone criticality, and immutable input-order rows', () => {
    const tasks = [task('c', '2026-10-20', '2026-10-20'), task('a', '2026-10-19', '2026-10-20'), task('m', '2026-10-23', '2026-10-23', true), task('d', '2026-10-21', '2026-10-21'), task('b', '2026-10-21', '2026-10-23')]
    const edges = [blocks('r1', 'a', 'b'), blocks('r2', 'a', 'c'), blocks('r3', 'c', 'd'), blocks('r4', 'b', 'm')]
    const before = JSON.stringify({ tasks, edges })
    const path = createTaskGanttCriticalPath(tasks, edges)
    expect(path.durationDays).toBe(5)
    expect(path.criticalTaskIds).toEqual(['a', 'm', 'b'])
    expect(path.rows.map(({ taskId, slackDays, isCritical, isMilestone }) => ({ taskId, slackDays, isCritical, isMilestone }))).toEqual([
      { taskId: 'c', slackDays: 1, isCritical: false, isMilestone: false },
      { taskId: 'a', slackDays: 0, isCritical: true, isMilestone: false },
      { taskId: 'm', slackDays: 0, isCritical: true, isMilestone: true },
      { taskId: 'd', slackDays: 1, isCritical: false, isMilestone: false },
      { taskId: 'b', slackDays: 0, isCritical: true, isMilestone: false },
    ])
    expect(path.rows.find((row) => row.taskId === 'm')).toMatchObject({ earliestStart: 5, earliestFinish: 5, latestStart: 5, latestFinish: 5 })
    expect(JSON.stringify({ tasks, edges })).toBe(before)
    expect(createTaskGanttCriticalPath([], [])).toEqual({ durationDays: 0, rows: [], criticalTaskIds: [] })
  })
})
