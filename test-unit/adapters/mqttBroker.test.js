const mqttBroker = require('../../src/adapters/mqttBroker');
const mqttClientSpy = require('../../test-doubles/mqttClientSpy');

describe('MQTT Broker Tests', () => {

  const brokerAddress = 'mqtts://blah';
  const tlsCertPath = 'bogus/cert/path';
  const tlsKeyPath = 'bogus/key/path';
  const thingName = 'a-test-thing';

  let brokerCreationOptions;
  let anMqttClientSpy;

  beforeEach(() => {

    brokerCreationOptions = {
      tlsCertPath,
      tlsKeyPath,
      thingName,
    };
  });

  describe('When creating the broker', () => {

    describe('And the required brokerAddress argument is missing', () => {

      test('Then an error is thrown', () => {

        const brokerCreationPromise = mqttBroker();
        return expect(brokerCreationPromise).rejects.toThrowError('brokerAddress argument is required.');
      });
    });

    describe('And the required tlsCertPath option is missing', () => {

      test('Then an error is thrown', () => {

        delete brokerCreationOptions.tlsCertPath;

        const brokerCreationPromise = mqttBroker('mqtts://some.address.com', brokerCreationOptions);

        return expect(brokerCreationPromise).rejects.toThrowError('tlsCertPath option is required.');
      });
    });

    describe('And the required tlsKeyPath option is missing', () => {

      test('Then an error is thrown', () => {

        delete brokerCreationOptions.tlsKeyPath;

        const brokerCreationPromise = mqttBroker('mqtts://some.address.com', brokerCreationOptions);

        return expect(brokerCreationPromise).rejects.toThrowError('tlsKeyPath option is required.');
      });
    });
  });

  describe('When connecting to the broker', () => {

    beforeEach(async () => {

      anMqttClientSpy = mqttClientSpy();

      const broker = await mqttBroker(brokerAddress, brokerCreationOptions);
      await broker.connect(anMqttClientSpy);
    });

    test('Then the broker address is provided to the mqtt client', async () => {

      expect(anMqttClientSpy.connectBrokerAddress()).toEqual(brokerAddress);
    });

    test('Then the tls certificate path is provided as an option', () => {

      expect(anMqttClientSpy.connectTlsCertPath()).toEqual(tlsCertPath);
    });

    test('Then the tls key path is provided as an option', () => {

      expect(anMqttClientSpy.connectTlsKeyPath()).toEqual(tlsKeyPath);
    });

    test('Then the mqtt broker servername is provided as an option', () => {

      expect(anMqttClientSpy.connectTlsKeyPath()).toEqual(tlsKeyPath);
    });

    test('Then the clientId is provided as an option', () => {

      expect(anMqttClientSpy.connectClientId()).toEqual(thingName);
    });
  });

  describe('When broker connection fails', () => {

    test('Then an error is thrown', async () => {

      anMqttClientSpy = mqttClientSpy();

      const connectFailMessage = 'Failing mqtts connect for test purposes';
      anMqttClientSpy.failConnectWithMessage(connectFailMessage);

      const broker = await mqttBroker(brokerAddress, brokerCreationOptions);

      const connectionDonePromise = broker.connect(anMqttClientSpy);

      return expect(connectionDonePromise).rejects.toThrowError(connectFailMessage);
    });
  });
});
