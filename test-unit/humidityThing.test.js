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

const ARG_V = [
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
  '--sensor-script-path',
  '/some/path/to/sensor.py',
];

const MQTT_ARG_V = [
  'aThingName',
  'aTopicName',
  '--sensor',
  'test',
  '--broker',
  'mqtt',
  '--broker-address',
  'http://broker.com:3000',
  '--tls-key-path',
  '/some/key/path',
  '--tls-cert-path',
  '/some/cert/path',
  '--log-publications-file',
  '/some/path/to/out.log',
  '--sensor-script-path',
  '/some/path/to/sensor.py',
];

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

    const flagExistenceTests = [
      'broker',
      'broker-address',
      'log-publications-file',
      'sensor',
      'sensor-period',
      'sensor-script-path',
      'tls-cert-path',
      'tls-key-path',
    ];

    test.each(flagExistenceTests)('Then the %s flag is defined', (flagName) => {
      expect(flags[flagName]).toBeDefined();
    });

    const flagValidValueTests = [
      [
        'broker',
        ['test', 'mqtt'],
      ],
      [
        'sensor',
        ['test', 'dht22'],
      ],
    ];

    test.each(flagValidValueTests)('Then the valid %s options are set', (flag, expectedOptions) => {

      const validOptions = cmd.flags[flag].options;

      expect(validOptions).toEqual(expectedOptions);
    });

    const flagDefaultValueTests = [
      [
        'broker',
        'mqtt',
      ],
      [
        'sensor',
        'dht22',
      ],
      [
        'sensor-period',
        60000,
      ],
      [
        'sensor-script-path',
        '/usr/local/etc/sensor/sensor.py',
      ],
    ];

    test.each(flagDefaultValueTests)('Then the %s flag is defaulted', (flag, expectedDefaultValue) => {

      expect(flags[flag].default).toEqual(expectedDefaultValue);
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
        .do(() => cmd.run(MQTT_ARG_V))
        .it('Then the monitor factory creates the monitor with the broker address', () => {

          expect(monitorFactory.journalEntry(0)).toMatchObject({
            command: 'create',
            options: {
              brokerAddress: 'http://broker.com:3000',
            },
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
        .do(() => cmd.run(ARG_V))
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
        .do(() => cmd.run(ARG_V))
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
        .do(() => cmd.run(ARG_V))
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
        .do(() => cmd.run(ARG_V))
        .it('Then the monitor factory creates the monitor with the sensorScriptPath provided', () => {

          expect(monitorFactory.journalEntry(0)).toMatchObject({
            options: {
              sensorScriptPath: '/some/path/to/sensor.py',
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
        .it('Then the monitor is provided the sensor period on start', () => {

          expect(aMonitorSpy.startOptions().sensorPeriod).toEqual('10');
        });
  });
});
