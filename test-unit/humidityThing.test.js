const oclifTest = require('@oclif/test').test;
const cmd = require('../src/index');
const monitorFactory = require('../src/adapters/monitorFactory');

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

describe('humidityThing Tests', () => {

  let aMonitorSpy;
  let flags;
  let args;

  beforeAll(() => {

    args = cmd.args;
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

  describe('Arg and Flag checks', () => {

    test('Then the broker flag is available', () => {

      expect(flags.broker).toBeDefined();
    });

    test('Then the valid broker options are set', () => {

      const brokerValidOptions = cmd.flags.broker.options;

      expect(brokerValidOptions).toEqual(['test', 'mqtt']);
    });

    test('Then the broker flag is defaulted', () => {

      expect(flags.broker.default).toEqual('mqtt');
    });

    test('Then the sensor flag is available', () => {

      expect(flags.sensor).toBeDefined();
    });

    test('Then the valid sensor options are set', () => {

      const sensorValidOptions = cmd.flags.sensor.options;

      expect(sensorValidOptions).toEqual(['test', 'dht22']);
    });

    test('Then the sensor flag is defaulted', () => {

      expect(flags.sensor.default).toEqual('dht22');
    });

    test('Then the topicName arg is available', () => {

      const theArg = args.find((arg) => arg.name === 'topicName');

      expect(theArg).toBeDefined();
    });

    test('Then the topicName arg is required', () => {

      const theArg = args.find((arg) => arg.name === 'topicName');

      expect(theArg.required).toEqual(true);
    });

    test('Then the thingName arg is available', () => {

      const theArg = args.find((arg) => arg.name === 'thingName');

      expect(theArg).toBeDefined();
    });

    test('Then the thingName arg is required', () => {

      const theArg = args.find((arg) => arg.name === 'thingName');

      expect(theArg.required).toEqual(true);
    });

    test('Then thingName is the first arg', () => {

      expect(args[0].name).toEqual('thingName');
    });

    test('Then topicName is the second arg', () => {

      expect(args[1].name).toEqual('topicName');
    });

    test('Then publications log file flag is defined', () => {

      expect(flags['log-publications-file']).toBeDefined();
    });

    test('Then sensor-period flag is defined', () => {

      expect(flags['sensor-period']).toBeDefined();
    });

    test('Then sensor-period flag has the correct default value', () => {

      expect(flags['sensor-period'].default).toEqual(60000);
    });

    test('Then the tls-cert-path flag is defined', ()=> {

      expect(flags['tls-cert-path']).toBeDefined();
    });

    test('Then the tls-key-path flag is defined', ()=> {

      expect(flags['tls-key-path']).toBeDefined();
    });

    test('Then the  flag is defined', ()=> {

      expect(flags['tls-key-path']).toBeDefined();
    });
  });

  describe('When running the command', () => {

    oclifTest
        .stdout()
        .stderr()
        .do(() => cmd.run(['aTopicName', 'aThingName', '--broker', 'test', '--sensor', 'test']))
        .it('Then the monitor factory creates the monitor with the specified broker', () => {

          expect(monitorFactory.journalEntry(0)).toMatchObject({
            command: 'create',
            brokerId: 'test',
          });
        });

    oclifTest
        .stdout()
        .stderr()
        .do(() => cmd.run(['aThingName', 'aTopicName', '--sensor', 'test', '--broker', 'test']))
        .it('Then the monitor factory creates the monitor with the specified sensor', () => {

          expect(monitorFactory.journalEntry(0)).toMatchObject({
            command: 'create',
            sensorId: 'test',
          });
        });

    oclifTest
        .stdout()
        .stderr()
        .do(() => cmd.run([
          'aThingName',
          'aTopicName',
          '--sensor',
          'test',
          '--tls-cert-path',
          '/some/cert/path',
          '--tls-key-path',
          'whatever',
        ]))
        .it('Then the monitor factory creates the monitor with the tls cert path option provided', () => {

          expect(monitorFactory.journalEntry(0)).toMatchObject({
            options: {
              tlsCertPath: '/some/cert/path',
            },
          });
        });

    oclifTest
        .stdout()
        .stderr()
        .do(() => cmd.run([
          'aThingName',
          'aTopicName',
          '--sensor',
          'test',
          '--tls-key-path',
          '/some/key/path',
          '--tls-cert-path',
          '/some/cert/path',
        ]))
        .it('Then the monitor factory creates the monitor with the tls key path option provided', () => {

          expect(monitorFactory.journalEntry(0)).toMatchObject({
            options: {
              tlsKeyPath: '/some/key/path',
            },
          });
        });

    oclifTest
        .stdout()
        .stderr()
        .do(() => cmd.run([
          'aThingName',
          'aTopicName',
          '--sensor',
          'test',
          '--tls-key-path',
          '/some/key/path',
          '--tls-cert-path',
          '/some/cert/path',
          '--log-publications-file',
          '/some/path/to/out.log',
        ]))
        .it('Then the monitor factory creates the monitor with the logfile path provided', () => {

          expect(monitorFactory.journalEntry(0)).toMatchObject({
            options: {
              logFile: '/some/path/to/out.log',
            },
          });
        });

    oclifTest
        .stdout()
        .stderr()
        .do(() => cmd.run(['aThingName', 'aTopicName', '--broker', 'test', '--sensor', 'test']))
        .it('Then the monitor is started', () => {

          expect(aMonitorSpy.startCalled()).toEqual(true);
        });

    oclifTest
        .stdout()
        .stderr()
        .do(() => cmd.run(['aThingName', 'aTopicName', '--broker', 'test', '--sensor', 'test']))
        .it('Then the monitor is provided the topic name on start', () => {

          expect(aMonitorSpy.startOptions().topicName).toEqual('aTopicName');
        });

    oclifTest
        .stdout()
        .stderr()
        .do(() => cmd.run(['aThingName', 'aTopicName', '--broker', 'test', '--sensor', 'test']))
        .it('Then the monitor is provided the thing name on start', () => {

          expect(aMonitorSpy.startOptions().thingName).toEqual('aThingName');
        });

    oclifTest
        .stdout()
        .stderr()
        .do(() =>
          cmd.run(['aThingName', 'aTopicName', '--broker', 'test', '--sensor', 'test', '--sensor-period', '10']))
        .it('Then the monitor is provided the monitor options on start', () => {

          expect(aMonitorSpy.startOptions().sensorPeriod).toEqual('10');
        });
  });
});
