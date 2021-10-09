const clone = require('clone');
const os = require('os');
const path = require('path');
const testBroker = require('../../src/adapters/testBroker');

const fsSpy = () => {

  let _mkdtempPrefix;
  let _appendFileData;
  let _appendFilePath;
  let _shouldFailAppend = false;
  let _shouldFailMdtmp = false;

  return {

    mkdtemp: (prefix, cb) => {

      if (_shouldFailMdtmp) {

        cb(new Error('Failing for test purposes'));
      } else {

        _mkdtempPrefix = prefix;
        cb(null, `${prefix}12345`);
      }
    },

    appendFile: (path, data, cb) => {

      if (_shouldFailAppend) {
        cb(new Error('Failing for test purposes'));
      } else {

        _appendFileData = data;
        _appendFilePath = path;
        cb(null);
      }
    },

    appendFileData: () => _appendFileData,

    appendFilePath: () => _appendFilePath,

    failNextMkdtmp: () => {
      _shouldFailMdtmp = true;
    },

    failNextAppend: () => {
      _shouldFailAppend = true;
    },

    mkdtempPrefix: () => _mkdtempPrefix,
  };
};

describe('Test Broker Tests', () => {

  let aFileSystemSpy;
  let broker;

  beforeEach(() => {

    aFileSystemSpy = fsSpy();
  });

  describe('When connecting', () => {

    describe('And log file path not specified', () => {

      beforeEach(async () => {

        broker = await testBroker({}, aFileSystemSpy);
      });

      test('Then new random temp directory is created in the OS temp location with the correct postfix', async () => {

        const tempDirLocation = os.tmpdir();
        const dirMatchRegex = new RegExp(`^${tempDirLocation}/test-broker-.*`);

        await broker.connect();

        expect(aFileSystemSpy.mkdtempPrefix()).toMatch(dirMatchRegex);
      });

      test('Then the random temp directory is set as the official log path', async () => {

        const expectedPath = path.join(os.tmpdir(), 'test-broker-12345', 'test_broker.log');

        await broker.connect();

        expect(broker.logFilePath()).toEqual(expectedPath);
      });

      describe('And there is an error creating the temporary directory', () => {

        test('Then the return promise is rejected', () => {

          aFileSystemSpy.failNextMkdtmp();

          const connectPromise = broker.connect();

          return expect(connectPromise)
              .rejects.toThrowError(/.*Failure creating temp directory for test broker log.*/);
        });
      });
    });

    describe('And log file path is specified', () => {

      test('Then the provided path is set as the official log path', async () => {

        const logFile = '/some/path/out.log';
        const options = {
          logFile,
        };

        broker = await testBroker(options, aFileSystemSpy);

        await broker.connect();

        expect(broker.logFilePath()).toEqual(logFile);
      });
    });
  });

  describe('When publishing', () => {

    const data = {
      foo: 'bar',
    };

    const logFile = '/some/path/out.log';

    beforeEach(async () => {

      const options = {
        logFile,
      };

      broker = await testBroker(options, aFileSystemSpy);

      await broker.connect();
    });

    test('Then the correct log file is appended to', async () => {

      await broker.publish(data);

      expect(aFileSystemSpy.appendFilePath()).toEqual('/some/path/out.log');
    });

    test('Then the topic name is published alongside the data', async () => {

      await broker.publish('myTopic', 'hi');

      const theTopic = JSON.parse(aFileSystemSpy.appendFileData()).topic;

      expect(theTopic).toEqual('myTopic');
    });

    describe('And there is an error publishing', () => {

      test('Then the promise is rejected', () => {

        aFileSystemSpy.failNextAppend();

        const publishPromise = broker.publish(data);

        const errRegEx = new RegExp(`.*Failure writing data to file ${logFile}.*`);

        return expect(publishPromise).rejects.toThrowError(errRegEx);
      });
    });

    describe('And the data to publish is undefined type', () => {

      test('Then an empty string is appended to the log file', async () => {

        await broker.publish(undefined);

        const publishedData = JSON.parse(aFileSystemSpy.appendFileData()).data;

        expect(publishedData).toEqual('');
      });
    });

    describe('And the data to publish is an object ', () => {

      test('Then the data is appended to the log file', async () => {

        await broker.publish('myTopic', data);

        const publishedData = JSON.parse(aFileSystemSpy.appendFileData()).data;

        expect(publishedData).toEqual(data);
      });
    });

    describe('And the data to publish is a string ', () => {

      test('Then the data is appended to the log file', async () => {

        const data = 'hi I am some data';

        await broker.publish('myTopic', data);

        const publishedData = JSON.parse(aFileSystemSpy.appendFileData()).data;

        expect(publishedData).toEqual(data);
      });
    });
  });

  describe('When options are provided', () => {

    test('Then a copy of the options can be retrieved', async () => {

      const originalOptions = {
        a: 'b',
        c: 'd',
      };

      const originalOptionsCopy = clone(originalOptions);

      broker = await testBroker(originalOptions, aFileSystemSpy);

      const theOptions = broker.options();

      theOptions.a = 'attempting to change value on original object';

      const retrievedOptions = broker.options();

      expect(originalOptionsCopy).toEqual(retrievedOptions);
    });
  });

  describe('When retrieving the id', () => {

    test('Then it is returned', async () => {

      broker = await testBroker({}, aFileSystemSpy);

      expect(broker.id()).toEqual('test');
    });
  });
});
