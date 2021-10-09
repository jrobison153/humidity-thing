const time = require('../../src/adapters/time');

describe('Time tests', () => {

  describe('When running a timer', () => {

    test('Then a resolved promise is returned', () => {

      const timerPromise = time.timer(1);

      return expect(timerPromise).resolves.toBeUndefined();
    });
  });

  describe('When getting current time', () => {

    test('Then ms time since the epoch is returned', () => {

      const now = Date.now();

      const nowAgain = time.now();

      expect(nowAgain).toBeGreaterThanOrEqual(now);
    });
  });
});
