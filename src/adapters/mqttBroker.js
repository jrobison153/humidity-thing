/**
 * mqttBroker module.
 * @module adapters/mqttBroker
 */

const mqtt = require('mqtt');
const clone = require('clone');

const BROKER_ID = 'mqtt';

/**
 *
 * @function constructor
 *
 * @param {String} brokerAddress - Address of the mqtt broker
 * @param {Object} options
 * @param {String} options.thingName - name of the IoT thing that is connecting to the MQTT broker
 * @param {String} options.tlsCertPath - path to the tls certificate used for mTLS connection
 * @param {String} options.tlsKeyPath - path to the tls private key used for mTLS connection
 * @param {String} options.tlsCaPath - path to the tls root CA used for mTLS connection
 * @return {Promise<{
 *         connect:(function(): Promise<undefined>),
 *         publish:(function(): undefined),
 *         id: (function(): string),
 *         options: (function(): null|object)
 *         }>}
 */
module.exports = async (brokerAddress, options) => {

  const _options = options;

  const _throwIfParameterIsInvalid = (parameter, name) => {

    if (!parameter) {
      throw new Error(`${name} argument is required.`);
    }
  };

  const _throwIfRequiredOptionIsMissing = (option, name) => {

    if (!option) {
      throw new Error(`${name} option is required.`);
    }
  };

  _throwIfParameterIsInvalid(brokerAddress, 'brokerAddress');

  _throwIfRequiredOptionIsMissing(options.tlsCertPath, 'tlsCertPath');
  _throwIfRequiredOptionIsMissing(options.tlsKeyPath, 'tlsKeyPath');

  return {

    /**
     * Connect to the MQTT broker. Only supports MQTTS connections.
     *
     * @param {mqtt} mqttClient - MQTT client implementation, must adhere to the
     * [mqtt]{@link https://www.npmjs.com/package/mqtt} API interface, this is also the default implementation.
     * @return {Promise}
     */
    connect: async (mqttClient = mqtt) => {

      return new Promise((resolve, reject) => {

        const connectOptions = {
          cert: options.tlsCertPath,
          key: options.tlsKeyPath,
          clientId: options.thingName,
        };

        console.log(connectOptions);
        const client = mqttClient.connect(brokerAddress, connectOptions);

        client.on('connect', () => {

          console.log(`Connected to broker ${brokerAddress}`);
          resolve();
        });

        client.on('error', (err) => {

          console.log(`Error connecting to broker ${brokerAddress}: ${err.toString()}`);
          reject(err);
        });
      });
    },

    /**
     *
     * @return {Object} - a copy of the options object provided during construction
     */
    options: () => clone(_options),

    /**
     *
     * @return {string} - the id of this broker
     */
    id: () => BROKER_ID,

    publish: () => {
      throw new Error('mqttBroker.publish: Implement me!');
    },
  };
};
