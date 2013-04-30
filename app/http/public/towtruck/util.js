/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this file,
 * You can obtain one at http://mozilla.org/MPL/2.0/. */

define(["jquery"], function ($) {
  var util = {};

  util.Deferred = $.Deferred;
  TowTruck.$ = $;

  /* A simple class pattern, use like:

    var Foo = util.Class({
      constructor: function (a, b) {
        init the class
      },
      otherMethod: ...
    });

  You can also give a superclass as the optional first argument.

  Instantiation does not require "new"

  */
  util.Class = function (superClass, prototype) {
    if (prototype === undefined) {
      prototype = superClass;
    } else {
      var newPrototype = Object.create(superClass);
      for (var a in prototype) {
        newPrototype[a] = prototype[a];
      }
      prototype = newPrototype;
    }
    var ClassObject = function () {
      var obj = Object.create(prototype);
      obj.constructor.apply(obj, arguments);
      return obj;
    };
    ClassObject.prototype = prototype;
    if (prototype.constructor.name) {
      ClassObject.className = prototype.constructor.name;
      ClassObject.toString = function () {
        return '[Class ' + this.className + ']';
      };
    }
    return ClassObject;
  };

  /* Extends obj with other, or copies obj if no other is given. */
  util.extend = TowTruck._extend;

  util.forEachAttr = function (obj, callback, context) {
    context = context || obj;
    for (var a in obj) {
      if (obj.hasOwnProperty(a)) {
        callback.call(context, obj[a], a);
      }
    }
  };

  /* Trim whitespace from a string */
  util.trim = function trim(s) {
    return s.replace(/^\s+/, "").replace(/\s+$/, "");
  };

  /* Convert a string into something safe to use as an HTML class name */
  util.safeClassName = function safeClassName(name) {
    return name.replace(/[^a-zA-Z0-9_\-]/g, "_") || "class";
  };

  util.AssertionError = function (message) {
    if (! this instanceof util.AssertionError) {
      return new util.AssertionError(message);
    }
    this.message = message;
    this.name = "AssertionError";
  };
  util.AssertionError.prototype = Error.prototype;

  util.assert = function (cond) {
    if (! cond) {
      var args = ["Assertion error:"].concat(Array.prototype.slice.call(arguments, 1));
      console.error.apply(console, args);
      if (console.trace) {
        console.trace();
      }
      throw new util.AssertionError(args.join(" "));
    }
  };

  /* Generates a random ID */
  util.generateId = function (length) {
    length = length || 10;
    var letters = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUV0123456789';
    var s = '';
    for (var i=0; i<length; i++) {
      s += letters.charAt(Math.floor(Math.random() * letters.length));
    }
    return s;
  };

  util.pickRandom = function (array) {
    return array[Math.floor(Math.random() * array.length)];
  };

  util.mixinEvents = TowTruck._mixinEvents;

  util.Module = util.Class({
    constructor: function (name) {
      this._name = name;
    },
    toString: function () {
      return '[Module ' + this._name + ']';
    }
  });

  util.blobToBase64 = function (blob) {
    // Oh this is just terrible
    var binary = '';
    var bytes = new Uint8Array(blob);
    var len = bytes.byteLength;
    for (var i=0; i<len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  };

  util.truncateCommonDomain = function (url, base) {
    /* Remove the scheme and domain from url, if it matches the scheme and domain
       of base */
    if (! base) {
      return url;
    }
    var regex = /^https?:\/\/[^\/]*/i;
    var match = regex.exec(url);
    var matchBase = regex.exec(base);
    if (match && matchBase && match[0] == matchBase[0]) {
      // There is a common scheme and domain
      return url.substr(match[0].length);
    }
    return url;
  };

  util.resolver = function (deferred, func) {
    util.assert(deferred.then, "Bad deferred:", deferred);
    util.assert(typeof func == "function", "Not a function:", func);
    return function () {
      var result;
      try {
        result = func.apply(this, arguments);
      } catch (e) {
        deferred.reject(e);
        throw e;
      }
      if (result && result.then) {
        result.then(function () {
          deferred.resolveWith(this, arguments);
        }, function () {
          deferred.rejectWith(this, arguments);
        });
        // FIXME: doesn't pass progress through
      } else if (result === undefined) {
        deferred.resolve();
      } else {
        deferred.resolve(result);
      }
      return result;
    };
  };

  /* Resolves several promises (the promises are the arguments to the function)
     or the first argument may be an array of promises.

     Returns a promise that will resolve with the results of all the
     promises.  If any promise fails then the returned promise fails.

     FIXME: if a promise has more than one return value (like with
     promise.resolve(a, b)) then the latter arguments will be lost.
     */
  util.resolveMany = function () {
    var args;
    if (arguments.length == 1 && Array.isArray(arguments[0])) {
      args = arguments[0];
    } else {
      args = Array.prototype.slice.call(arguments);
    }
    return util.Deferred(function (def) {
      var count = args.length;
      var allResults = [];
      var anyError = false;
      args.forEach(function (arg, index) {
        arg.then(function (result) {
          allResults[index] = result;
          count--;
          check();
        }, function (error) {
          allResults[index] = error;
          anyError = true;
          count--;
          check();
        });
      });
      function check() {
        if (! count) {
          if (anyError) {
            def.reject.apply(def, allResults);
          } else {
            def.resolve.apply(def, allResults);
          }
        }
      }
    });
  };

  return util;
});
