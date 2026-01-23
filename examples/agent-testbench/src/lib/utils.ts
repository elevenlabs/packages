import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type CallLogEntry = {
  method: string;
  args: unknown[];
  when: number;
};

export function spyOnMethods<T extends Record<string, unknown>>(
  options: T,
  methodNames: (keyof T)[],
  logCall: (entry: CallLogEntry) => void
): T {
  const result = { ...options };

  for (const methodName of methodNames) {
    const originalMethod = options[methodName];
    result[methodName] = ((...args: unknown[]) => {
      logCall({
        method: String(methodName),
        args,
        when: Date.now(),
      });

      if (typeof originalMethod === 'function') {
        return originalMethod.apply(options, args);
      }
    }) as T[typeof methodName];
  }

  return result;
}
