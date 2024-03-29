/* eslint-disable arrow-body-style */
/* eslint-disable max-len */
const shenpi = require('./api/shenpi/index.js');
const baseModel = require('./api/models/base');
const baseController = require('./api/controllers/base');
const tools = require('./tools.js');

module.exports = ({ config, U }) => {
    const theBaseModel = baseModel({ config, U });
    return {
        tools,
        baseModel: theBaseModel,
        baseController: ({ mainModel, importModel }) => {
            return baseController({ config, mainModel, U, helper: U.rest.helper, importModel });
        },
        shenpi: shenpiConfig => {
            return shenpi({ baseModel: theBaseModel, U, config, shenpiConfig });
        },
    };
};
