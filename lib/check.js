'use strict';

const command = {
  valid: cmd => {
    if (!cmd)
      throw new Error('CMD: Attempted to define empty command.');

    if (!cmd.handle)
      throw new Error('CMD: Attempted to define command without handle.');

    if (!cmd.exec)
      throw new Error('CMD: Attempted to define command without executable.');
  },
  usable: (handle, commands, aliases) => {
    if (commands.has(handle) || aliases.has(handle))
      throw new Error(`CMD: Attempted to define duplicate command or alias [ ${handle} ].`);

    if (/\s/.test(handle))
      throw new Error(`CMD: Whitespace in command handle or alias [ ${handle} ].`);
  }
};

module.exports = { command };
