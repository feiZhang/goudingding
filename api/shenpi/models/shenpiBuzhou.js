/* eslint-disable max-len */
/* eslint-disable new-cap */
const Sequelize = require('sequelize');

module.exports = ({ baseModel }) => {
  const { deleteUploadFile, saveUploadFile, formatDbField, baseAttr, baseField, baseExtAttr } = baseModel;
  return {
    fields: Object.assign({}, baseField, {
      initToUserIds: {
        type: Sequelize.STRING(2000),
        allowNull: false,
        defaultValue: '',
        comment: '下一步的接受人',
      },
      initToUserNames: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '',
        comment: '接收人',
      },
      toUserIds: {
        type: Sequelize.STRING(2000),
        allowNull: false,
        defaultValue: '',
        comment: '下一步的接受人',
      },
      /*
      toUserNames: {
        type: Sequelize.TEXT,
        allowNull: false,
        defaultValue: '',
        comment: '接收人',
        get() {
          return formatDbField(this, 'toUserNames', 'json', []);
        },
      },
      */
      nextToUsers: {
        type: Sequelize.STRING(2000),
        allowNull: false,
        defaultValue: '',
        comment: '接收人',
        get() {
          return formatDbField(this, 'nextToUsers', 'json', []);
        },
      },
      index: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '序号',
      },
      shenpiId: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0,
        comment: '工单ID',
      },
      shenpiDept: {
        type: Sequelize.STRING(3000),
        allowNull: false,
        defaultValue: '',
        comment: '内容',
      },
      shenpiContent: {
        type: Sequelize.STRING(3000),
        allowNull: false,
        defaultValue: '',
        comment: '内容',
      },
      banliyijian: {
        type: Sequelize.STRING(3000),
        allowNull: false,
        defaultValue: '',
        comment: '办理意见',
      },
      fujian: {
        type: Sequelize.TEXT,
        allowNull: true,
        defaultValue: null,
        comment: '附件',
        get() {
          return formatDbField(this, 'fujian', 'files');
        },
      },
      shenpiType: {
        type: Sequelize.ENUM('单批', '多批'),
        allowNull: false,
        defaultValue: 2,
        comment: '单批',
      },
      autoNext: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 2,
        comment: '',
      },
      jiezhiTime: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
        comment: '截至时间,只做提示',
        get() {
          return formatDbField(this, 'jiezhiTime', 'datetime');
        },
      },
      zhuangtai: {
        type: Sequelize.ENUM('经办', '待办', '已办'),
        allowNull: false,
        defaultValue: '经办',
      },
    }),
    attr: Object.assign({}, baseAttr, {
      comment: '电子公文回复信息',
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
    }),
    ext: Object.assign({}, baseExtAttr, {
      sort: {
        default: 'createdAt',
        defaultDirection: 'desc',
      },
      // 必须有，否则会将发送的数据全部过滤掉
      writableCols: false,
    }),
  };
};
