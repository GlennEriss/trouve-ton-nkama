import { Buffer } from 'node:buffer';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const mutableBufferModule = require('buffer') as {
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
