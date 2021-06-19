const oclifTest = require('@oclif/test').test;
const cmd = require('../src/index');
const monitorFactory = require('../src/adapters/monitorFactory');

const monitorSpy = () => {

  let _startCalled = false;
  let _broker;

  return {

    start: () => {

      _startCalled = true;
    },

    brokerId: () => _broker.id(),

    // ======================== Interface defined above this line ===============

    broker: (broker) => {
      _broker = broker;
    },

    startCalled: () => _startCalled,

  };
};

describe('humidityThing Tests', () => {

  let aMonitorSpy;
  let flags;

  beforeAll(() => {

    flags = cmd.flags;
  });

  beforeEach(() => {

    aMonitorSpy = monitorSpy();

    const monitor = (broker) => {

      aMonitorSpy.broker(broker);
      return aMonitorSpy;
    };

    monitorFactory.overrideMonitor(monitor);
    monitorFactory.clearJournal();
  });

  describe('Flag checks', () => {

    test('Then the broker flag is available', () => {

      expect(flags.broker).toBeDefined();
    });

    test('Then the valid broker options are set', () => {

      const brokerValidOptions = cmd.flags.broker.options;

      expect(brokerValidOptions).toEqual(['test', 'mqtt']);
    });

    test('Then the broker argument is defaulted', () => {

      expect(flags.broker.default).toEqual('mqtt');
    });

    test('Then the sensor flag is available', () => {

      expect(flags.sensor).toBeDefined();
    });

    test('Then the valid sensor options are set', () => {

      const sensorValidOptions = cmd.flags.sensor.options;

      expect(sensorValidOptions).toEqual(['test', 'dht22']);
    });

    test('Then the sensor argument is defaulted', () => {

      expect(flags.sensor.default).toEqual('dht22');
    });
  });

  describe('When running the command', () => {

    oclifTest
        .stdout()
        .stderr()
        .do(() => cmd.run(['--broker', 'test']))
        .it('Then the monitor factory creates the monitor with the specified broker', () => {

          expect(monitorFactory.journalEntry(0)).toMatchObject({
            command: 'create',
            brokerId: 'test',
          });
        });

    oclifTest
        .stdout()
        .stderr()
        .do(() => cmd.run(['--sensor', 'test']))
        .it('Then the monitor factory creates the monitor with the specified sensor', () => {

          expect(monitorFactory.journalEntry(0)).toMatchObject({
            command: 'create',
            sensorId: 'test',
          });
        });

    oclifTest
        .stdout()
        .stderr()
        .do(() => cmd.run(['--broker', 'test']))
        .it('Then the monitor is started', () => {

          expect(aMonitorSpy.startCalled()).toEqual(true);
        });
  });
});
