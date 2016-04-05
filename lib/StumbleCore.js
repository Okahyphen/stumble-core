'use strict';

const EventEmitter = require('events').EventEmitter;
const Extension = require('./Extension');
const Command = require('./Command');

const stack = require('./stack');
const path = require('path');

module.exports = class StumbleCore extends EventEmitter {
  constructor (opts) {
    super();

    opts = opts || {};

    this.commands = new Map();
    this.extensions = new Map();

    this.__cache = {};
    this.__cacheduration = opts.cacheduration || 1000;
    this.__cachetimer = null;
  }

  use (extension, pending, index) {
    if (Array.isArray(extension))
      extension.forEach((ext, i) => this.use(ext, extension, i));
    else {
      if (!extension || !Object.keys(extension).length)
        throw new Error('EXT: Attempted to use empty extension.');

      if (this.__cache[extension.handle]) return this;

      if (extension.needs) extension.needs.forEach(ext => {
        if (!this.extensions.has(ext)) {
          let missing = true;
          let length = null;

          if (pending && (length = pending.length))
            for (let offset = index + 1 || 1; offset < length; offset++)
              if (pending[offset].handle === ext) {
                clearTimeout(this.__cachetimer);

                this.use(pending[offset], pending, offset);
                this.__cache[ext] = true;

                this.__cachetimer = setTimeout(() => {
                  this.__cache = {};
                  this.__cachetimer = null;
                }, this.__cacheduration);

                missing = false;
                break;
              }

          if (missing) throw new Error(`EXT: Missing required [ ${ext} ].`);
        }
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

  execute (handle, data, roll) {
    const extension = this.extensions.get(handle);

    if (!extension || !extension.exec) return null;

    if (extension.hooks) {
      roll = extension.hooks.map(hook => this.execute(hook, data, roll));
    }

    return extension.exec.call(this, data, roll || null);
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

      this.commands.set(handle, new Command(command));
    }

    return this;
  }

  invoke (handle, data) {
    if (!this.commands.has(handle))
      throw new Error(`CMD: Attempted to invoke missing [ ${handle} ].`);

    const command = this.commands.get(handle);
    return command.exec.call(this, data);
  }

  static dequire (p) {
    if (!path.isAbsolute(p)) {
      const file = stack(2)[1].getFileName();
      const dir = path.dirname(file);

      p = path.resolve(dir, p);
    }

    const mod = require(p);

    delete require.cache[require.resolve(p)];

    return mod;
  }
};
