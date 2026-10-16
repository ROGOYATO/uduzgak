import { describe, expect, it } from 'vitest'
import {
  createTaskGanttCriticalGraph,
  createTaskGanttCriticalOrder,
  createTaskGanttCriticalPath,
  createTaskGanttEarliestOffsets,
  getTaskGanttDurationDays,
} from './task-gantt'
import { createTask, type Task } from './task'
import type { TaskRelationship } from './task-relationship'

function task(id: string, startDate?: string, dueDate?: string, isMilestone = false): Task {
  const base = createTask({ id, projectId: 'p-1', title: id, now: '2026-10-16T08:00:00.000Z' })
  return { ...base, ...(startDate ? { startDate } : {}), ...(dueDate ? { dueDate } : {}), ...(isMilestone ? { isMilestone: true } : {}) }
}

function blocks(id: string, sourceTaskId: string, targetTaskId: string): TaskRelationship {
  return { id, type: 'blocks', sourceTaskId, targetTaskId, createdAt: '2026-10-16T08:00:00.000Z' }
}

describe('Gantt logical task duration', () => {
  it('counts exact UTC calendar days, preserves unscheduled Tasks, and treats milestones as zero duration', () => {
    const february = task('a', '2028-02-28', '2028-03-01')
    const snapshot = { ...february }
    expect(getTaskGanttDurationDays(february)).toBe(3)
    expect(getTaskGanttDurationDays(task('b', '2028-02-28', '2028-02-28'))).toBe(1)
    expect(getTaskGanttDurationDays(task('c', '2028-02-28'))).toBeNull()
    expect(getTaskGanttDurationDays(task('d', '2028-02-28', '2028-02-28', true))).toBe(0)
    expect(february).toEqual(snapshot)
  })
})

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

describe('Gantt dependency topological order', () => {
  it('respects blocking precedence, stable ties, and rejects dependency cycles', () => {
    const tasks = ['c', 'b', 'a', 'd'].map((id) => task(id, '2026-10-19', '2026-10-19'))
    const edges = [blocks('r1', 'a', 'c'), blocks('r2', 'b', 'c'), blocks('r3', 'c', 'd')]
    expect(createTaskGanttCriticalOrder(tasks, edges)).toEqual(['b', 'a', 'c', 'd'])
    expect(() => createTaskGanttCriticalOrder(tasks, [...edges, blocks('r4', 'd', 'a')])).toThrow('Gantt dependency cycle')
  })
})

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
