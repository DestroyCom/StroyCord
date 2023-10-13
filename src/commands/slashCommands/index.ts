import * as current from './current';
import * as pause from './pause';
import * as play from './play';
import * as queue from './queue';
import * as redo from './redo';
import * as remove from './remove';
import * as resume from './resume';
import * as skip from './skip';

export const commands = {
  play,
  skip,
  remove,
  pause,
  resume,
  queue,
  current,
  redo,
};
