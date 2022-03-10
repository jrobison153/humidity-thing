/**
 * monitorFactory module.
 * @module adapters/monitorFactory
 */

const clone = require('clone');
const testBroker = require('./testBroker');
const mqttBroker = require('./mqttBroker');
const testSensor = require('./testSensor');
const dht22Sensor = require('./dht22Sensor');
const defaultMonitor = require('../policy/defaultMonitor');

/**
 * @function constructor
 *
 * @return {Object} monitorFactory
 */
const factory = () => {

  let _monitor;

  const BROKER_ADDRESS_OPTION = 'brokerAddress';
  const LOG_FILE_OPTION = 'logFile';
  const SENSOR_SCRIPT_PATH_OPTION = 'sensorScriptPath';
  const TLS_CERT_PATH_OPTION = 'tlsCertPath';
  const TLS_KEY_PATH_OPTION = 'tlsKeyPath';
  const TLS_CA_PATH_OPTION = 'tlsCaPath';
  const THING_NAME_OPTION = 'thingName';

  const TEST_SENSOR = 'test';
  const DHT22_SENSOR = 'dht22';
  const TEST_BROKER = 'test';
  const MQTT_BROKER = 'mqtt';

  const VALID_SENSOR_IDS = [TEST_SENSOR, DHT22_SENSOR];

  const VALID_BROKER_IDS = [TEST_BROKER, MQTT_BROKER];

  const _defaultSensorImpls = {
    [TEST_SENSOR]: testSensor,
    [DHT22_SENSOR]: dht22Sensor,
  };

  const _defaultBrokerImpls = {
    [TEST_BROKER]: testBroker,
    [MQTT_BROKER]: mqttBroker,
  };

  let _sensorImpls = clone(_defaultSensorImpls);
  let _brokerImpls = clone(_defaultBrokerImpls);

  const _isValidBrokerId = (brokerId) => {

    return VALID_BROKER_IDS.indexOf(brokerId) >= 0;
  };

  const _createBroker = async (brokerId, options) => {

    const commonBrokerOptions = {
      logFile: options[LOG_FILE_OPTION],
    };

    let initializedBroker;

    if (_isValidBrokerId(brokerId)) {

      if (brokerId === 'mqtt') {

        const mqttBroker = _brokerImpls[brokerId];

        const mqttBrokerOptions = {
          tlsCertPath: options[TLS_CERT_PATH_OPTION],
          tlsKeyPath: options[TLS_KEY_PATH_OPTION],
          tlsCaPath: options[TLS_CA_PATH_OPTION],
          thingName: options[THING_NAME_OPTION],
          ...commonBrokerOptions,
        };

        const brokerAddress = options[BROKER_ADDRESS_OPTION];

        initializedBroker = await mqttBroker(brokerAddress, mqttBrokerOptions);
      } else {

        const genericBroker = _brokerImpls[brokerId];
        initializedBroker = await genericBroker(commonBrokerOptions);
      }
    } else {
      throw new Error(`Invalid Broker Id '${brokerId}'`);
    }

    return initializedBroker;
  };

  const _createSensor = async (sensorId, options) => {

    let theSensor;

    if (VALID_SENSOR_IDS.indexOf(sensorId) >= 0) {

      theSensor = _sensorImpls[sensorId];
    } else {
      throw new Error(`Invalid Sensor Id '${sensorId}'`);
    }

    return await theSensor(options[SENSOR_SCRIPT_PATH_OPTION]);
  };

  return {

    resetSensors: () => {

      _sensorImpls = clone(_defaultSensorImpls);
    },

    resetBrokers: () => {

      _brokerImpls = clone(_defaultBrokerImpls);
    },

    setBroker: (id, impl) => {

      if (VALID_BROKER_IDS.indexOf(id) >= 0) {

        _brokerImpls[id] = impl;
      } else {
        throw new Error(`Invalid identifier '${id}', cannot set factory implementation`);
      }
    },

    setSensor: (id, impl) => {

      if (VALID_SENSOR_IDS.indexOf(id) >= 0) {

        _sensorImpls[id] = impl;
      } else {
        throw new Error(`Invalid identifier '${id}', cannot set factory implementation`);
      }
    },

    getBroker: (id) => _brokerImpls[id],

    getSensor: (id) => _sensorImpls[id],

    /**
     * Creates a monitor configured to use the specified broker and sensor implementations.
     *
     * @param {('test' | 'mqtt')} brokerId - identifies which broker type to initialize the monitor with
     * @param {('test' | 'dht22')} sensorId - identifies which sensor type to initialize the monitor with
     *
     * @param {object} options
     * @param {string} [options.brokerAddress] - broker address, required if brokerId is 'mqtt'
     * @param {string} [options.logFile] - path to log file
     * @param {string} [options.sensorScriptPath] - path to the dht22 sensor Python 3 script,
     * required if sensorId is 'dht22'
     * @param {string} [options.tlsCaPath] - path to the TLS root certificate authority for the mqtt broker
     * @param {string} [options.tlsCertPath] - path to the TLS public certificate for the mqtt broker,
     * required if brokerId is 'mqtt'
     * @param {string} [options.tlsKeyPath] - path to the TLS private key for the mqtt broker,
     * required if brokerId is 'mqtt'
     *
     * @return {Promise<Monitor>}
     */
    create: async (brokerId, sensorId, options = {}) => {

      const initializedBroker = await _createBroker(brokerId, options);
      const initializedSensor = await _createSensor(sensorId, options);

      if (_monitor === undefined) {
        _monitor = defaultMonitor;
      }

      return await _monitor(initializedBroker, initializedSensor);
    },

    overrideMonitor: (monitor) => {

      _monitor = monitor;
    },
  };
};

module.exports = factory();
