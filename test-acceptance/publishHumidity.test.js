const childProcess = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const aedes = require('aedes')();
const tls = require('tls');
const mqtt = require('mqtt');
const rimraf = require('rimraf');
const {v4: uuidv4} = require('uuid');

const MQTT_BROKER_PORT = 1883;
const MQTT_BROKER_URL = `mqtts://localhost:${MQTT_BROKER_PORT}`;
const TOPIC_NAME = 'myTopic';

const timer = (ms) => new Promise((res) => setTimeout(res, ms));

const _createTempDir = () => {

  return new Promise((resolve, reject) => {

    fs.mkdtemp(path.join(os.tmpdir(), 'humidity-'), (err, dir) => {

      if (err) {
        reject(err);
      } else {
        resolve(dir);
      }
    });
  });
};

const _createTempFile = async (fileName) => {

  const tempDir = await _createTempDir();
  const tempFile = path.join(tempDir, fileName);

  return tempFile;
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

const startMqttBroker = (tlsCertFile, tlsKeyFile) => {

  return new Promise((resolve) => {

    const options = {
      key: fs.readFileSync(tlsKeyFile),
      cert: fs.readFileSync(tlsCertFile),
    };

    const server = tls.createServer(options, aedes.handle);

    server.listen(MQTT_BROKER_PORT, function() {
      console.log('server started and listening on port ', MQTT_BROKER_PORT);
      resolve(server);
    });
  });
};

const connectToTestMqttBroker = (mqttBrokerUrl, keyFile, certFile) => {

  return new Promise((resolve, reject) => {

    const options = {
      cert: certFile,
      key: keyFile,
    };

    const mqttClient = mqtt.connect(mqttBrokerUrl, options);

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

const _generateCsr = (tempDir) => {

  const outCsrFile = path.join(tempDir, `${uuidv4()}.csr`);
  const outPrivateKeyFile = path.join(tempDir, `${uuidv4()}.key`);
  const OPENSSL = 'openssl';
  const OPENSSL_CSR_CREATE_ARGS = [
    'req',
    '-new',
    '-newkey',
    'rsa:2048',
    '-nodes',
    '-keyout',
    outPrivateKeyFile,
    '-out',
    outCsrFile,
    '-subj',
    '/C=US/ST=NH/L=Portsmouth/O=JR/CN=humidity-test',
  ];

  return new Promise((resolve, reject) => {

    const openssl = childProcess.spawn(OPENSSL, OPENSSL_CSR_CREATE_ARGS);
    let stderrText = '';

    openssl.stderr.on('data', (data) => {
      stderrText = `${stderrText} ${data}`;
    });

    openssl.on('close', (code) => {

      if (code === 0) {

        resolve({
          keyFile: outPrivateKeyFile,
          csrFile: outCsrFile,
        });
      } else {
        reject(new Error(`Unable to create CSR, root cause is: ${stderrText}\n`));
      }
    });
  });
};

const _generateCertificate = async (tempDir, keyFile, csrFile) => {

  const outCertFile = path.join(tempDir, `${uuidv4()}.crt`);
  const OPENSSL = 'openssl';
  const OPENSSL_CSR_CREATE_ARGS = [
    'x509',
    '-signkey',
    keyFile,
    '-in',
    csrFile,
    '-req',
    '-days',
    '1',
    '-out',
    outCertFile,
  ];

  return new Promise((resolve, reject) => {

    const openssl = childProcess.spawn(OPENSSL, OPENSSL_CSR_CREATE_ARGS);
    let stderrText = '';

    openssl.stderr.on('data', (data) => {
      stderrText = `${stderrText} ${data}`;
    });

    openssl.on('close', (code) => {

      if (code === 0) {

        resolve(outCertFile);
      } else {
        reject(new Error(`Unable to create certificate, root cause is: ${stderrText}\n`));
      }
    });
  });

};

const _generateCertificateAuthority = async (tempTlsFileDir) => {

  const outCaCert = path.join(tempTlsFileDir, `${uuidv4()}.crt`);
  const outCaKey = path.join(tempTlsFileDir, `${uuidv4()}.key`);

  const OPENSSL = 'openssl';
  const OPENSSL_CSR_CREATE_ARGS = [
    'req',
    '-x509',
    '-nodes',
    '-sha256',
    '-days',
    '1',
    '-newkey',
    'rsa:2048',
    '-keyout',
    outCaKey,
    '-out',
    outCaCert,
    '-subj',
    '/C=US/ST=NH/L=Portsmouth/O=JR/CN=mqtt-server',
  ];

  return new Promise((resolve, reject) => {

    const openssl = childProcess.spawn(OPENSSL, OPENSSL_CSR_CREATE_ARGS);
    let stderrText = '';

    openssl.stderr.on('data', (data) => {
      stderrText = `${stderrText} ${data}`;
    });

    openssl.on('close', (code) => {

      if (code === 0) {

        resolve({
          keyFile: outCaKey,
          certFile: outCaCert,
        });
      } else {
        reject(new Error(`Unable to create certificate, root cause is: ${stderrText}\n`));
      }
    });
  });
};

const _generateCaSignedCertificate = async (tempTlsFileDir, csr, caKey, caCert) => {

  const outCert = path.join(tempTlsFileDir, `${uuidv4()}.crt`);
  const configFile = require.resolve('./certificates/domain.ext');

  const OPENSSL = 'openssl';
  const OPENSSL_CSR_CREATE_ARGS = [
    'x509',
    '-req',
    '-CA',
    caCert,
    '-CAkey',
    caKey,
    '-in',
    csr,
    '-out',
    outCert,
    '-days',
    1,
    '-CAcreateserial',
    '-extfile',
    configFile,
  ];

  return new Promise((resolve, reject) => {

    const openssl = childProcess.spawn(OPENSSL, OPENSSL_CSR_CREATE_ARGS);
    let stderrText = '';

    openssl.stderr.on('data', (data) => {
      stderrText = `${stderrText} ${data}`;
    });

    openssl.on('close', (code) => {

      if (code === 0) {

        resolve(outCert);
      } else {
        reject(new Error(`Unable to create certificate, root cause is: ${stderrText}\n`));
      }
    });
  });
};

describe('Publish Humidity Acceptance Tests', () => {

  describe('When thing is running with dht22 sensor and mqtt broker', () => {

    let humidityThingProcess;
    let tempPublicationLogFile;
    let tempTlsFileDir;
    let stdOutBuffer;
    let stdErrBuffer;
    let mqttClient;
    let receivedMessages;
    let mqttServer;
    let processNeedsToBeKilled;
    let humidityThingProcessExitCode;

    beforeAll(async () => {

      tempTlsFileDir = await _createTempDir();

      const {keyFile: caKeyFile, certFile: caCertFile} = await _generateCertificateAuthority(tempTlsFileDir);
      const {keyFile: serverKeyFile, csrFile: serverCsrFile} = await _generateCsr(tempTlsFileDir);
      const serverCertFile = await _generateCaSignedCertificate(tempTlsFileDir, serverCsrFile, caKeyFile, caCertFile);

      mqttServer = await startMqttBroker(serverCertFile, serverKeyFile);

      const {keyFile: clientKeyFile, csrFile: clientCsrFile} = await _generateCsr(tempTlsFileDir);
      const clientCertFile = await _generateCertificate(tempTlsFileDir, clientKeyFile, clientCsrFile);

      console.log(`caKeyFile: ${caKeyFile}
      caCertFile: ${caCertFile}
      serverKeyFile: ${serverKeyFile}
      serverCsrFile: ${serverCsrFile}
      serverCertFile: ${serverCertFile}
      clientKeyFile: ${clientKeyFile}
      clientCsrFile: ${clientCsrFile}
      clientCertFile: ${clientCertFile}`);

      mqttClient = await connectToTestMqttBroker(MQTT_BROKER_URL, clientKeyFile, clientCertFile);

      await subscribeToTopic(mqttClient, TOPIC_NAME);

      receivedMessages = [];
      mqttClient.on('message', (topic, message) => {

        if (topic === TOPIC_NAME) {
          receivedMessages.push(message);
        }
      });

      tempPublicationLogFile = await _createTempFile('publications.log');

      const testSensorScriptPath = require.resolve('./scripts/test_sensor_script.py');
      const binLocation = require.resolve('../bin/run');
      const args = [
        'aThing',
        TOPIC_NAME,
        '--broker=mqtt',
        `--broker-address=${MQTT_BROKER_URL}`,
        `--tls-cert-path=${clientCertFile}`,
        `--tls-key-path=${clientKeyFile}`,
        `--tls-ca-path=${caCertFile}`,
        '--sensor=dht22',
        `--sensor-script-path=${testSensorScriptPath}`,
        '--sensor-period=10',
        `--log-publications-file=${tempPublicationLogFile}`,
      ];

      stdOutBuffer = '';
      stdErrBuffer = '';

      processNeedsToBeKilled = true;
      humidityThingProcessExitCode = -1;

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

      humidityThingProcess.kill('SIGTERM');
    });

    afterAll(async () => {

      console.log(stdOutBuffer);
      console.log(stdErrBuffer);

      if (processNeedsToBeKilled) {
        humidityThingProcess.kill('SIGTERM');
      }

      await shutDownMqttBroker();
      await shutDownServer(mqttServer);

      const logDir = path.dirname(tempPublicationLogFile);
      await _removeDirSafe(logDir);
      await _removeDirSafe(tempTlsFileDir);
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
