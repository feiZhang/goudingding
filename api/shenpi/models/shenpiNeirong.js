const U = require('../lib/utils');
const config = require('../configs');

const { deleteUploadFile, saveUploadFile, formatDbField, baseAttr, baseField, baseExtAttr } = require('./base');
const Sequelize = U.rest.Sequelize;

module.exports = sequelize => {
  const laowuFenbaoShenpiNeirong = U._.extend(
    sequelize.define(
      'laowuFenbaoShenpiNeirong',
      Object.assign({}, baseField, {
        shenpiId: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNul: false,
          defaultValue: 0,
          comment: 'workFlow的Id',
        },
        no: {
          type: Sequelize.type('string', 20),
          allowNull: false,
          defaultValue: '',
          comment: '劳务框架合同编号+流水号',
        },
        cityId: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
        cityName: { type: Sequelize.type('string', 200), allowNull: false, defaultValue: '' },
        telno: { type: Sequelize.type('string', 20), allowNull: false, defaultValue: '' },
        title: { type: Sequelize.type('string', 200), allowNull: false, defaultValue: '', comment: '当前要处理的人中移建设河南分公司XX项目部工程劳务订单' },
        riqi: {
          type: Sequelize.DATEONLY,
          allowNull: false,
          defaultValue: Sequelize.NOW,
          comment: '订单日期',
          get() {
            const it = this.getDataValue('riqi');
            return !it ? '' : U.moment(it).format('YYYY-MM-DD');
          },
        },
        beizhu: {
          type: Sequelize.type('string', 2000),
          allowNull: false,
          defaultValue: '',
          comment: '备注',
        },
        baoxian0: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        baoxian1: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        baoxian2: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        rengong0: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        rengong1: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        rengong2: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        renshu0: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        renshu1: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        renshu2: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        zhicheng0: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        zhicheng1: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        zhicheng2: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        zongji0: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        zongji1: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        zongji2: { type: Sequelize.DECIMAL(12, 2), allowNull: false, defaultValue: 0 },
        fujian: {
          type: Sequelize.type('string', 3000),
          allowNull: false,
          defaultValue: '',
          comment: '附件',
          get() {
            return formatDbField(this, 'fujian', 'files');
          },
        },
        fujian1: {
          type: Sequelize.type('string', 3000),
          allowNull: false,
          defaultValue: '',
          comment: '附件',
          get() {
            return formatDbField(this, 'fujian', 'files');
          },
        },
        fujian2: {
          type: Sequelize.type('string', 3000),
          allowNull: false,
          defaultValue: '',
          comment: '附件',
          get() {
            return formatDbField(this, 'fujian', 'files');
          },
        },
      }),
      Object.assign({}, baseAttr, {
        comment: '详细内容',
        freezeTableName: true,
        hooks: {
          beforeCreate: [
            (model, options) => {
              console.log(model);
              model.zongji0 = Number(model.baoxian0)
                .add(model.rengong0)
                .add(model.zhicheng0);
              model.zongji1 = Number(model.baoxian1)
                .add(model.rengong1)
                .add(model.zhicheng1);
              model.zongji2 = Number(model.baoxian2)
                .add(model.rengong2)
                .add(model.zhicheng2);
              const benYue = (config.CITY_JC[model.cityId] || 'WZ') + U.moment().format('YYYYMM');
              return U.generateNo({
                baseNo: benYue,
                noModel: U.model('no'),
                type: '劳务费用审批流程',
              }).then(no => {
                model.no = no;
                console.log('gongdanNo', model.no, options);
              });
            },
            // (model, options) => {
            //   if (
            //     model.buhanshuiJine &&
            //     model.shuiJine &&
            //     (model.changed().indexOf('shuiJine') >= 0 ||
            //       model.changed().indexOf('buhanshuiJine') >= 0)
            //   ) {
            //     model.hanshuiJine = Number(model.buhanshuiJine).add(model.shuiJine);
            //     options.fields.push('hanshuiJine');
            //   }
            // },
          ],
          beforeUpdate: [
            (model, options) => {
              model.zongji0 = Number(model.baoxian0)
                .add(model.rengong0)
                .add(model.zhicheng0);
              model.zongji1 = Number(model.baoxian1)
                .add(model.rengong1)
                .add(model.zhicheng1);
              model.zongji2 = Number(model.baoxian2)
                .add(model.rengong2)
                .add(model.zhicheng2);
              options.fields.push('zongji0');
              options.fields.push('zongji1');
              options.fields.push('zongji2');
            },
          ],
          afterCreate: [saveUploadFile],
          afterUpdate: [saveUploadFile],
          afterDestroy: deleteUploadFile,
        },
        instanceMethods: {},
        classMethods: {},
        uploadFields: ['fujian'],
      })
    ),
    Object.assign({}, baseExtAttr, {
      sort: {
        default: 'createdAt',
        defaultDirection: 'desc',
      },
      // 必须有，否则会将发送的数据全部过滤掉
      writableCols: false,
    })
  );

  return laowuFenbaoShenpiNeirong;
};
