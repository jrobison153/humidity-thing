const {Command, flags} = require('@oclif/command');
const monitorFactory = require('./adapters/monitorFactory');

/**
 * HumidityThingCommand
 */
class HumidityThingCommand extends Command {

  static args = [
    {
      description: 'Identifier for this thing',
      name: 'thingName',
      required: true,
    },
    {
      description: 'The name of the topic to publish readings to. Will be provided to the broker on publish',
      name: 'topicName',
      required: true,
    },
  ];

  // eslint-disable-next-line require-jsdoc
  async run() {

    const {flags} = this.parse(HumidityThingCommand);
    const {args} = this.parse(HumidityThingCommand);

    const createOptions = {
      logFile: flags['log-publications-file'],
      tlsCertPath: flags['tls-cert-path'],
      tlsKeyPath: flags['tls-key-path'],
    };

    const monitor = await monitorFactory.create(flags.broker, flags.sensor, createOptions);

    const monitorOptions = {
      sensorPeriod: flags['sensor-period'],
      thingName: args.thingName,
      topicName: args.topicName,
    };

    await monitor.start(monitorOptions);
  }
}

HumidityThingCommand.description = `Start the thing`;

HumidityThingCommand.flags = {

  // add --version flag to show CLI version
  'version': flags.version({char: 'v'}),

  // add --help flag to show CLI version
  'help': flags.help({char: 'h'}),

  'broker': flags.string({
    default: 'mqtt',
    description: 'Select a broker implementation, must implement the broker interface',
    options: ['test', 'mqtt'],
  }),

  'log-publications-file': flags.string({
    description: 'Optional absolute path to file to log readings on local file system,' +
      ' useful for debugging should not be used in production due to potential file system issues.' +
      'File will be created if it does not exist',
  }),

  'sensor': flags.string({
    default: 'dht22',
    description: 'Select a sensor implementation, must implement the sensor interface',
    options: ['test', 'dht22'],
  }),

  'sensor-period': flags.string({
    default: 60000,
    description: 'Time between sensor readings in milliseconds',
  }),

  'tls-cert-path': flags.string({
    description: 'Path to TLS certificate that will be provided to the broker during connection',
  }),

  'tls-key-path': flags.string({
    description: 'Path to TLS key that will be provided to the broker during connection',
  }),
};

module.exports = HumidityThingCommand;
