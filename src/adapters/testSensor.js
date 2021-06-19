/**
 * Fake sensor that can be used for local functional testing.
 *
 * Also acts as a test spy that can be used for unit testing.
 */

const SENSOR_ID = 'test';

module.exports = async () => {

  return {

    id: () => SENSOR_ID,
  };
};
