/**
 * @param{Object} options
 * @return {{subscribe: subscribe, publish: publish}}
 */
module.exports = (options) => {

  const subscriptions = {};

  const _createTopic = (topic) => {
    if (subscriptions[topic] === undefined) {
      subscriptions[topic] = {
        registeredCallBacks: [],
        dataPublishedToTopic: [],
      };
    }
  };

  return {

    publish: (topic, data) => {

      _createTopic(topic);

      subscriptions[topic].dataPublishedToTopic.push(data);

      subscriptions[topic].registeredCallBacks.forEach((cb) => cb(data));
    },

    subscribe: (topic, cb) => {
      _createTopic(topic);

      subscriptions[topic].registeredCallBacks.push(cb);
    },
  };
};
