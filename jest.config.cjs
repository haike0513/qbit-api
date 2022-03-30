
const config = require('@polkadot/dev/config/jest.cjs');

module.exports = {
  ...config,
  moduleNameMapper: {
    '@qbit/sdk-(core|router)(.*)$': '<rootDir>/packages/sdk-$1/src/$2'
  },
  testTimeout: 30000
};
