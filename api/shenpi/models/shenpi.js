/* eslint-disable max-len */
/* eslint-disable new-cap */
import _ from 'lodash';
import Sequelize from 'sequelize';

const { deleteUploadFile, saveUploadFile, formatDbField, baseAttr, baseField, baseExtAttr } = require('../../models/base');

module.exports = sequelize => {
  const shenpi = _.extend(
    sequelize.define(
      'shenpi',
      Object.assign({}, baseField, {
        allUserIds: {
          type: Sequelize.type('string', 1000),
          allowNull: false,
          defaultValue: '',
          comment: '所有的接收人，用于我的工单查询',
        },
        currentUserIds: {
          type: Sequelize.type('string', 1000),
          allowNull: false,
          defaultValue: '',
          comment: '当前要处理的人',
        },
        currentUserNames: {
          type: Sequelize.TEXT,
          allowNull: false,
          defaultValue: '',
          comment: '当前处理人姓名，多人的时候，有是否已处理的颜色区分',
          get() {
            return formatDbField(this, 'currentUserNames', 'json');
          },
        },
        /*        toUserIds: {*/
        // type: Sequelize.type('string', 1000),
        // allowNull: false,
        // defaultValue: '',
        // comment: '下一步的接受人',
        // },
        // toUserNames: {
        // type: Sequelize.type('string', 2000),
        // allowNull: false,
        // defaultValue: '',
        // comment: '下一步接受人姓名',
        /* },*/
        title: {
          type: Sequelize.type('string', 600),
          allowNull: false,
          defaultValue: '',
          comment: '标题',
        },
        content: {
          type: Sequelize.type('string', 3000),
          allowNull: false,
          defaultValue: '',
          comment: '内容',
        },
        searchString: {
          type: Sequelize.type('string', 6000),
          allowNull: false,
          defaultValue: '',
          comment: '用户快速检索的拼凑字段。',
        },
        lastShenpiType: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 1,
          comment: '下一步审批类型，避免覆盖上一步的审批类型',
        },
        lastAutoNext: {
          type: Sequelize.INTEGER.UNSIGNED,
          allowNull: false,
          defaultValue: 2,
          comment: '自动进入下一步，1的时候，作为长期存在的任务存在。2:非长期',
        },
        lastAutoEnd: {
          type: Sequelize.ENUM('是', '否'),
          allowNull: false,
          defaultValue: '否',
          comment: '截至时间结束后，是否自动结束。1是，2否',
        },
        lastJiezhiTime: {
          type: Sequelize.DATE,
          allowNull: true,
          defaultValue: null,
          comment: '截至时间,只做提示',
          get() {
            return formatDbField(this, 'lastJiezhiTime', 'datetime');
          },
        },
        zhuangtai: {
          type: Sequelize.ENUM('未提交', '已结束', '办理中'),
          allowNull: false,
          defaultValue: '未提交',
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: true,
          defaultValue: Sequelize.NOW,
          get() {
            return formatDbField(this, 'createdAt', 'date');
          },
        },
      }),
      Object.assign({}, baseAttr, {
        comment: '电子工单',
        freezeTableName: true,
        hooks: {
          beforeCreate: [],
          beforeUpdate: [],
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
      includes: {
        neirong: ['shenpiNeirong', true],
        tagsData: ['tagsData', false],
        innerTagsData: ['tagsData', true], // inner
      },
      // 必须有，否则会将发送的数据全部过滤掉
      writableCols: false,
    })
  );

  return shenpi;
};
