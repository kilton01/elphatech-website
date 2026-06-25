type TaskForReadiness = {
  id: string;
  milestoneId: string | null;
  phase: number;
  status: string;
};

export function computeTaskReadiness(tasks: TaskForReadiness[]): Map<string, boolean> {
  const readiness = new Map<string, boolean>();

  // Group tasks by milestone
  const byMilestone = new Map<string | null, TaskForReadiness[]>();
  for (const task of tasks) {
    const key = task.milestoneId;
    if (!byMilestone.has(key)) byMilestone.set(key, []);
    byMilestone.get(key)!.push(task);
  }

  for (const [_, milestoneTasks] of byMilestone) {
    // Find the highest phase where ALL tasks are done
    const phases = [...new Set(milestoneTasks.map(t => t.phase))].sort((a, b) => a - b);

    let highestCompletedPhase = 0;
    for (const phase of phases) {
      const phaseTasks = milestoneTasks.filter(t => t.phase === phase);
      const allDone = phaseTasks.every(t => t.status === 'done');
      if (allDone) {
        highestCompletedPhase = phase;
      } else {
        break;
      }
    }

    // Tasks are ready if their phase is the next one after the highest completed
    for (const task of milestoneTasks) {
      if (task.status === 'done') {
        readiness.set(task.id, true);
      } else {
        readiness.set(task.id, task.phase <= highestCompletedPhase + 1);
      }
    }
  }

  return readiness;
}
