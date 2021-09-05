const testBroker = require('./testBroker');
const mqttBroker = require('./mqttBroker');
const testSensor = require('./testSensor');
const dht22Sensor = require('./dht22Sensor');
const defaultMonitor = require('../policy/defaultMonitor');

const factory = () => {

  let _monitor;
  let _journal = [];

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

    if (brokerId === 'test') {

      theBroker = testBroker;

    } else if (brokerId === 'mqtt') {

      brokerOptions = _validateRequiredBrokerOptions(options);
      theBroker = mqttBroker;
    } else {
      throw new Error(`Invalid Broker Id '${brokerId}'`);
    }

    brokerOptions.logFile = options.logFile;

    return await theBroker(brokerOptions);
  };

  const _createSensor = async (sensorId) => {

    let theSensor;
    if (sensorId === 'test') {

      theSensor = testSensor;
    } else if (sensorId === 'dht22') {

      theSensor = dht22Sensor;
    } else {
      throw new Error(`Invalid Sensor Id '${sensorId}'`);
    }

    return await theSensor();
  };

  return {

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
