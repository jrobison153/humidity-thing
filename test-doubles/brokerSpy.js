module.exports = () => {

  const _failConnectionReason = 'Failing broker connection for test reasons';
  const _publishedData = [];
  const _journal = [];

  let _connectCalled = false;
  let _connectCallCount = 0;
  let _failingConnect = false;
  let _failPublish = false;
  let _failPubForObjWithKeys = [];
  let _publishedTopic;
  let _certPath;
  let _certKeyPath;

  return {

    connect: async (certPath, certKeyPath) => {

      _certPath = certPath;
      _certKeyPath = certKeyPath;
      _connectCalled = true;
      _connectCallCount += 1;

      if (_failingConnect) {
        throw new Error(_failConnectionReason);
      }
    },

    publish: async (topicName, data) => {

      if (!_failPublish) {

        const havePubFailObj = _failPubForObjWithKeys.find((failKey) => data[failKey]);

        if (havePubFailObj) {
          throw new Error('Failing publish due to fail pub key presence');
        } else {

          _publishedTopic = topicName;
          _publishedData.push(data);

          _journal.push({data, topicName});
        }
      } else {
        throw new Error('Failing publish for test purposes');
      }
    },

    // broker interface above, spy functions below //
    certPath: () => _certPath,

    certKeyPath: () => _certKeyPath,

    connectCalled: () => _connectCalled,

    connectCallCount: () => _connectCallCount,

    failConnection: () => {

      _failingConnect = true;
    },

    failPublish: () => {
      _failPublish = true;
    },

    failPublishForObjectsWithKeys: (keys) => {
      _failPubForObjWithKeys = keys;
    },

    publishedData: () => _publishedData,

    publishedTopic: () => _publishedTopic,

    publishedTopicForData: (data) => {

      const foundEntry = _journal.find((entry) => {

        return JSON.stringify(entry.data) === JSON.stringify(data);
      });

      let topicName;

      if (foundEntry) {
        topicName = foundEntry.topicName;
      }

      return topicName;
    },
  };
};
