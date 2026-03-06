import path from 'path';

const resolveDataDir = () => {
  const raw = process.env.DATA_DIR?.trim();
  if (!raw) return path.join(process.cwd(), 'data');
  return path.resolve(process.cwd(), raw);
};

export const DATA_DIR = resolveDataDir();

export const dataPath = (...segments: string[]) => path.join(DATA_DIR, ...segments);
