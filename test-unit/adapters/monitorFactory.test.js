const testSensor = require('../../src/adapters/testSensor');
const dht22Sensor = require('../../src/adapters/dht22Sensor');
const testBroker = require('../../src/adapters/testBroker');
const mqttBroker = require('../../src/adapters/mqttBroker');
const monitorFactory = require('../../src/adapters/monitorFactory');

const monitorSpy = (broker, sensor) => {

  return {

    providedBroker: () => broker,
    providedSensor: () => sensor,
    id: () => 'spy',
  };
};

const dummySensor = (id) => {

  return async (sensorScriptPath) => {

    return {
      id: () => id,
      sensorScriptPath,
    };
  };
};

const dummyBroker = (id) => {

  return async (options) => {

    return {
      id: () => id,
      createOptions: () => options,
    };
  };
};

const setupSensorAndBrokerDoubles = () => {

  const dummyTestSensor = dummySensor('dummyTestSensor');
  const dummyDht22Sensor = dummySensor('dummyDht22Sensor');
  const dummyTestBroker = dummyBroker('dummyTestBroker');
  const dummyMqttBroker = dummyBroker('dummyMqttBroker');

  monitorFactory.setSensor('test', dummyTestSensor);
  monitorFactory.setSensor('dht22', dummyDht22Sensor);
  monitorFactory.setBroker('test', dummyTestBroker);
  monitorFactory.setBroker('mqtt', dummyMqttBroker);
};

describe('monitorFactory tests', () => {

  beforeEach(() => {

    monitorFactory.resetSensors();
    monitorFactory.resetBrokers();
  });

  describe('When setting the sensor implementations', () => {

    describe('And the id is not valid', () => {

      test('Then an error is thrown', () => {

        const wrapperFn = () => {
          monitorFactory.setSensor('bogusId', () => {});
        };

        return expect(wrapperFn)
            .toThrowError(/.*Invalid identifier 'bogusId', cannot set factory implementation.*/);
      });
    });
  });

  describe('When setting the broker implementations', () => {

    describe('And the id is not valid', () => {

      test('Then an error is thrown', () => {

        const wrapperFn = () => {
          monitorFactory.setBroker('bogusId', () => {});
        };

        return expect(wrapperFn)
            .toThrowError(/.*Invalid identifier 'bogusId', cannot set factory implementation.*/);
      });
    });
  });

  describe('When sensor impls are reset', () => {

    test('Then the test sensor is restored', () => {

      monitorFactory.setSensor('test', () => {});

      expect(monitorFactory.getSensor('test')).not.toEqual(testSensor);

      monitorFactory.resetSensors();

      expect(monitorFactory.getSensor('test')).toEqual(testSensor);
    });

    test('Then the dht22 sensor is restored', () => {

      monitorFactory.setSensor('dht22', () => {});

      expect(monitorFactory.getSensor('dht22')).not.toEqual(dht22Sensor);

      monitorFactory.resetSensors();

      expect(monitorFactory.getSensor('dht22')).toEqual(dht22Sensor);
    });
  });

  describe('When broker impls are reset', () => {

    test('Then the test broker is restored', () => {

      monitorFactory.setBroker('test', () => {});

      expect(monitorFactory.getBroker('test')).not.toEqual(testBroker);

      monitorFactory.resetBrokers();

      expect(monitorFactory.getBroker('test')).toEqual(testBroker);
    });

    test('Then the mqtt broker is restored', () => {

      monitorFactory.setBroker('mqtt', () => {});

      expect(monitorFactory.getBroker('mqtt')).not.toEqual(mqttBroker);

      monitorFactory.resetBrokers();

      expect(monitorFactory.getBroker('mqtt')).toEqual(mqttBroker);
    });
  });

  describe('When default values are used', () => {

    test('Then the default monitor is created', async () => {

      setupSensorAndBrokerDoubles();

      const monitor = await monitorFactory.create('test', 'test');

      expect(monitor.id()).toEqual('default');
    });

    test('Then the test sensor is defaulted', () => {

      const actualTestSensor = monitorFactory.getSensor('test');

      expect(actualTestSensor).toEqual(testSensor);
    });

    test('Then the test broker is defaulted', () => {

      const actualTestBroker = monitorFactory.getBroker('test');

      expect(actualTestBroker).toEqual(testBroker);
    });

    test('Then the dht22 sensor is defaulted', () => {

      const actualDht22Sensor = monitorFactory.getSensor('dht22');

      expect(actualDht22Sensor).toEqual(dht22Sensor);
    });

    test('Then the mqtt broker is defaulted', () => {

      const actualMqttBroker = monitorFactory.getBroker('mqtt');

      expect(actualMqttBroker).toEqual(mqttBroker);
    });
  });

  describe('When the monitor is created', () => {

    let monitor;

    beforeEach(() => {

      setupSensorAndBrokerDoubles();

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

        expect(monitor.providedBroker().id()).toEqual('dummyTestBroker');
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

          expect(monitor.providedBroker().id()).toEqual('dummyMqttBroker');
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

        const actualSensorId = monitor.providedSensor().id();

        expect(actualSensorId).toEqual('dummyTestSensor');
      });
    });

    describe('And the dht22 sensor is specified', () => {

      beforeEach(async () => {

        const options = {
          sensorScriptPath: '/some/path/script.py',
        };

        monitor = await monitorFactory.create('test', 'dht22', options);
      });

      test('Then the initialized dht22 sensor is provided as a constructor parameter', () => {

        expect(monitor.providedSensor().id()).toEqual('dummyDht22Sensor');
      });

      test('Then the sensorScriptPath is provided as a constructor parameter', () => {

        expect(monitor.providedSensor().sensorScriptPath).toEqual('/some/path/script.py');
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
