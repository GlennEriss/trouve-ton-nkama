import { Buffer } from 'node:buffer';

// Ce module est chargé uniquement côté Node (firebase/admin, next-auth), jamais en edge/ESM,
// donc le `require` ambiant du wrapper CommonJS suffit. Ne pas réintroduire un
// `createRequire(import.meta.url)` local: sous ts-jest (transpileModule, sortie CommonJS),
// `import.meta.url` n'est pas réécrit et le `const require = ...` généré entre en collision
// avec le paramètre `require` du wrapper CommonJS de Jest ("Identifier 'require' has already
// been declared"). Voir functions/src/node/slow-buffer-compat.ts pour le même correctif.
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
