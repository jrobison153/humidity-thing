const sensor = require('../../src/adapters/testSensor');

describe('Test Sensor Tests', () => {

  describe('When taking a sensor reading', () => {

    test('Then it returns an object with the humidity value set', async () => {

      const initializedSensor = await sensor();

      const reading = await initializedSensor.read();

      expect(reading.humidity).toEqual(54.3);
    });
  });
});
