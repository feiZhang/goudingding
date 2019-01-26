import shenpi from './api/shenpi/index.js';
import baseModel from './api/models/base';

export default ({ config, U }) => ({
  shenpi: shenpi({ baseModel: baseModel({ config, U }) }),
});
