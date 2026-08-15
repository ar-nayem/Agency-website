import { prisma } from '@/src/lib/prisma'
import { sendMail, taskOverdueTemplate } from '@/src/lib/email'

// Finds every PENDING task whose deadline has passed and that hasn't already
// triggered an overdue email, notifies the task's creator once, and stamps
// overdueNotifiedAt so the same task never re-sends on the next tick.
export async function runOverdueCheck() {
  const now = new Date()
  const overdue = await prisma.task.findMany({
    // Not just PENDING — a task an admin marked STARTED but never finished is
    // still "not completed" once the deadline passes.
    where: { status: { not: 'COMPLETED' }, dueAt: { lt: now }, overdueNotifiedAt: null },
    include: {
      assignedTo: { select: { name: true } },
      createdBy: { select: { name: true, email: true } },
    },
  })

  for (const task of overdue) {
    await sendMail(
      task.createdBy.email,
      `Task not completed: ${task.title}`,
      taskOverdueTemplate(task.assignedTo.name, task.title, task.dueAt)
    )
    await prisma.task.update({ where: { id: task.id }, data: { overdueNotifiedAt: now } })
  }

  return { checked: overdue.length }
}

if (require.main === module) {
  runOverdueCheck()
    .then((r) => console.log(JSON.stringify(r)))
    .catch(console.error)
    .finally(() => prisma.$disconnect())
}
