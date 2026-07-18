import type { Config } from 'jest'

import baseConfig from './jest.config'

const config: Config = {
  ...baseConfig,
  testMatch: ['**/__tests__/rules/**/*.test.[jt]s?(x)'],
}

export default config
