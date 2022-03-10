const {Command, flags} = require('@oclif/command');

/**
 * HumidityThingCommand
 */
class HumidityThingCommand extends Command {

  // static factory;

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

    if (!HumidityThingCommand.factory) {
      this.error('An implementation of the MonitorFactory must be provided', {exit: 1} );
    }

    const {flags} = this.parse(HumidityThingCommand);
    const {args} = this.parse(HumidityThingCommand);

    const createOptions = {
      brokerAddress: flags['broker-address'],
      logFile: flags['log-publications-file'],
      sensorScriptPath: flags['sensor-script-path'],
      thingName: args.thingName,
      tlsCertPath: flags['tls-cert-path'],
      tlsKeyPath: flags['tls-key-path'],
      tlsCaPath: flags['tls-ca-path'],
    };

    const monitor = await HumidityThingCommand.factory.create(flags.broker, flags.sensor, createOptions);

    const monitorOptions = {
      sensorPeriod: flags['sensor-period'],
      thingName: args.thingName,
      topicName: args.topicName,
    };

    await monitor.start(monitorOptions);
  }

  /**
   * Allow override of the default factory used to create the monitor
   *
   * @param {MonitorFactory} factory
   */
  static overrideMonitorFactory(factory) {

    this.factory = factory;
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

  'broker-address': flags.string({
    description: 'Address for the message broker, required if mqtt broker is specified',
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

  'sensor-script-path': flags.string({
    default: '/usr/local/etc/sensor/sensor.py',
    description: 'Required path to a Python 3 script that will interact with the dht22 sensor.' +
        'This is a required field if dht22 is selected as the sensor',
  }),

  'tls-cert-path': flags.string({
    description: 'Path to TLS certificate that will be provided to the broker during connection',
  }),

  'tls-key-path': flags.string({
    description: 'Path to TLS key that will be provided to the broker during connection',
  }),

  'tls-ca-path': flags.string({
    description: 'Path to a TLS Certificate Authority (CA) Root Certificate that will be provided' +
        ' to the broker during connection.',
  }),
};

module.exports = HumidityThingCommand;
