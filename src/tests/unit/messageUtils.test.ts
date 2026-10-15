import { messageFormater } from 'src/utils/messageUtils';
import { describe, expect, it } from 'vitest';

describe('messageFormater', () => {
  it('extracts the command from a prefixed message', () => {
    const result = messageFormater('&play some song', '&');
    expect(result.command).toBe('play');
    expect(result.splittedMessage).toEqual(['&play', 'some', 'song']);
  });

  it('handles a message with only the command', () => {
    const result = messageFormater('&skip', '&');
    expect(result.command).toBe('skip');
    expect(result.splittedMessage).toEqual(['&skip']);
  });

  it('handles a multi-character prefix', () => {
    const result = messageFormater('!!queue', '!!');
    expect(result.command).toBe('queue');
  });
});
