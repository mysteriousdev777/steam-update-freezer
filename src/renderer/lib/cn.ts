import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// clsx joins conditionally; tailwind-merge resolves conflicts so the last class wins.
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));
