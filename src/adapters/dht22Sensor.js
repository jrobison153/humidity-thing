/**
 * Fake sensor that can be used for local functional testing.
 *
 * Also acts as a test spy that can be used for unit testing.
 */

const SENSOR_ID = 'dht22';

module.exports = async () => {

  return {

    id: () => SENSOR_ID,

    read: () => {
      throw new Error('dht22Sensor.read: Implement me please');
    },
  };
};
