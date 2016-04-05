# `stumble-core`

*Extensible extensions.*

[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads]][npm-url]

[`stumble-core`][stumble-core] is an _extension loader_, and provides the base for the [`stumble`][stumble] module.

It's slightly tailored towards Stumble's use cases, but generic enough that other projects might find use in the structure that it provides.

This module is written in a mix of Node.js style ES5, and ES6. It is intended for use in modern Node `5.0.0` and newer environments.

## Usage

Install with `npm`.

```shell
$ npm install stumble-core
```

`require('stumble-core')` returns the `StumbleCore` base class, which can be extended upon, or instantiated.

### Base Class

```javascript
class StumbleCore extends EventEmitter (options :: Object)
```

The base class constructor takes a single argument, an options object. This options object cares about one property, `cacheduration`, which should be a number representing the time in milliseconds that the internal cache hangs on to _superloaded_ extensions. This is a fairly internal affair, and generally the options object can safely be omitted, and ignored.

```javascript
const StumbleCore = require('stumble-core');

const core = new StumbleCore();

class MyApp extends StumbleCore { ... }
```

### Properties

`commands :: Map` - Holds loaded commands, referenced by their `handle`.

`extensions :: Map` - Holds loaded extensions, referenced by their `handle`.

### Methods

```javascript
use (extension :: Object|Array<Object>[, pending :: Array<Object>])
```

```javascript
core.use({
  handle: 'logger',
  exec: data => console.log(data)
})
```

```javascript
execute (handle :: String, data :: Object, roll :: Array)
```

```javascript
core.execute('logger', { prop: 'Hello, world!' });
```

```javascript
define (command :: Object|Array<Object>)
```

```javascript
core.define({
  handle: 'a-command',
  exec: function (data) {
    this.execute
  }
});
```

```javascript
invoke (handle :: String, data :: Object)
```

```javascript
static dequire (userpath :: String)
```

A static helper method for loading user space modules. This method is a wrapper around `require`, which invalidates the resulting `require.cache` store for the loaded module, and returns the exports. Useful for hot swapping extensions, and continuous development.

It should *not* be used to load systems modules (`path`, `url`, `http`, etc...).

### Extensions

Extensions are small packages of code. Extensions can be _executed_, optionally _hooking_ other extensions beforehand. They can contain other extensions, and commands, acting as namespaces.

Extensions are created from shallowly copying the properties of an existing object. They are loaded with the `use` method, and executed with the `execute` method.

The only properties that matter are:

#### `.handle :: String`

While not strictly required, the `.handle` property must be present if an extension is to be stored. Errors will be thrown if `.exec` or `.extensions` is present without a `.handle`, or if a duplicate `.handle` is used.

#### `.version :: String`

An arbitrary version string. Not used by `StumbleCore` in any way.

#### `.hooks :: Array<String>`

An array of extension handles to execute before executing the `.exec` function. Each hook is executed with the same `data` argument passed to the original `execute` method call, allowing them to mutate the object. The result of each hook is mapped back to an array, which passed as the `roll` argument to the `.exec` function of the extension doing the hooking (`null` if there are no hooks).

#### `.exec :: Function`

The `.exec` property is the function executed by the `execute` instance method.

```javascript
function executable (data, roll) { ... }
```

#### `.term :: Function`

An optional property, intended for use as a terminating function. Since `StumbleCore` does not actually _unload_ extensions, this is not used internally in any way. However, an extension unloader could be implemented _as_ an extension, and may make use of this function.

#### `.init :: Function`

Extension-to-be objects may also contain an `.init` property. This function is invoked during the loading of the extension (but before the extension is actually set in stone). The function is passed the `StumbleCore` instance as its first argument, and also sets the instance as the contextual `this` of the function.

The `.init` function is discarded from the final extension object.

#### `.extensions :: Array<Object>`

The `.extensions` property can be used to house _other_ extensions. These extensions are loaded before the parent extension.

Each extension in the `.extensions` array is mapped to its `.handle`, and the resulting array is stored back on the final extension object, showing a parental relationship.

#### `.commands :: Array<Object>`

The `.commands` property can be used to house command objects. These commands are defined before the parent extension is loaded.

Each command in the `.commands` array is mapped to its `.handle`, and the resulting array is stored back on the final extension object, showing a parental relationship.

### Commands

Commands are miniature extensions, intended to be exposed to a end-user through some means. They are defined with the `define` method, and invoked with the `invoke` method.

Commands are created from shallowly copying the properties of an existing object.

The only properties that are copied over are:

#### `.handle :: String`

The identifier of the command. Used by the `invoke` method. It is required.

Command handles can not contain whitespace, and may not be duplicated. Everything else is fair game.

#### `.exec :: Function`

The executable block used by the `invoke` method. It is required.

#### `.info :: Function`

A completely optional function, which can be used to implement information gathering for commands.

[npm-url]: https://www.npmjs.com/package/stumble-core
[npm-image]: http://img.shields.io/npm/v/stumble-core.svg
[npm-downloads]: http://img.shields.io/npm/dm/stumble-core.svg

[stumble-core]: https://www.npmjs.com/package/stumble-core
[stumble]: https://www.npmjs.com/package/stumble
