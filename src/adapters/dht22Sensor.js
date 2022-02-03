/**
 * A sensor based on execution of a python script
 *
 * TODO: This sensor isn't really dht22 specific, it could really just be the Python3 Executor
 */

const childProcess = require('child_process');
const fs = require('fs');

const MAX_ERR_MSG_LENGTH = 150;
const SENSOR_ID = 'dht22';

/**
 *
 * @param{string} sensorReadScriptPath - file path to the python script that will read the sensor values.
 * The script has a required interface, there are zero inputs and the output must be a single json object written
 * to stdout.
 * @param{Object} process - any implementation that supports the child_process.spawn interface,
 * defaults to node child_process
 * @param{Object} fileSystem - any implementation that supports the node fs.access interface, defaults to
 * node fs
 * @return {Promise<{read: (function(): Promise<unknown>), id: (function(): string)}>}
 */
module.exports = async (sensorReadScriptPath, process = childProcess, fileSystem = fs) => {

  const parseStdOut = (sensorReading, resolve, reject) => {

    try {

      const parsedResult = JSON.parse(sensorReading);
      resolve(parsedResult);

    } catch (e) {
      reject(new Error(`Python script did not return json. Return value was '${sensorReading}'`));
    }
  };

  if (!sensorReadScriptPath) {
    throw new Error('Sensor reading script path is required');
  }

  const pythonScriptExists = await doesFileExist(sensorReadScriptPath, fileSystem);

  if (!pythonScriptExists) {
    throw new Error(`Sensor reading script file ${sensorReadScriptPath} does not exist`);
  }

  const isPythonScriptFileReadable = await isFileReadable(sensorReadScriptPath, fileSystem);

  if (!isPythonScriptFileReadable) {
    throw new Error(`Sensor reading script file ${sensorReadScriptPath} is not readable`);
  }

  return {

    id: () => SENSOR_ID,

    read: () => {

      return new Promise((resolve, reject) => {

        const pythonProcess = process.spawn('python3', [sensorReadScriptPath]);

        let sensorReading = '';
        let stderrText = '';

        pythonProcess.stdout.on('data', (result) => {
          sensorReading = `${sensorReading}${result}`;
        });

        pythonProcess.stderr.on('data', (result) => {
          stderrText = `${stderrText} ${result}`;
        });

        pythonProcess.on('close', (code) => {

          if (code === 0) {

            parseStdOut(sensorReading, resolve, reject);
          } else {

            reject(new Error(stderrText.slice(0, MAX_ERR_MSG_LENGTH)));
          }
        });
      });
    },
  };
};

const doesFileExist = (filePath, fileSystem) => {

  return isAccessOkay(filePath, fileSystem, fileSystem.constants.F_OK);
};

const isFileReadable = (filePath, fileSystem) => {

  return isAccessOkay(filePath, fileSystem, fileSystem.constants.R_OK);
};

const isAccessOkay = (filePath, fileSystem, mode) => {

  return new Promise((resolve) => {

    fileSystem.access(filePath, mode, (err) => {

      if (err) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
};
