const shenpi = require('./api/shenp/index.js');

module.exports = (rest) => {
  rest.helper.rest = {
    shenpi: shenpi(rest),
  };
  return rest.helper.rest;
};
