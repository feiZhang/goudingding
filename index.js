/* eslint-disable arrow-body-style */
/* eslint-disable max-len */
const shenpi = require('./api/shenpi/index.js');
const baseModel = require('./api/models/base');

module.exports = ({ config, U }) => {
  // console.log(config);
  return {
    shenpi: (shenpiConfig) => {
      // console.log(shenpiConfig);
      return shenpi({ baseModel: baseModel({ config, U }), U, config, ...shenpiConfig });
    },
  };
};
