const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const aedes = require('aedes')();
const net = require('net');
const mqtt = require('mqtt');
const rimraf = require('rimraf');

const MQTT_BROKER_PORT = 1883;
const MQTT_BROKER_URL = `mqtt://localhost:${MQTT_BROKER_PORT}`;
const TOPIC_NAME = 'myTopic';

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

const startMqttBroker = () => {

  return new Promise((resolve) => {

    const server = net.createServer(aedes.handle);

    server.listen(MQTT_BROKER_PORT, function() {
      console.log('server started and listening on port ', MQTT_BROKER_PORT);
      resolve(server);
    });
  });
};

const connectToTestMqttBroker = (mqttBrokerUrl) => {

  return new Promise((resolve, reject) => {

    const mqttClient = mqtt.connect(mqttBrokerUrl);

    mqttClient.on('connect', () => {
      console.log('Publish Humidity Test MQTT Client Connected to Test Broker');
      resolve(mqttClient);
    });

    mqttClient.on('error', (e) => {
      console.log(`Publish Humidity Test MQTT Client failed to connect to the Test Broker ${e.toString()}`);
      reject(new Error('Failed to connect to Test Broker'));
    });
  });
};

const subscribeToTopic = (mqttClient, topicName) => {

  return new Promise((resolve, reject) => {

    mqttClient.subscribe(topicName, {}, (err) => {

      if (!err) {
        console.log(`Subscription to topic ${topicName} successful`);
        resolve();
      } else {
        reject(new Error(`Subscription to topic ${topicName} with reason ${err.toString()}`));
      }
    });
  });
};

const shutDownMqttBroker = () => {

  return new Promise((resolve) => {

    aedes.close(() => {
      resolve();
    });
  });
};

const shutDownServer = async (mqttBroker) => {

  return new Promise((resolve) => {

    mqttBroker.close(()=>{
      resolve();
    });
  });
};

describe('Publish Humidity Acceptance Tests', () => {

  describe('When thing is running with dht22 sensor and mqtt broker', () => {

    let humidityThingProcess;
    let tempPublicationLogFile;
    let stdOutBuffer;
    let stdErrBuffer;
    let mqttClient;
    let receivedMessages;
    let server;
    let processNeedsToBeKilled;
    let humidityThingProcessExitCode;

    beforeAll(async () => {

      server = await startMqttBroker();

      mqttClient = await connectToTestMqttBroker(MQTT_BROKER_URL);

      await subscribeToTopic(mqttClient, TOPIC_NAME);

      receivedMessages = [];
      mqttClient.on('message', (topic, message) => {

        if (topic === TOPIC_NAME) {
          receivedMessages.push(message);
        }
      });

      tempPublicationLogFile = await _createTempFile();

      const testSensorScriptPath = require.resolve('./scripts/test_sensor_script.py');
      const binLocation = require.resolve('../bin/run');
      const args = [
        'aThing',
        TOPIC_NAME,
        '--broker=mqtt',
        `--broker-address=${MQTT_BROKER_URL}`,
        '--tls-cert-path=/some/bogus/cert/path',
        '--tls-key-path=/some/bogus/key/path',
        '--sensor=dht22',
        `--sensor-script-path=${testSensorScriptPath}`,
        '--sensor-period=10',
        `--log-publications-file=${tempPublicationLogFile}`,
      ];

      stdOutBuffer = '';
      stdErrBuffer = '';

      processNeedsToBeKilled = true;
      humidityThingProcessExitCode = 0;

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

        humidityThingProcessExitCode = code;
        processNeedsToBeKilled = false;
        stdOutBuffer = `${stdOutBuffer}\nHumidity process ended with code ${code}\n`;
      });

      await timer(500);
    });

    afterAll(async () => {

      console.log(stdOutBuffer);
      console.log(stdErrBuffer);

      if (processNeedsToBeKilled) {
        humidityThingProcess.kill('SIGTERM');
      }

      await shutDownMqttBroker();
      await shutDownServer(server);

      const dirToRemove = path.dirname(tempPublicationLogFile);
      await _removeDirSafe(dirToRemove);
    });

    test('Then the command starts w/o issues', () => {

      expect(humidityThingProcessExitCode).toEqual(0);
    });

    test('Then the current humidity value is published', async () => {

      expect(receivedMessages.length).toBeGreaterThan(0);
      expect(receivedMessages[0]['humidity-percentage']).toEqual(54.3);
    });
  });
});
