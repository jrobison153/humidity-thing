const defaultMonitor = require('../../src/policy/defaultMonitor');
const timerSpy = require('../../test-doubles/timerSpy');
const brokerSpy = require('../../test-doubles/brokerSpy');
const sensorSpy = require('../../test-doubles/sensorSpy');

const CERT_PATH = 'some/path';
const CERT_KEY_PATH = 'asfafsd43sdf';
const TEST_SENSOR_PERIOD = 10;
const THING_NAME = 'someThingName';

const timer = (ms) => new Promise((res) => setTimeout(res, ms));

describe('default monitor tests', () => {

  let aBrokerSpy;
  let aSensorSpy;
  let aTimerSpy;
  let monitor;

  const options = {
    certPath: CERT_PATH,
    certKeyPath: CERT_KEY_PATH,
    topicName: 'humidityTopic',
    sensorPeriod: TEST_SENSOR_PERIOD,
    thingName: THING_NAME,
  };

  const stubQueuedData = [
    {a: 'b'},
    {c: 'd'},
    {e: 'f'},
  ];

  const initMonitor = async (failReads = false, failPublish = false) => {
    aBrokerSpy = brokerSpy();
    aSensorSpy = sensorSpy();
    aTimerSpy = timerSpy();

    if (failReads) {
      aSensorSpy.failReads();
    }

    if (failPublish) {
      aBrokerSpy.failPublish();
    }

    monitor = await defaultMonitor(aBrokerSpy, aSensorSpy, aTimerSpy);

    return monitor;
  };

  const startMonitor = async (failReads = false, failPublish = false) => {

    await initMonitor(failReads, failPublish);

    const donePromise = monitor.start(options);

    await timer(TEST_SENSOR_PERIOD * 3);

    monitor.stop();

    return donePromise;
  };

  const startMonitorWithPreloadedQueueOfReadings = async (failPubKeyList = []) => {

    await initMonitor();

    monitor.preloadReadingsQueue(stubQueuedData);

    aBrokerSpy.failPublishForObjectsWithKeys(failPubKeyList);

    monitor.start(options);

    await timer(TEST_SENSOR_PERIOD * 3);

    monitor.stop();
  };

  describe('When the monitor starts', () => {

    beforeEach(() => {

      return startMonitor();
    });

    test('Then the broker is connected', async () => {

      expect(aBrokerSpy.connectCalled()).toEqual(true);
    });

    test('Then the received sensor readings are published', async () => {

      expect(aBrokerSpy.publishedData()).toEqual(aSensorSpy.allReadings());
    });

    test('Then the received sensor reading is published to the correct topic', () => {

      expect(aBrokerSpy.publishedTopic()).toEqual('humidityTopic');
    });

    test('Then the timer period is set from the options', () => {

      expect(aTimerSpy.waitPeriod()).toEqual(TEST_SENSOR_PERIOD);
    });

    test('Then the event is enriched with the thing name', () => {

      expect(aBrokerSpy.publishedData()[0].thingName).toEqual(THING_NAME);
    });

    test('Then the event is enriched with the current time', () => {

      expect(aBrokerSpy.publishedData()[0].time).toEqual(aTimerSpy.now());
    });

    test('Then the event is enriched with a status code equal to success', () => {

      expect(aBrokerSpy.publishedData()[0].statusCode).toEqual(0);
    });

    test('Then the event is enriched with a status message', () => {

      expect(aBrokerSpy.publishedData()[0].statusMsg).toEqual('success');
    });

    test('Then the broker connection is only done once', () => {

      expect(aBrokerSpy.connectCallCount()).toEqual(1);
    });
  });

  describe('Given there are errors starting the monitor', () => {

    describe('When connection to the broker fails', () => {

      test('Then an error is returned', async () => {

        aBrokerSpy = brokerSpy();
        aSensorSpy = sensorSpy();
        aTimerSpy = timerSpy();

        aBrokerSpy.failConnection();

        const monitor = await defaultMonitor(aBrokerSpy, aSensorSpy, aTimerSpy);

        const donePromise = monitor.start(options);

        return expect(donePromise).rejects
            .toThrowError(/.*Failure starting monitor.*Failing broker connection for test reasons.*/);
      });
    });

    describe('When the sensor reading fails', () => {

      beforeEach(() => {

        return startMonitor(true);
      });

      test('Then a message is published with the status code set to the fail code', async () => {

        expect(aBrokerSpy.publishedData()[0].statusCode).toEqual(1);
      });

      test('Then a message is published with the status message set', async () => {

        expect(aBrokerSpy.publishedData()[0].statusMsg)
            .toMatch(/.*Sensor read failed: root cause.*Failing read for test purposes.*/);
      });
    });

    describe('When there are publish errors', () => {

      test('Then the readings that failed to publish are queued for next publish', async () => {

        await startMonitor(false, true);

        expect(monitor.queuedReadings()).toEqual(aSensorSpy.allReadings());
      });

      test('Then queued readings are published to the correct topic', async () => {

        await startMonitorWithPreloadedQueueOfReadings();

        expect(aBrokerSpy.publishedTopicForData({a: 'b'})).toEqual('humidityTopic');
      });

      test('Then any queued readings are published before new readings when the broker is available again',
          async () => {

            await startMonitorWithPreloadedQueueOfReadings();

            expect(aBrokerSpy.publishedData()).toEqual(stubQueuedData.concat(aSensorSpy.allReadings()));
          });

      test('Then queued messages are not lost if subsequent publishes fail', async () => {

        await startMonitorWithPreloadedQueueOfReadings(['a', 'e']);

        expect(monitor.queuedReadings()).toEqual([{a: 'b'}, {e: 'f'}]);
      });

      test.todo('max reading queue depth tests');
    });

    describe('When required options are missing', () => {

      const startMonitorWithMissingOption = async (optionName) => {

        await initMonitor();

        const missingOptions = {...options};

        delete missingOptions[optionName];

        return monitor.start(missingOptions);
      };

      test.each([
        'sensorPeriod',
        'thingName',
        'topicName',
      ])('Then an error is thrown for %s', (optKey) => {

        const donePromise = startMonitorWithMissingOption(optKey);

        const errRegex = new RegExp(`.*Required option '${optKey}' is missing.*`);
        return expect(donePromise).rejects.toThrowError(errRegex);
      });

      test.todo('queue depth option missing error');
    });
  });
});
