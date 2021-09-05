const monitorFactory = require('../../src/adapters/monitorFactory');

const monitorSpy = (broker, sensor) => {

  return {

    providedBroker: () => broker,
    providedSensor: () => sensor,
    id: () => 'spy',
  };
};

describe('monitorFactory tests', () => {

  let monitor;

  describe('When default values are used', () => {

    test('Then the default monitor is created', async () => {

      monitor = await monitorFactory.create('test', 'test');

      expect(monitor.id()).toEqual('default');
    });
  });

  describe('When the monitor is created', () => {

    beforeEach(() => {

      monitorFactory.overrideMonitor(monitorSpy);
      monitorFactory.clearJournal();
    });

    describe('And the test broker is specified', () => {

      const options = {
        logFile: '/some/path/to/out.log',
      };

      beforeEach(async () => {

        monitor = await monitorFactory.create('test', 'test', options);
      });

      test('Then the initialized test broker is provided as a constructor parameter', async () => {

        expect(monitor.providedBroker().id()).toEqual('test');
      });

      test('Then the logFile option is provided to the broker on construction', async () => {

        expect(monitor.providedBroker().createOptions().logFile).toEqual('/some/path/to/out.log');
      });

    });

    describe('And the mqtt broker is specified', () => {

      let options;

      beforeEach(() => {

        options = {
          logFile: '/path/to/out.log',
          tlsCertPath: '/some/cert/path',
          tlsKeyPath: '/some/key/path',
        };
      });

      describe('And options are provided', () => {

        beforeEach(async () => {

          monitor = await monitorFactory.create('mqtt', 'test', options);
        });

        test('Then the initialized MQTT broker is provided as a constructor parameter', async () => {

          expect(monitor.providedBroker().id()).toEqual('mqtt');
        });

        test('Then the tlsCertPath option is provided to the broker on construction', async () => {

          expect(monitor.providedBroker().createOptions().tlsCertPath).toEqual('/some/cert/path');
        });

        test('Then the tlsKeyPath option is provided to the broker on construction', async () => {

          expect(monitor.providedBroker().createOptions().tlsKeyPath).toEqual('/some/key/path');
        });

        test('Then the logFile option is provided to the broker on construction', async () => {

          expect(monitor.providedBroker().createOptions().logFile).toEqual('/path/to/out.log');
        });
      });

      describe('And the tlsCertPath required option is missing', () => {

        test('Then an error is thrown', () => {

          delete options.tlsCertPath;

          const monitorCreatedPromise = monitorFactory.create('mqtt', 'test', options);
          return expect(monitorCreatedPromise).rejects.toThrowError(/.*Required option tlsCertPath missing.*/);
        });
      });

      describe('And the tlsKeyPath required option is missing', () => {

        test('Then an error is thrown', () => {

          delete options.tlsKeyPath;

          const monitorCreatedPromise = monitorFactory.create('mqtt', 'test', options);
          return expect(monitorCreatedPromise).rejects.toThrowError(/.*Required option tlsKeyPath missing.*/);
        });
      });
    });

    describe('And the test sensor is specified', () => {

      test('Then the initialized test sensor is provided as a constructor parameter', async () => {

        monitor = await monitorFactory.create('test', 'test');
        expect(monitor.providedSensor().id()).toEqual('test');
      });
    });

    describe('And the dht22 sensor is specified', () => {

      test('Then the initialized dht22 sensor is provided as a constructor parameter', async () => {

        monitor = await monitorFactory.create('test', 'dht22');
        expect(monitor.providedSensor().id()).toEqual('dht22');
      });
    });

    test('Then a journal entry is added with the command set to create', async () => {

      await monitorFactory.create('test', 'test');
      expect(monitorFactory.journalEntry(0).command).toEqual('create');
    });

    test('Then a journal entry is added with the brokerId set', async () => {

      await monitorFactory.create('test', 'test');
      expect(monitorFactory.journalEntry(0).brokerId).toEqual('test');
    });

    test('Then a journal entry is added with the sensorId set', async () => {

      await monitorFactory.create('test', 'test');
      expect(monitorFactory.journalEntry(0).sensorId).toEqual('test');
    });

    test('Then the options are recorded in the journal', async () => {

      const options = {foo: 'bar'};
      await monitorFactory.create('test', 'test', options);

      expect(monitorFactory.journalEntry(0).options).toEqual(options);
    });

    test('Then the journal is appended to for each create operation', async () => {

      await monitorFactory.create('test', 'test');
      await monitorFactory.create('test', 'test');
      await monitorFactory.create('test', 'test');

      expect(monitorFactory.journalEntry(2).command).toEqual('create');
    });

    test('Then the journal can be cleared', async () => {

      await monitorFactory.create('test', 'test');
      await monitorFactory.create('test', 'test');
      await monitorFactory.create('test', 'test');

      monitorFactory.clearJournal();

      expect(monitorFactory.journalEntry(0)).toBeUndefined();
    });

    describe('And the broker id is invalid', () => {

      test('Then an error is thrown', () => {

        const createPromise = monitorFactory.create('bogusBrokerId', 'test');

        return expect(createPromise).rejects.toThrowError(/.*Invalid Broker Id.*/);
      });
    });

    describe('And the sensor id is invalid', () => {

      test('Then an error is thrown', () => {

        const createPromise = monitorFactory.create('test', 'bogusSensorId');

        return expect(createPromise).rejects.toThrowError(/.*Invalid Sensor Id.*/);
      });
    });
  });
});
