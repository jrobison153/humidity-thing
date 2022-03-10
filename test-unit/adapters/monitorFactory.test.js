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

const mQttBrokerSpy = (id) => {

  return async (brokerAddress, options) => {

    return {
      id: () => id,
      brokerAddress: () => brokerAddress,
      createOptions: () => options,
    };
  };
};

const setupSensorAndBrokerDoubles = () => {

  const dummyTestSensor = dummySensor('dummyTestSensor');
  const dummyDht22Sensor = dummySensor('dummyDht22Sensor');
  const dummyTestBroker = dummyBroker('dummyTestBroker');
  const dummyMqttBroker = mQttBrokerSpy('dummyMqttBroker');

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
          brokerAddress: 'http://a.broker.com:8888',
          logFile: '/path/to/out.log',
          thingName: 'a-test-thing',
          tlsCertPath: '/some/cert/path',
          tlsKeyPath: '/some/key/path',
          tlsCaPath: '/some/ca/path',
        };
      });

      describe('And options are provided', () => {

        beforeEach(async () => {

          monitor = await monitorFactory.create('mqtt', 'test', options);
        });

        test('Then the initialized MQTT broker is provided as a constructor parameter', async () => {

          expect(monitor.providedBroker().id()).toEqual('dummyMqttBroker');
        });

        test('Then the brokerAddress option is provided to the broker on construction', async () => {

          expect(monitor.providedBroker().brokerAddress()).toEqual('http://a.broker.com:8888');
        });

        test('Then the tlsCertPath option is provided to the broker on construction', async () => {

          expect(monitor.providedBroker().createOptions().tlsCertPath).toEqual('/some/cert/path');
        });

        test('Then the tlsKeyPath option is provided to the broker on construction', async () => {

          expect(monitor.providedBroker().createOptions().tlsKeyPath).toEqual('/some/key/path');
        });

        test('Then the tlsCaPath option is provided to the broker on construction', async () => {

          expect(monitor.providedBroker().createOptions().tlsCaPath).toEqual('/some/ca/path');
        });

        test('Then the thingName option is provided to the broker on construction', () => {

          expect(monitor.providedBroker().createOptions().thingName).toEqual('a-test-thing');
        });

        test('Then the logFile option is provided to the broker on construction', async () => {

          expect(monitor.providedBroker().createOptions().logFile).toEqual('/path/to/out.log');
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
