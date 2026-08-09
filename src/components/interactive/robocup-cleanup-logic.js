/**
 * Pipeline-stage math for the point-cloud cleanup shuffle. No DOM here.
 *
 * Each stage contributes accuracy and costs time. Order matters, the same way it does in a
 * real pipeline: downsampling earlier speeds up everything after it, and segmentation only
 * pays off fully once the ground plane is already gone.
 */

export const BASE_ACCURACY = 60;
export const BASE_SPEED = 10;

export const STAGES = [
  { id: 'voxel', label: 'Voxel downsample', accuracy: 2, speed: 15 },
  { id: 'stat', label: 'Statistical outlier removal', accuracy: 14, speed: 35 },
  { id: 'ground', label: 'Ground plane removal', accuracy: 10, speed: 25 },
  { id: 'cluster', label: 'Cluster segmentation', accuracy: 12, speed: 30, requires: 'ground' },
];

/** Stages after `voxel` (if enabled and earlier in the order) run on fewer points. */
const SPEEDUP_FACTOR = 0.5;
/** `cluster` without `ground` run first still works, just badly. */
const PREREQ_PENALTY = 0.4;

export const TARGET_ACCURACY = 95;
export const SPEED_BUDGET = 100;

/**
 * @param {string[]} order  Stage ids, in the sequence the visitor placed them, enabled only.
 * @returns {{ accuracy: number, speed: number }}
 */
export function computePipeline(order) {
  const voxelIndex = order.indexOf('voxel');
  const groundIndex = order.indexOf('ground');

  let accuracy = BASE_ACCURACY;
  let speed = BASE_SPEED;

  order.forEach((id, index) => {
    const stage = STAGES.find((s) => s.id === id);
    if (!stage) return;

    let stageAccuracy = stage.accuracy;
    if (stage.requires === 'ground' && (groundIndex === -1 || groundIndex > index)) {
      stageAccuracy *= PREREQ_PENALTY;
    }
    accuracy += stageAccuracy;

    const speedsUp = id !== 'voxel' && voxelIndex !== -1 && voxelIndex < index;
    speed += stage.speed * (speedsUp ? SPEEDUP_FACTOR : 1);
  });

  return { accuracy, speed };
}
