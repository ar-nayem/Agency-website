export const TASK_STATUSES = ['PENDING', 'STARTED', 'COMPLETED'] as const
export type TaskStatus = (typeof TASK_STATUSES)[number]
