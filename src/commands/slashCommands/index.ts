import * as clearplaylist from './clearplaylist';
import * as config from './config';
import * as current from './current';
import * as pause from './pause';
import * as play from './play';
import * as priority from './priority';
import * as queue from './queue';
import * as redo from './redo';
import * as remove from './remove';
import * as resume from './resume';
import * as skip from './skip';
import * as stats from './stats';

export const commands = {
  play,
  skip,
  remove,
  pause,
  resume,
  queue,
  current,
  redo,
  clearplaylist,
  priority,
  config,
  stats,
};
