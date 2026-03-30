export const alpha = (color, percent) =>
  `color-mix(in srgb, ${color} ${percent}%, transparent)`;

export const AVATAR_COLORS = [
  'var(--avatar-1)',
  'var(--avatar-2)',
  'var(--avatar-3)',
  'var(--avatar-4)',
  'var(--avatar-5)',
  'var(--avatar-6)',
];

export const CATEGORY_COLORS = {
  grocery: 'var(--avatar-1)',
  electricity: 'var(--avatar-3)',
  gas: 'var(--red)',
  internet: 'var(--blue)',
  water: 'var(--avatar-6)',
  rent: 'var(--avatar-4)',
  other: 'var(--text-dim)',
};
