import _ from 'lodash';
import Sequelize from 'sequelize';

const { formatDbField, baseAttr, baseField, baseExtAttr } = require('../../models/base');

module.exports = sequelize => {
  const shenpiMingxi = _.extend(
    sequelize.define(
      'shenpiMingxi',
      Object.assign({}, baseField, {
        shenpiId: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 0,
        },
        index: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 0,
        },
        userId: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 0,
        },
        name: {
          type: Sequelize.type('string', 300),
          allowNull: false,
          defaultValue: '',
        },
        banliyijian: {
          type: Sequelize.type('string', 3000),
          allowNull: false,
          defaultValue: '',
          comment: '办理意见',
        },
        color: {
          type: Sequelize.type('string', 300),
          allowNull: false,
          defaultValue: '',
        },
        roleId: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 0,
          comment: '',
        },
        isDelete: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 0,
        },
        updatedTime: {
          type: Sequelize.DATE,
          allowNull: true,
          defaultValue: null,
          get() {
            return formatDbField(this, 'updatedTime', 'datetime');
          },
        },
      }),
      Object.assign({}, baseAttr, {
        comment: '明细对应的用户反馈',
        freezeTableName: true,
        hooks: {
          beforeCreate: [],
          beforeUpdate: [],
        },
        instanceMethods: {},
        classMethods: {},
      })
    ),
    Object.assign({}, baseExtAttr, {
      // 必须有，否则会将发送的数据全部过滤掉
      writableCols: false,
    })
  );

  return shenpiMingxi;
};
