const childProcess = require('child_process');

describe('Publish Humidity Acceptance Tests', () => {

  describe('When thing is running', () => {

    let humidityThingProcess;

    beforeAll(() => {

      const binLocation = require.resolve('../bin/humidity-thing.js');
      const args = [
        '--broker',
        'test',
      ];

      humidityThingProcess = childProcess.spawn(binLocation, args);

      humidityThingProcess.stderr.on('data', (data) => {
        console.log(`Humidity process stderr: ${data}`);
      });

      humidityThingProcess.stdout.on('data', (data) => {
        console.log(`Humidity process stdout: ${data}`);
      });

      humidityThingProcess.on('close', (code) => {

        console.log(`Humidity process ended with code ${code}`);
      });
    });

    afterAll(() => {

      humidityThingProcess.kill('SIGTERM');
    });

    test('Then the current humidity value is published', async () => {

      const expectedHumidity = 54.3;

      expect(publishedData.humidity).toEqual(expectedHumidity);
    });
  });
});
