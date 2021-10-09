const clone = require('clone');
const testBroker = require('./testBroker');
const mqttBroker = require('./mqttBroker');
const testSensor = require('./testSensor');
const dht22Sensor = require('./dht22Sensor');
const defaultMonitor = require('../policy/defaultMonitor');

const factory = () => {

  let _monitor;
  let _journal = [];

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

  const _validateRequiredBrokerOptions = (options) => {

    const brokerOptions = {};

    if (!options.tlsCertPath) {
      throw new Error('Required option tlsCertPath missing');
    }

    if (!options.tlsKeyPath) {
      throw new Error('Required option tlsKeyPath missing');
    }

    brokerOptions.tlsCertPath = options.tlsCertPath;
    brokerOptions.tlsKeyPath = options.tlsKeyPath;

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

    brokerOptions.logFile = options.logFile;

    return await theBroker(brokerOptions);
  };

  const _createSensor = async (sensorId) => {

    let theSensor;

    if (VALID_SENSOR_IDS.indexOf(sensorId) >= 0) {

      theSensor = _sensorImpls[sensorId];
    } else {
      throw new Error(`Invalid Sensor Id '${sensorId}'`);
    }

    return await theSensor();
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
     *
     * @param{string} brokerId
     * @param{string} sensorId
     * @param{object }options
     * @return {Promise<*>}
     */
    create: async (brokerId, sensorId, options = {}) => {

      _journal.push({
        command: 'create',
        brokerId,
        sensorId,
        options,
      });

      const initializedBroker = await _createBroker(brokerId, options);
      const initializedSensor = await _createSensor(sensorId);

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
