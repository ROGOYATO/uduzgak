import { describe, expect, it } from 'vitest'
import { getTaskGanttDurationDays } from './task-gantt'
import { createTask, type Task } from './task'

function task(id: string, startDate?: string, dueDate?: string, isMilestone = false): Task {
  const base = createTask({ id, projectId: 'p-1', title: id, now: '2026-10-16T08:00:00.000Z' })
  return { ...base, ...(startDate ? { startDate } : {}), ...(dueDate ? { dueDate } : {}), ...(isMilestone ? { isMilestone: true } : {}) }
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
