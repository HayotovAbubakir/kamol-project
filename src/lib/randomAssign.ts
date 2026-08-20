import { shuffleArray } from '@/lib/utils';
import type { Project } from '@/types';

export type AssignWorker = { id: string; name: string };

export type AnimationType = 'wheel' | 'slot' | 'dice' | 'shuffle' | 'lottery';

export const ANIMATION_TYPES: AnimationType[] = ['wheel', 'slot', 'dice', 'shuffle', 'lottery'];

export interface AssignPair {
  projectId: string;
  workerId: string;
  workerName: string;
  projectLabel: string;
}

export interface FairAssignSummary {
  assignCount: number;
  unassignedProjectCount: number;
  idleWorkerCount: number;
}

export function getFairAssignSummary(projectCount: number, workerCount: number): FairAssignSummary {
  const assignCount = Math.min(projectCount, workerCount);
  return {
    assignCount,
    unassignedProjectCount: Math.max(0, projectCount - assignCount),
    idleWorkerCount: Math.max(0, workerCount - assignCount),
  };
}

export function formatProjectShort(project: Project): string {
  return project.address;
}

export function formatAssignResult(workerName: string, projectLabel: string): string {
  return `${workerName} — ${projectLabel}`;
}

/** Har bir ishchiga ko'pi bilan 1 ta loyiha — adolatli random juftlash. */
export function createRandomPairs(
  projects: Project[],
  workers: AssignWorker[],
): AssignPair[] {
  if (projects.length === 0 || workers.length === 0) return [];

  const assignCount = Math.min(projects.length, workers.length);
  const shuffledProjects = shuffleArray(projects).slice(0, assignCount);
  const shuffledWorkers = shuffleArray(workers).slice(0, assignCount);

  return shuffledProjects.map((project, index) => {
    const worker = shuffledWorkers[index];
    return {
      projectId: project.id,
      workerId: worker.id,
      workerName: worker.name,
      projectLabel: formatProjectShort(project),
    };
  });
}

export function buildDistributionCounts(
  workers: AssignWorker[],
  pairs: AssignPair[],
): { label: string; value: number }[] {
  const counts = new Map<string, number>();
  for (const worker of workers) {
    counts.set(worker.name, 0);
  }
  for (const pair of pairs) {
    counts.set(pair.workerName, (counts.get(pair.workerName) ?? 0) + 1);
  }
  return workers.map((worker) => ({
    label: worker.name,
    value: counts.get(worker.name) ?? 0,
  }));
}

export function resolveAnimationType(
  selected: AnimationType | 'mix',
  index: number,
): AnimationType {
  if (selected !== 'mix') return selected;
  return ANIMATION_TYPES[index % ANIMATION_TYPES.length];
}
