const clone = require('clone');

const BROKER_ID = 'mqtt';

/**
 *
 * @param{Object} options
 *  tlsCertPath - Required - path to the tls certificate used for mTLS connection
 *  tlsKeyPath - Required - path tot he tls private key used for mTLS connection
 * @return {Promise<{id: (function(): string), createOptions: (function(): null|*)}>}
 */
module.exports = async (options) => {

  const _options = options;

  return {

    connect: () => {
      throw new Error('mqttBroker.connect: Implement me!');
    },

    createOptions: () => clone(_options),

    id: () => BROKER_ID,

    publish: () => {
      throw new Error('mqttBroker.publish: Implement me!');
    },
  };
};
