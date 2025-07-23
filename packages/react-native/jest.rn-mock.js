// Simple React Native mock for Jest
module.exports = {
  Platform: {
    OS: 'ios',
    select: jest.fn((options) => options.ios),
  },
  StyleSheet: {
    create: jest.fn((styles) => styles),
    flatten: jest.fn((styles) => styles),
  },
  Dimensions: {
    get: jest.fn(() => ({ width: 375, height: 667 })),
  },
  // Add any other React Native modules as needed
};