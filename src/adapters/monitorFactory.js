const clone = require('clone');
const testBroker = require('./testBroker');
const mqttBroker = require('./mqttBroker');
const testSensor = require('./testSensor');
const dht22Sensor = require('./dht22Sensor');
const defaultMonitor = require('../policy/defaultMonitor');

const factory = () => {

  let _monitor;
  let _journal = [];

  const BROKER_ADDRESS_OPTION = 'brokerAddress';
  const LOG_FILE_OPTION = 'logFile';
  const SENSOR_SCRIPT_PATH_OPTION = 'sensorScriptPath';
  const TLS_CERT_PATH_OPTION = 'tlsCertPath';
  const TLS_KEY_PATH_OPTION = 'tlsKeyPath';

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

  // TODO these validations should be moved to the MQTT broker as part of construction
  const _validateRequiredBrokerOptions = (options) => {

    const requiredOptions = [TLS_CERT_PATH_OPTION, TLS_KEY_PATH_OPTION, BROKER_ADDRESS_OPTION];

    requiredOptions.forEach((requiredOption) => {

      if (!options[requiredOption]) {
        throw new Error(`Required option ${requiredOption} is missing`);
      }
    });

    const brokerOptions = {};

    brokerOptions.tlsCertPath = options[TLS_CERT_PATH_OPTION];
    brokerOptions.tlsKeyPath = options[TLS_KEY_PATH_OPTION];
    brokerOptions.brokerAddress = options[BROKER_ADDRESS_OPTION];

    return brokerOptions;
  };

  const _createBroker = async (brokerId, options) => {

    let theBroker;
    let brokerOptions = {};

    if (VALID_BROKER_IDS.indexOf(brokerId) >= 0) {

      theBroker = _brokerImpls[brokerId];

      if (brokerId === 'mqtt') {
        brokerOptions = _validateRequiredBrokerOptions(options);
      }
    } else {
      throw new Error(`Invalid Broker Id '${brokerId}'`);
    }

    brokerOptions.logFile = options[LOG_FILE_OPTION];

    return await theBroker(brokerOptions);
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
     * @param{string} brokerId - valid values ['test', 'mqtt']
     * @param{string} sensorId - valid values ['test', 'dht22']
     *
     * @param{object }options
     *  logFile - String: path to log file
     *  tlsCertPath - String: path to the tls public certificate for the mqtt broker
     *  tlsKeyPath - String: path to the tls private key for the mqtt broker
     *  sensorScriptPath - String: path to the dht22 sensor Python 3 script,
     *
     * @return {Promise<Monitor>}
     */
    create: async (brokerId, sensorId, options = {}) => {

      _journal.push({
        command: 'create',
        brokerId,
        sensorId,
        options,
      });

      const initializedBroker = await _createBroker(brokerId, options);
      const initializedSensor = await _createSensor(sensorId, options);

      if (_monitor === undefined) {
        _monitor = defaultMonitor;
      }

      return await _monitor(initializedBroker, initializedSensor);
    },

    clearJournal: () => {
      _journal = [];
    },

    journalEntry: (index) => _journal[index],

    overrideMonitor: (monitor) => {

      _monitor = monitor;
    },
  };
};

module.exports = factory();
