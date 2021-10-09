module.exports = () => {

  let _spawnCommand;
  let _spawnArgs;
  let _callbacks;

  return {

    spawn: (command, args) => {

      _spawnCommand = command;
      _spawnArgs = args;
      _callbacks = [];

      return {

        stdout: {
          on: (anEvent, cb) => {

            if (anEvent === 'data') {
              _callbacks['stdout'] = cb;
            }
          },
        },

        stderr: {
          on: (anEvent, cb) => {

            if (anEvent === 'data') {
              _callbacks['stderr'] = cb;
            }
          },
        },

        on: (anEvent, cb) => {
          _callbacks[anEvent] = cb;
        },
      };
    },

    close: (code) => _callbacks['close'](code),

    spawnCommand: () => _spawnCommand,

    spawnArgs: (argIndex) => _spawnArgs[argIndex],

    stderr: (data) => _callbacks['stderr'](data),

    stdout: (data) => _callbacks['stdout'](data),
  };
};
