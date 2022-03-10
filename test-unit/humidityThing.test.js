const oclifTest = require('@oclif/test').test;
const cmd = require('../src/index');
const monitorFactorySpy = require('../test-doubles/monitorFactorySpy');

const ARG_V = [
  'aThingName',
  'aTopicName',
  '--sensor',
  'test',
  '--broker',
  'test',
  '--tls-key-path',
  '/some/key/path',
  '--tls-cert-path',
  '/some/cert/path',
  '--tls-ca-path',
  '/some/ca/path',
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

  let flags;
  let args;

  beforeAll(() => {

    args = cmd.args;
    flags = cmd.flags;
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
      'tls-ca-path',
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

    describe('And the monitor factory is not provided', () => {

      oclifTest
          .stdout()
          .stderr()
          .do(() => cmd.run([]))
          .exit(1)
          .it('Then an error is returned', (ctx) => {
          });
    });

    describe('And a monitor factory has been provided', () => {

      let theMonitorFactorySpy;

      beforeAll(() => {

        theMonitorFactorySpy = monitorFactorySpy();

        cmd.overrideMonitorFactory(theMonitorFactorySpy);
      });

      oclifTest
          .stdout()
          .stderr()
          .do(() => cmd.run(ARG_V))
          .it('Then the monitor factory is passed the specified broker', () => {

            expect(theMonitorFactorySpy.brokerId()).toEqual('test');
          });

      oclifTest
          .stdout()
          .stderr()
          .do(() => cmd.run(ARG_V))
          .it('Then the monitor factory is passed the specified sensor', () => {

            expect(theMonitorFactorySpy.sensorId()).toEqual('test');
          });

      const providedOptionValueTests = [
        [
          'tlsCertPath',
          '/some/cert/path',
        ],
        [
          'tlsKeyPath',
          '/some/key/path',
        ],
        [
          'tlsCaPath',
          '/some/ca/path',
        ],
        [
          'logFile',
          '/some/path/to/out.log',
        ],
        [
          'sensorScriptPath',
          '/some/path/to/sensor.py',
        ],
        [
          'thingName',
          'aThingName',
        ],
      ];

      test.each(providedOptionValueTests)('Then the monitor factory is passed the %s as an option',
          (optionName, expectedOptionValue) => {

            expect(theMonitorFactorySpy.options()[optionName]).toEqual(expectedOptionValue);
          });

      oclifTest
          .stdout()
          .stderr()
          .do(() => cmd.run(MQTT_ARG_V))
          .it('Then the monitor factory is passed the broker address as an option', () => {

            expect(theMonitorFactorySpy.options().brokerAddress).toEqual('http://broker.com:3000');
          });

      oclifTest
          .stdout()
          .stderr()
          .do(() => cmd.run(['aThingName', 'aTopicName', '--broker', 'test', '--sensor', 'test']))
          .it('Then the monitor is started', () => {

            expect(theMonitorFactorySpy.monitorSpy().startCalled()).toEqual(true);
          });

      oclifTest
          .stdout()
          .stderr()
          .do(() => cmd.run(['aThingName', 'aTopicName', '--broker', 'test', '--sensor', 'test']))
          .it('Then the monitor is provided the topic name on start', () => {

            expect(theMonitorFactorySpy.monitorSpy().startOptions().topicName).toEqual('aTopicName');
          });

      oclifTest
          .stdout()
          .stderr()
          .do(() => cmd.run(['aThingName', 'aTopicName', '--broker', 'test', '--sensor', 'test']))
          .it('Then the monitor is provided the thing name on start', () => {

            expect(theMonitorFactorySpy.monitorSpy().startOptions().thingName).toEqual('aThingName');
          });

      oclifTest
          .stdout()
          .stderr()
          .do(() =>
            cmd.run(['aThingName', 'aTopicName', '--broker', 'test', '--sensor', 'test', '--sensor-period', '10']))
          .it('Then the monitor is provided the sensor period on start', () => {

            expect(theMonitorFactorySpy.monitorSpy().startOptions().sensorPeriod).toEqual('10');
          });
    });
  });
});
