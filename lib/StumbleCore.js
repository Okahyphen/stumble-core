'use strict';

const EventEmitter = require('events').EventEmitter;
const Extension = require('./Extension');
const Command = require('./Command');
const IO = require('./IO');

module.exports = class StumbleCore extends EventEmitter {
  constructor (config) {
    super();

    this.client = null;
    this.config = config;
    this.commands = new Map();
    this.extensions = new Map();
    this.io = new IO();
    this.space = new Map();
  }

  use (extension) {
    if (Array.isArray(extension)) extension.forEach(ext => this.use(ext));
    else {
      if (!extension || !Object.keys(extension).length)
        throw new Error('EXT: Attempted to use empty extension.');

      if (extension.needs) extension.needs.forEach(ext => {
        if (!this.extensions.has(ext))
          throw new Error(`EXT: Missing required [ ${ext} ].`);
      });

      const extensions = extension.extensions;
      const commands = extension.commands;
      const init = extension.init;

      extension = new Extension(extension);

      const handle = extension.handle;

      if (this.extensions.has(handle))
        throw new Error(`EXT: Attempted to use duplicate [ ${handle} ].`);

      if (init) init.call(this, this);

      const exec = extension.exec;

      if (!handle && exec)
        throw new Error('EXT: Attempted to add exec without handle.');

      if (!handle && extensions)
        throw new Error('EXT: Attempted to add extensions without handle.');

      if (extensions) {
        this.use(extensions);
        extension.extensions = extensions.map(ext => ext.handle);
      }

      if (!handle && commands)
        throw new Error('EXT: Attempted to add commands without handle.');

      if (commands) {
        this.define(commands);
        extension.commands = commands.map(cmd => cmd.handle);
      }

      if (handle) this.extensions.set(handle, extension);
    }

    return this;
  }

  execute (handle, share, roll) {
    if (!this.extensions.has(handle))
      throw new Error(`EXT: Attempted to invoke missing [ ${handle} ]`);

    const extension = this.extensions.get(handle);

    if (!extension.exec)
      throw new Error(`EXT: [ ${handle} ] has no executable routine.`);

    if (extension.hooks) {
      roll = extension.hooks.map(hook => this.execute(hook, share, roll));
    }

    return extension.exec.call(this, share, roll || null);
  }

  define (command) {
    if (Array.isArray(command)) command.forEach(cmd => this.define(cmd));
    else {
      if (!command || !(command.handle && command.exec))
        throw new Error('CMD: Attempted to define empty command.');

      const handle = command.handle;

      if (this.commands.has(handle))
        throw new Error(`CMD: Attempted to define duplicate [ ${handle} ].`);

      if (/\s/.test(handle))
        throw new Error(`CMD: Whitespace in command [ ${handle} ].`);

      this.commands.set(handle, (
        command instanceof Command ? command : new Command(command)
      ));
    }

    return this;
  }

  invoke (handle, data) {
    if (!this.commands.has(handle))
      throw new Error(`CMD: Attempted to invoke missing [ ${handle} ]`);

    const command = this.commands.get(handle);
    return command.exec.call(this, data);
  }
};