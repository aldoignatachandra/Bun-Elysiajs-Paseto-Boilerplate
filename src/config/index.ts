import { validateEnv, type Env } from './env.schema';

let cachedEnv: Env | null = null;

export function getConfig() {
  if (cachedEnv) {
    return cachedEnv;
  }

  cachedEnv = validateEnv();
  return cachedEnv;
}

export type { Env };
