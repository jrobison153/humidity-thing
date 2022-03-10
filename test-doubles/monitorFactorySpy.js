module.exports = () => {

  let spiedBrokerId;
  let spiedOptions;
  let spiedSensorId;
  let theMonitorSpy;

  return {

    create: async (brokerId, sensorId, options) => {
      spiedBrokerId = brokerId;
      spiedOptions = options;
      spiedSensorId = sensorId;

      theMonitorSpy = monitorSpy();

      return theMonitorSpy;
    },

    brokerId: () => spiedBrokerId,
    monitorSpy: () => theMonitorSpy,
    options: () => spiedOptions,
    sensorId: () => spiedSensorId,
  };
};

const monitorSpy = () => {

  let _startCalled = false;
  let _broker;
  let _startOptions;

  return {

    start: async (options) => {

      _startOptions = options;
      _startCalled = true;

      return Promise.resolve();
    },

    brokerId: () => _broker.id(),

    // ======================== Interface defined above this line ===============

    broker: (broker) => {
      _broker = broker;
    },

    startCalled: () => _startCalled,

    startOptions: () => _startOptions,
  };
};

