import { Buffer } from 'node:buffer';

const mutableBufferModule = require('node:buffer') as {
  SlowBuffer?: typeof Buffer;
};

if (!mutableBufferModule.SlowBuffer) {
  Object.defineProperty(mutableBufferModule, 'SlowBuffer', {
    configurable: true,
    enumerable: false,
    value: Buffer,
    writable: true,
  });
}
