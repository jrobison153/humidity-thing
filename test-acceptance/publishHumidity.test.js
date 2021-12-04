const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const rimraf = require('rimraf');

const timer = (ms) => new Promise((res) => setTimeout(res, ms));

const _createTempFile = () => {

  return new Promise((resolve, reject) => {

    fs.mkdtemp(path.join(os.tmpdir(), 'humidity-'), (err, dir) => {

      if (err) {
        reject(err);
      } else {

        const tempFileName = 'publications.log';
        resolve(path.join(dir, tempFileName));
      }
    });
  });
};

/**
 * Only remove file if it is in the os specific temp directory
 *
 * @param{String} filePath
 * @return {Promise<undefined>}
 * @private
 */
const _removeDirSafe = (filePath) => {

  return new Promise((resolve, reject) => {

    const checkTempFileRegEx = new RegExp(`${os.tmpdir()}.*`);

    if (filePath.match(checkTempFileRegEx)) {

      rimraf(filePath, (err) => {

        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    } else {
      reject(new Error(`File path ${filePath} is not a file in the os specific temp directory. Not removing!`));
    }
  });
};

const readFile = (tempPublicationLogFile) => {

  return new Promise((resolve, reject) => {

    fs.readFile(tempPublicationLogFile, 'utf8', (err, data) => {

      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    });
  });
};

describe('Publish Humidity Acceptance Tests', () => {

  describe('When thing is running', () => {

    let humidityThingProcess;
    let tempPublicationLogFile;
    let stdOutBuffer;
    let stdErrBuffer;

    beforeAll(async () => {


      tempPublicationLogFile = await _createTempFile();

      const testSensorScriptPath = require.resolve('./scripts/test_sensor_script.py');
      const binLocation = require.resolve('../bin/run');
      const args = [
        'aThing',
        'myTopic',
        '--broker=test',
        '--sensor=dht22',
        `--sensor-script-path=${testSensorScriptPath}`,
        '--sensor-period=10',
        `--log-publications-file=${tempPublicationLogFile}`,
      ];

      stdOutBuffer = '';
      stdErrBuffer = '';

      humidityThingProcess = childProcess.spawn(binLocation, args);

      humidityThingProcess.on('error', (err) => {

        stdErrBuffer = `${stdErrBuffer} ${err}`;
      });

      humidityThingProcess.stderr.on('data', (data) => {
        stdErrBuffer = `${stdErrBuffer} ${data}`;
      });

      humidityThingProcess.stdout.on('data', (data) => {
        stdOutBuffer = `${stdOutBuffer} ${data}`;
      });

      humidityThingProcess.on('close', (code) => {

        stdOutBuffer = `\nHumidity process ended with code ${code}\n`;
      });

      await timer(500);
    });

    afterAll(async () => {

      console.log(stdOutBuffer);
      console.log(stdErrBuffer);

      humidityThingProcess.kill('SIGTERM');

      const dirToRemove = path.dirname(tempPublicationLogFile);
      await _removeDirSafe(dirToRemove);
    });

    test('Then the current humidity value is published', async () => {

      const rawPublishedData = await readFile(tempPublicationLogFile);

      expect(rawPublishedData).toMatch(/.*"humidity-percentage":\s*54\.3.*/);
    });
  });
});
