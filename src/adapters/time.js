const time = {
  timer: (ms) => new Promise((res) => setTimeout(res, ms)),

  now: () => Date.now(),
};

module.exports = time;
