/* eslint-disable arrow-body-style */
/* eslint-disable max-len */
const shenpi = require('./api/shenpi/index.js');
const baseModel = require('./api/models/base');

module.exports = ({ config, U }) => {
  const theBaseModel = baseModel({ config, U });
  return {
    baseModel: theBaseModel,
    shenpi: (shenpiConfig) => {
      // console.log(shenpiConfig);
      return shenpi({ baseModel: theBaseModel, U, config, ...shenpiConfig });
    },
  };
};
