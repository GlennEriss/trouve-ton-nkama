import { Buffer } from 'node:buffer';
import * as bufferModule from 'node:buffer';

const mutableBufferModule = bufferModule as unknown as {
  SlowBuffer?: typeof Buffer;
};

if (!mutableBufferModule.SlowBuffer) {
  mutableBufferModule.SlowBuffer = Buffer;
}
