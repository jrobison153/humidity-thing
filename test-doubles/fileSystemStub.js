module.exports = () => {

  const _constants = {
    F_OK: '1',
    R_OK: '2',
  };
  return {

    access: (filePath, mode, cb) => {

      if (mode === _constants.F_OK) {

        if (filePath.match(/.*\/fail\/.*/)) {

          cb(new Error('Failing for test reasons'));
        } else {

          cb(null);
        }
      } else if (mode === _constants.R_OK) {

        if (filePath.match(/.*\/read-error\/.*/)) {

          cb(new Error('Failing for test reasons'));
        } else {

          cb(null);
        }
      }
    },

    constants: _constants,
  };
};
