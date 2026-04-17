import { describe, expect, it, vi } from 'vitest';

vi.mock('src/config/secrets', () => ({
  secrets: { PREFIX: '&' },
}));

import { messageFormater } from 'src/utils/messageUtils';

describe('messageFormater', () => {
  it('extracts the command from a prefixed message', () => {
    const result = messageFormater('&play some song');
    expect(result.command).toBe('play');
    expect(result.splittedMessage).toEqual(['&play', 'some', 'song']);
  });

  it('handles a message with only the command', () => {
    const result = messageFormater('&skip');
    expect(result.command).toBe('skip');
    expect(result.splittedMessage).toEqual(['&skip']);
  });
});
