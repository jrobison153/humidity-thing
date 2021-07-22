const clone = require('clone');

const msTime = {
  timer: (ms) => new Promise((res) => setTimeout(res, ms)),

  now: () => Date.now(),
};

const SUCCESS = 0;
const FAILURE = 1;

const OPTION_KEYS = ['sensorPeriod', 'thingName', 'topicName'];

/**
 *
 * @param {object} broker
 * @param {object} sensor
 * @param {object} time
 * @return {Promise<{stop: stop, start: (function(Object): Promise<unknown>), id: (function(): string)}>}
 */
module.exports = async (broker, sensor, time = msTime) => {

  let _shouldRun = true;
  let _queuedReadings = [];

  const _connect = async (options, reject) => {

    try {

      await broker.connect();
    } catch (e) {

      reject(new Error(`Failure starting monitor: broker connection failed, root cause: ${e.toString()}`));
    }
  };

  const _processQueuedReadings = async (topicName) => {

    if (_queuedReadings.length > 0) {

      const requeueReadings = [];
      for (const queuedReading of _queuedReadings) {

        try {

          await broker.publish(topicName, queuedReading);
        } catch (e) {
          requeueReadings.push(queuedReading);
        }
      }

      _queuedReadings = requeueReadings;
    }
  };

  const _takeReading = async (thingName) => {

    let sensorReading = {};

    try {

      sensorReading = await sensor.read();

      sensorReading.statusCode = SUCCESS;
      sensorReading.statusMsg = 'success';
    } catch (e) {
      sensorReading.statusCode = FAILURE;
      sensorReading.statusMsg = `Sensor read failed: root cause ${e.toString()}`;
    }

    sensorReading.thingName = thingName;
    sensorReading.time = time.now();

    return sensorReading;
  };

  const _startLoop = async (options) => {

    while (_shouldRun) {

      await _processQueuedReadings(options.topicName);

      const sensorReading = await _takeReading(options.thingName);

      try {

        await broker.publish(options.topicName, sensorReading);
      } catch (e) {
        _queuedReadings.push(sensorReading);
      }

      await time.timer(options.sensorPeriod);
    }
  };

  const _optionsAreValid = (options) => {

    const result = {
      ok: true,
      error: undefined,
    };

    const missingOptionKey = OPTION_KEYS.find((key) => !options[key]);

    if (missingOptionKey) {
      result.ok = false;
      result.error = new Error(`Required option '${missingOptionKey}' is missing`);
    }

    return result;
  };

  return {

    /**
     *
     * Start the monitoring loop. Runs until the stop() function is called.
     *
     * @param {object} options
     *  sensorPeriod {uint} - Required - number of milliseconds to wait between sensor readings
     *  thingName {string} - Required - name of the IoT thing
     *  topicName {string} - Required - name of topic to publish sensor readings to
     *
     * @return {Promise<unknown>}
     */
    start: async (options) => {

      return new Promise(async (resolve, reject) => {

        const optionsStatus = _optionsAreValid(options);

        if (optionsStatus.ok) {

          await _connect(options, reject);

          await _startLoop(options);

          resolve();
        } else {

          reject(optionsStatus.error);
        }
      });
    },

    stop: () => {
      _shouldRun = false;
    },

    queuedReadings: () => clone(_queuedReadings),

    preloadReadingsQueue: (readings) => {

      _queuedReadings = readings;
    },

    id: () => 'default',
  };
};
