module.exports = {
  createCanvas: jest.fn().mockReturnValue({
    getContext: jest.fn().mockReturnValue({
      fillStyle: '',
      fillRect: jest.fn(),
      drawImage: jest.fn(),
      measureText: jest.fn(() => ({ width: 100 })),
      fillText: jest.fn(),
      beginPath: jest.fn(),
      moveTo: jest.fn(),
      lineTo: jest.fn(),
      stroke: jest.fn(),
      arc: jest.fn(),
      fill: jest.fn(),
    }),
    toBuffer: jest.fn().mockReturnValue(Buffer.from('mock-png')),
    width: 800,
    height: 400,
  }),
};
