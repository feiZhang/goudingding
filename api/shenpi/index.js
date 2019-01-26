/* eslint-disable linebreak-style */
import shenpi from './models/shenpi.js';
import shenpiBuzhou from './models/shenpiBuzhou.js';
import shenpiMingxi from './models/shenpiMingxi.js';
import shenpiNeirong from './models/shenpiNeirong.js';
import shenpiController from './controllers/shenpi';

export default ({ baseModel }) => ({
  models: {
    shenpi: shenpi({ baseModel }),
    shenpiBuzhou: shenpiBuzhou({ baseModel }),
    shenpiMingxi: shenpiMingxi({ baseModel }),
    shenpiNeirong: shenpiNeirong({ baseModel }),
  },
  controllers: {
    shenpi: shenpiController,
  },
});
