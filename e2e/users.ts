export const PASSWORD = 'demo-password';

export const users = {
  admin: 'admin@demo.test',
  north: 'north@demo.test',
  gaika: 'gaika@demo.test',
} as const;

export type UserKey = keyof typeof users;
