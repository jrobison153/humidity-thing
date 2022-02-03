const sensor = require('../../src/adapters/dht22Sensor');
const childProcessSpy = require('../../test-doubles/childProcessSpy');
const fileSystemStub = require('../../test-doubles/fileSystemStub');

const SUCCESS_CODE = 0;
const ERROR_CODE = 1;
const dummyReading = `{"dummy": "reading", "foo": "bar", "alpha": "omega", "code": 123456}`;

describe('dht22 Sensor Tests', () => {

  let aChildProcessSpy;
  let sensorReading;
  let aFileSystemStub;

  beforeEach(() => {
    aChildProcessSpy = childProcessSpy();
    aFileSystemStub = fileSystemStub();
  });

  describe('When initializing the sensor', () => {

    describe('And dht22 python script file path is not provided', () => {

      test('Then an error is thrown', () => {

        const sensorInitPromise = sensor();
        return expect(sensorInitPromise).rejects.toThrowError(/.*Sensor reading script path is required.*/);
      });
    });

    describe('And the dht22 python script file path does not exist', () =>{

      test('Then an error is thrown', () => {

        const sensorInitPromise = sensor(
            '/some/bogus/path/to/fail/on/script.py',
            aChildProcessSpy,
            aFileSystemStub);

        return expect(sensorInitPromise)
            .rejects
            .toThrowError(
                /.*Sensor reading script file \/some\/bogus\/path\/to\/fail\/on\/script.py does not exist.*/,
            );
      });
    });

    describe('And the dht22 python script is not readable', () =>{

      test('Then an error is thrown', ()=>{

        const sensorInitPromise = sensor(
            '/path/to/script/with/read-error/script.py',
            aChildProcessSpy,
            aFileSystemStub);

        return expect(sensorInitPromise)
            .rejects
        // eslint-disable-next-line max-len
            .toThrowError(/.*Sensor reading script file \/path\/to\/script\/with\/read-error\/script.py is not readable.*/);
      });
    });
  });

  describe('When taking a reading', () => {

    const scriptPath = '/a/path/to/the/dht22/script.py';

    beforeEach(async (done) => {

      const aSensor = await sensor(scriptPath, aChildProcessSpy, aFileSystemStub);

      aSensor.read().then((reading) => {

        sensorReading = reading;
        done();
      });

      const fragmentOneStart = 0;
      const fragmentOneEnd = dummyReading.length / 3;
      const dummyReadingFragmentOne = dummyReading.substring(fragmentOneStart, fragmentOneEnd);

      const fragmentTwoStart = fragmentOneEnd;
      const fragmentTwoEnd = fragmentTwoStart + (dummyReading.length / 3);
      const dummyReadingFragmentTwo = dummyReading.substring(fragmentTwoStart, fragmentTwoEnd);

      const fragmentThreeStart = fragmentTwoEnd;
      const fragmentThreeEnd = fragmentThreeStart + dummyReading.length;
      const dummyReadingFragmentThree = dummyReading.substring(fragmentThreeStart, fragmentThreeEnd);


      aChildProcessSpy.stdout(dummyReadingFragmentOne);
      aChildProcessSpy.stdout(dummyReadingFragmentTwo);
      aChildProcessSpy.stdout(dummyReadingFragmentThree);
      aChildProcessSpy.close(SUCCESS_CODE);
    });

    test('Then the python command is run', () => {

      expect(aChildProcessSpy.spawnCommand()).toEqual('python3');
    });

    test('Then the dht22 python script is passed as the argument', () => {

      expect(aChildProcessSpy.spawnArgs(0)).toEqual(scriptPath);
    });

    test('Then the result of the sensor reading is returned', () => {

      expect(sensorReading).toEqual(JSON.parse(dummyReading));
    });

    describe('And the python script fails to run', () => {

      test('Then an error is thrown', async (done) => {

        const aSensor = await sensor(scriptPath, aChildProcessSpy, aFileSystemStub);

        aSensor.read().catch((e) => {

          done();
        });

        aChildProcessSpy.close(ERROR_CODE);
      });

      test('Then the error message contains stderr details', async (done) => {

        const aSensor = await sensor(scriptPath, aChildProcessSpy, aFileSystemStub);
        const stderrMsg = 'ERROR: some testing failure message';

        aSensor.read().catch((e) => {

          const exp = new RegExp(`.*${stderrMsg}.*`);
          expect(e.toString()).toMatch(exp);

          done();
        });

        aChildProcessSpy.stderr(stderrMsg);
        aChildProcessSpy.close(ERROR_CODE);
      });

      test('Then error message is truncated to 150 characters', async (done) => {

        const aSensor = await sensor(scriptPath, aChildProcessSpy, aFileSystemStub);
        const stderrMsg = `ERROR: some testing failure message really long 
        asdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssss
        asdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssss
        asdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssss
        asdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssss
        asdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssss
        asdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssss
        asdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssss
        asdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssss
        asdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssss
        asdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssssasdfdddssss`;

        aSensor.read().catch((e) => {

          expect(e.message.length).toEqual(150);

          done();
        });

        aChildProcessSpy.stderr(stderrMsg);
        aChildProcessSpy.close(ERROR_CODE);
      });
    });

    describe('And the python script does not return json', () => {

      test('Then an error is thrown', async (done) => {

        const aSensor = await sensor(scriptPath, aChildProcessSpy, aFileSystemStub);

        const actualStdout = 'I am most definitely not JSON';

        aSensor.read().catch((e) => {

          const exp = new RegExp(`.*Python script did not return json. Return value was '${actualStdout}'.*`);
          expect(e.toString()).toMatch(exp);
          done();
        });

        aChildProcessSpy.stdout(actualStdout);
        aChildProcessSpy.close(SUCCESS_CODE);
      });
    });
  });

  describe('When the id is checked', () => {

    it('Then the correct id is returned', async () => {

      const aSensor = await sensor('/foo/bar', aChildProcessSpy, aFileSystemStub);

      const sensorId = aSensor.id();

      expect(sensorId).toEqual('dht22');
    });
  });
});
