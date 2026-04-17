import { secrets } from '../config/secrets';
import type { MessageFormaterInterface } from './interfaces';

export const messageFormater = (message: string): MessageFormaterInterface => {
  const parts = message.trim().split(/\s+/);
  return {
    splittedMessage: parts,
    command: (parts[0] ?? '').slice(secrets.PREFIX.length),
  };
};
