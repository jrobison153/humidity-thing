const pubSub = require('./pubSubFake');

describe('Pub Sub Fake Tests', () => {

  let connection;
  beforeEach(() => {

    connection = pubSub();
  });

  describe('When subscribed to a topic', () => {

    test('Then notifications are received when there are publications', () => {

      let wasCalled = false;
      connection.subscribe('foo', () => {

        wasCalled = true;
      });

      connection.publish('foo', 'hello');

      expect(wasCalled).toEqual(true);
    });

    test('Then published data is provided to subscribers', () => {

      const expectedData = {hello: 'world'};
      let actualData = '';

      connection.subscribe('foo', (data) => {
        actualData = data;
      });

      connection.publish('foo', expectedData);

      expect(actualData).toEqual(expectedData);
    });

    describe('And there are multiple subscribers to the same topic', () => {

      test('Then notifications are received when there are publications', () => {

        let callCount = 0;

        const callbackFunc = () => {
          callCount += 1;
        };

        connection.subscribe('foo', callbackFunc);
        connection.subscribe('foo', callbackFunc);
        connection.subscribe('foo', callbackFunc);

        connection.publish('foo', 'hello');

        expect(callCount).toEqual(3);
      });
    });
  });

  describe('When publishing to a topic', () => {

    describe('And the topic does not have any subscribers', () => {

      test('Then there are no errors', () => {

        connection.publish('no-sub-topic', 'some data');
        expect(true).toEqual(true);
      });
    });
  });

  describe('When not subscribed to a topic', () => {

    test('Then notifications are not received on publications', () => {

      let wasNotified = false;

      connection.subscribe('foo', () => {

        wasNotified = true;
      });

      connection.publish('bar', 'some data');

      expect(wasNotified).toEqual(false);
    });
  });
});
