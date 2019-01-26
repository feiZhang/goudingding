/* eslint-disable new-cap */
/* eslint-disable max-len */
import _ from 'lodash';
import moment from 'moment';
import Sequelize from 'sequelize';

const { deleteUploadFile, saveUploadFile, formatDbField, baseAttr, baseField, baseExtAttr } = require('../../models/base');

module.exports = sequelize => {
  const shenpiNeirong = _.extend(
    sequelize.define(
      'shenpiNeirong',
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
            return !it ? '' : moment(it).format('YYYY-MM-DD');
          },
        },
        beizhu: {
          type: Sequelize.type('string', 2000),
          allowNull: false,
          defaultValue: '',
          comment: '备注',
        },
        fujian: {
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
          ],
          beforeUpdate: [
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

  return shenpiNeirong;
};
