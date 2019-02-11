/* eslint-disable linebreak-style */
const shenpi = require('./models/shenpi.js');
const shenpiBuzhou = require('./models/shenpiBuzhou.js');
const shenpiMingxi = require('./models/shenpiMingxi.js');
const shenpiNeirong = require('./models/shenpiNeirong.js');
const shenpiController = require('./controllers/shenpi');

module.exports = ({ baseModel, name, config, U, shenpiConfig }) => ({
  models: {
    shenpi: shenpi({ baseModel, U, config }),
    shenpiBuzhou: shenpiBuzhou({ baseModel }),
    shenpiMingxi: shenpiMingxi({ baseModel }),
    shenpiNeirong: shenpiNeirong({ baseModel }),
  },
  controllers: {
    shenpi: () => shenpiController({ name, U, shenpiConfig, config }),
  },
});
