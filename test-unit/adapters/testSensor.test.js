const sensor = require('../../src/adapters/testSensor');

describe('Test Sensor Tests', () => {

  let initializedSensor;

  beforeEach(async () => {

    initializedSensor = await sensor();
  });

  describe('When taking a sensor reading', () => {

    test('Then it returns an object with the humidity value set', async () => {

      const reading = await initializedSensor.read();

      expect(reading.humidity).toEqual(54.3);
    });
  });

  describe('When retrieving the Id', () => {

    test('Then it is returned', () => {

      expect(initializedSensor.id()).toEqual('test');
    });
  });
});
