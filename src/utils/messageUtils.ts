import type { MessageFormaterInterface } from './interfaces';

export const messageFormater = (message: string, prefix: string): MessageFormaterInterface => {
  const parts = message.trim().split(/\s+/);
  return {
    splittedMessage: parts,
    command: (parts[0] ?? '').slice(prefix.length),
  };
};
