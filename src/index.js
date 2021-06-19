const {Command, flags} = require('@oclif/command');
const monitorFactory = require('./adapters/monitorFactory');

/**
 * HumidityThingCommand
 */
class HumidityThingCommand extends Command {

  // eslint-disable-next-line require-jsdoc
  async run() {

    const {flags} = this.parse(HumidityThingCommand);

    const monitor = await monitorFactory.create(flags.broker, flags.sensor);

    monitor.start();
  }
}

HumidityThingCommand.description = `Describe the command here
...
Extra documentation goes here
`;

HumidityThingCommand.flags = {

  // add --version flag to show CLI version
  version: flags.version({char: 'v'}),

  // add --help flag to show CLI version
  help: flags.help({char: 'h'}),

  broker: flags.string({
    default: 'mqtt',
    options: ['test', 'mqtt'],
  }),

  sensor: flags.string({
    default: 'dht22',
    options: ['test', 'dht22'],
  }),
};

module.exports = HumidityThingCommand;
