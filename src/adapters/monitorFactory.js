const testBroker = require('./testBroker');
const mqttBroker = require('./mqttBroker');
const testSensor = require('./testSensor');
const dht22Sensor = require('./dht22Sensor');
const defaultMonitor = require('../policy/defaultMonitor');

const factory = () => {

  let _monitor;
  let _journal = [];

  const _createBroker = async (brokerId) => {

    let theBroker;
    if (brokerId === 'test') {

      theBroker = testBroker;

    } else if (brokerId === 'mqtt') {

      theBroker = mqttBroker;
    } else {
      throw new Error(`Invalid Broker Id '${brokerId}'`);
    }

    return await theBroker();
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

    create: async (brokerId, sensorId) => {

      _journal.push({
        command: 'create',
        brokerId,
        sensorId,
      });

      const initializedBroker = await _createBroker(brokerId);
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
