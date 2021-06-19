const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const rimraf = require('rimraf');

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

    beforeAll(async () => {

      tempPublicationLogFile = await _createTempFile();

      const binLocation = require.resolve('../bin/run');
      const args = [
        '--broker',
        'test',
        '--sensor',
        'test',
        '--log-publications-file',
        tempPublicationLogFile,
      ];

      humidityThingProcess = childProcess.spawn(binLocation, args);

      humidityThingProcess.stderr.on('data', (data) => {
        console.log(`Humidity process stderr: ${data}`);
      });

      humidityThingProcess.stdout.on('data', (data) => {
        console.log(`Humidity process stdout: ${data}`);
      });

      humidityThingProcess.on('close', (code) => {

        console.log(`Humidity process ended with code ${code}`);
      });
    });

    afterAll(async () => {

      humidityThingProcess.kill('SIGTERM');

      const dirToRemove = path.dirname(tempPublicationLogFile);
      await _removeDirSafe(dirToRemove);
    });

    test('Then the current humidity value is published', async () => {

      const expectedHumidity = 54.3;

      const publishedData = await readFile(tempPublicationLogFile);

      expect(publishedData[0].humidity).toEqual(expectedHumidity);
    });
  });
});
