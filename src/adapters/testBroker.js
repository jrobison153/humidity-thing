const clone = require('clone');
const fs = require('fs');
const os = require('os');
const path = require('path');
/**
 * Fake broker that can be used for local functional testing.
 *
 * Also acts as a test spy that can be used for unit testing.
 */

const BROKER_ID = 'test';

module.exports = async (options, fileSystem = fs) => {

  const _options = options;
  let _logFilePath;

  const _createTemporaryLogFile = (resolve, reject) => {

    const tempDirPrefix = os.tmpdir();
    const fullPrefix = path.join(tempDirPrefix, 'test-broker-');

    fileSystem.mkdtemp(fullPrefix, (err, dir) => {

      if (err) {
        reject(Error('Failure creating temp directory for test broker log'));
      } else {

        _logFilePath = path.join(dir, 'test_broker.log');
        resolve();
      }
    });
  };

  return {

    connect: async () => {

      return new Promise((resolve, reject) => {

        if (options.logFile) {

          _logFilePath = options.logFile;
          resolve();
        } else {

          _createTemporaryLogFile(resolve, reject);
        }
      });
    },

    options: () => clone(_options),

    id: () => BROKER_ID,

    publish: async (topic, data) => {

      return new Promise((resolve, reject) => {

        const dataToPublish = {topic, data};

        if (!data) {
          dataToPublish.data = '';
        }

        const stringDataToPublish = JSON.stringify(dataToPublish);

        fileSystem.appendFile(_logFilePath, stringDataToPublish, (err) => {

          if (err) {
            reject(new Error(`Failure writing data to file ${_logFilePath}`));
          } else {
            resolve();
          }
        });
      });
    },

    // Below this line there be monsters, well functions that are not part of the interface.

    logFilePath: () => _logFilePath,
  };
};
