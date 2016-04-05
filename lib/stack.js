'use strict';

module.exports = function trace (limit) {
  const prepareStackTrace = Error.prepareStackTrace;
  Error.prepareStackTrace = (_, stack) => stack;
  Error.stackTraceLimit = limit;

  const worker = {};
  Error.captureStackTrace(worker, trace);

  const stack = worker.stack;
  Error.prepareStackTrace = prepareStackTrace;
  Error.stackTraceLimit = 10;

  return stack;
};
