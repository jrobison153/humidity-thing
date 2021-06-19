const BROKER_ID = 'mqtt';

module.exports = async () => {

  return {

    id: () => BROKER_ID,
  };
};
