module.exports = () => {

  const STUB_TIME = '1234567890';

  let _waitPeriod;

  return {

    timer: (ms) => {

      _waitPeriod = ms;

      return new Promise((res) => setTimeout(res, ms));
    },

    now: () => STUB_TIME,

    waitPeriod: () => _waitPeriod,
  };
};
