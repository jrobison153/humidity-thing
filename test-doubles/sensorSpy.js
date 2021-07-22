module.exports = () => {

  let _dataVal = 0;
  let _failReads = false;
  const _allReadings = [];

  return {

    read: async () => {

      if (!_failReads) {

        const reading = {num: _dataVal};
        _allReadings.push(reading);

        _dataVal += 1;

        return reading;
      } else {
        throw new Error('Failing read for test purposes');
      }
    },

    allReadings: () => _allReadings,

    failReads: () => {
      _failReads = true;
    },
  };
};
