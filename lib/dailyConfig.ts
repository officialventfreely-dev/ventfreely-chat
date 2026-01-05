export const EMOTIONS = ["Grateful", "Calm", "Happy", "Hopeful"] as const;
export type Emotion = (typeof EMOTIONS)[number];

export const ENERGIES = ["Low", "Okay", "Good", "Great"] as const;
export type Energy = (typeof ENERGIES)[number];

export const ENERGY_TO_SCORE: Record<Energy, number> = {
  Low: 1,
  Okay: 2,
  Good: 3,
  Great: 4,
};
