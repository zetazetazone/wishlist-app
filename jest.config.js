/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/__tests__'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
  },
  // Skip React Native modules that don't work in Node
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|moti|@gorhom|@shopify|nativewind)/)',
  ],
};
