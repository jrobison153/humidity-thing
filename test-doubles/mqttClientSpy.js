module.exports = () => {

  const aClientSpy = (shouldFailConnect, connectionFailMsg) => {

    const _callBacks = {
      connect: undefined,
      error: undefined,
    };

    return {
      on: (event, cb) => {

        if (event === 'connect') {
          _callBacks.connect = cb;
        } else if (event === 'error') {
          _callBacks.error = cb;
        }
      },

      start: function() {

        setInterval(this._generateEvents, 10);

        return this;
      },

      _generateEvents: () => {

        if (shouldFailConnect) {

          if (_callBacks.error) {
            _callBacks.error(new Error(connectionFailMsg));
          }
        } else {

          if (_callBacks.connect) {
            _callBacks.connect();
          }
        }
      },
    };
  };

  let _spiedBrokerAddress;
  let _spiedTlsCertPath;
  let _spiedTlsKeyPath;
  let _clientSpy;
  let _spiedClientId;
  let _shouldFailConnect = false;
  let _connectionFailMsg = '';

  return {

    connect: (brokerAddress, options) => {

      _spiedBrokerAddress = brokerAddress;
      _spiedTlsCertPath = options.cert;
      _spiedTlsKeyPath = options.key;
      _spiedClientId = options.clientId;

      _clientSpy = aClientSpy(_shouldFailConnect, _connectionFailMsg);

      return _clientSpy.start();
    },

    connectBrokerAddress: () => _spiedBrokerAddress,
    connectTlsCertPath: () => _spiedTlsCertPath,
    connectTlsKeyPath: () => _spiedTlsKeyPath,
    connectClientId: () => _spiedClientId,

    failConnectWithMessage: (msg) => {

      _shouldFailConnect = true;
      _connectionFailMsg = msg;
    },
  };
};
