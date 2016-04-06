# `stumble-core`

**Extensible extensions.**

[![NPM version][npm-image]][npm-url] [![Downloads][npm-downloads]][npm-url]

[`stumble-core`][stumble-core] is an *extension loader*, and provides the base for the [`stumble`][stumble] module.

It's slightly tailored towards Stumble's use cases, but generic enough that other projects might find use in the structure that it provides.

This module is written in a mix of Node.js style ES5, and ES6. It is intended for use in modern Node `5.0.0` and newer environments.

While the module does aim for good performance, its intended use case is to be a front heavy loader for a long-running application, so it takes some liberties in making sure the structure it provides is sound, and that its API is simple.

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

The base class constructor takes a single argument, an options object. This options object cares about one property, `cacheduration`, which should be a number representing the time in milliseconds that the internal cache hangs on to *superloaded* extensions. This is a fairly internal affair, and generally the options object can safely be omitted, and ignored.

```javascript
const StumbleCore = require('stumble-core');

const core = new StumbleCore();

class MyApp extends StumbleCore { ... }
```

### Properties

`commands :: Map` - Holds loaded commands, referenced by their `handle`.

`extensions :: Map` - Holds loaded extensions, referenced by their `handle`.

### Methods

#### `use`

```javascript
use (
    extension :: Object|Array<Object>
    [, pending :: Array<Object>
    [, index :: Number]]
   )
```

The `use` method loads *extension*-like objects, transforming them into Extension objects, and placing these new objects in the `.extensions` Map instance property.

The `extension` argument may be a single *extension*-like object, or an array of *extension*-like objects. The `pending` and `index` arguments **should** be omitted from any outside call to `use`. These arguments are used internally, when the `use` method employs a recursive strategy to attempt loading missing extension `.needs`.

See: [Extensions](#extensions)

A completely contrived example of loading an *extension*-like object:

```javascript
core.use({
  handle: 'speaker',
  needs: ['input'],
  hooks: ['transformer'],
  exec: function speaker (data, roll) {
    const io = this.execute('input::getio');

    io.pipe(data.transformed || data.original);

    if (roll[0]) this.execute('log', { timestamp: roll[0].timestamp });
  }
})
```

#### `execute`

```javascript
execute (handle :: String, data :: Object, roll :: Array)
```

The `execute` method executes the `.exec` property of the extension identified by its `.handle`, passed as the `handle` argument.

The `.exec` function is passed the same `data` argument passed to `execute` as its first argument. Stylistically, this should be an object containing 'parameters' as properties. Realistically, it can be any type.

The `.exec` function is passed a `roll` as its second argument. The `roll` is either `null`, in the event that the extension has no `.hooks`, or an array of the results of executing each hook.

The contextual `this` of the `.exec` function is set as the calling instance of `StumbleCore`.

`execute` returns the result of the `.exec` function.

If an extension identified by `handle` is not present, or is present but has no `.exec` function, `execute` simply returns `null`. This is to allow for NOP like behaviour from optional `.hooks`.

A short example:

```javascript
core.use({
  handle: 'logger',
  exec: function logger (data) {
    Object.keys(data).forEach(key => console.log(data[key]));
  }
});

core.execute('logger', { prop: 'Hello, world!' });
```

#### `define`

```javascript
define (command :: Object|Array<Object>)
```

The `define` method loads *command-like* objects, transforming them into Command objects, and placing these new objects in the `.commands` Map instance property.

The `command` argument may be a single *command*-like object, or an array of *command*-like objects.

See: [Commands](#commands)

A simple example:

```javascript
core.define({
  handle: 'log-things',
  exec: function (data) {
    this.execute('logger', data);
  }
});
```

#### `invoke`

```javascript
invoke (handle :: String, data :: Object)
```

The `invoke` method invokes the `.exec` property of the command identified by its `.handle`, passed as the `handle` argument.

The `.exec` function is passed the same `data` argument passed to `invoke` as its first, and only, argument. Stylistically, this should be an object containing 'parameters' as properties. Realistically, it can be any type.

The contextual `this` of the `.exec` function is set as the calling instance of `StumbleCore`.

Attempting to `invoke` a command not present will throw an `Error`.

`invoke` returns the result of the `.exec` function.

A simple example:

```javascript
core.invoke('log-things', { one: 'hello', two: 'world' });
```

#### `dequire`

```javascript
static dequire (userpath :: String)
```

A static helper method for loading user space modules. This method is a wrapper around `require`, which invalidates the resulting `require.cache` store for the loaded module, and returns the exports. Useful for hot swapping extensions, and continuous development.

It should *not* be used to load systems modules (`path`, `url`, `http`, etc.).

### Extensions

Extensions are small packages of code. Extensions can be *executed*, optionally *hooking* other extensions beforehand. Extensions can depend on other extensions. Extensions can contain other extensions, and commands, acting as namespaces.

Extensions are created from shallowly copying the properties of an existing *extension*-like object. They are loaded with the `use` method, and executed with the `execute` method.

An object is considered *extension*-like when it has any, or all, of the following properties:

#### `.handle :: String`

While not strictly required, the `.handle` property must be present if an extension is to be stored. Errors will be thrown if `.exec` or `.extensions` is present without a `.handle`, or if a duplicate `.handle` is used.

#### `.version :: String`

An arbitrary version string. Not used by `StumbleCore` in any way.

#### `.needs :: Array<String>`

An array of extension handles that the extension depends on, and that must be loaded beforehand. If the `use` method is passed an array of extensions, and a *need* is not met in one of them, a simple strategy of scanning the rest of the array, and recursively *superloading* the required extension is employed.

The `.needs` property is discarded after load.

#### `.hooks :: Array<String>`

An array of extension handles to execute before executing the `.exec` function. Each hook is executed with the same `data` argument passed to the original `execute` method call, allowing them to mutate the object. The result of each hook is mapped back to an array, which passed as the `roll` argument to the `.exec` function of the extension doing the hooking (`null` if there are no hooks).

#### `.exec :: Function`

The `.exec` property is the function executed by the `execute` instance method.

```javascript
function executable (data, roll) { ... }
```

#### `.term :: Function`

An optional property, intended for use as a terminating function. Since `StumbleCore` does not actually _unload_ extensions, this is not used internally in any way. However, an extension unloader could be implemented _as_ an extension, or subclass feature set, and may make use of this function.

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

## License

[MIT][LICENSE].

---

Enjoy!

Colin 'Oka' Hall-Coates

[oka.io](http://oka.io/) | [@Okahyphen](https://twitter.com/Okahyphen)


[npm-url]: https://www.npmjs.com/package/stumble-core
[npm-image]: http://img.shields.io/npm/v/stumble-core.svg
[npm-downloads]: http://img.shields.io/npm/dm/stumble-core.svg

[stumble-core]: https://www.npmjs.com/package/stumble-core
[stumble]: https://www.npmjs.com/package/stumble
[LICENSE]: https://github.com/Okahyphen/stumble-core/blob/master/LICENSE
