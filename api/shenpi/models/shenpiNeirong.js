/* eslint-disable new-cap */
/* eslint-disable max-len */
const moment = require('moment');
const Sequelize = require('sequelize');

module.exports = ({ baseModel }) => {
    const { deleteUploadFile, saveUploadFile, formatDbField, baseAttr, baseField, baseExtAttr } = baseModel;
    return {
        fields: Object.assign({}, baseField, {
            shenpiId: {
                type: Sequelize.INTEGER.UNSIGNED,
                allowNul: false,
                defaultValue: 0,
                comment: 'workFlow的Id',
            },
            cityId: { type: Sequelize.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
            cityName: { type: Sequelize.STRING(200), allowNull: false, defaultValue: '' },
            title: { type: Sequelize.STRING(200), allowNull: false, defaultValue: '', comment: '' },
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
                type: Sequelize.STRING(8000),
                allowNull: false,
                defaultValue: '',
                comment: '备注',
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
        }),
        attr: Object.assign({}, baseAttr, {
            comment: '详细内容',
            freezeTableName: true,
            hooks: {
                beforeCreate: [],
                beforeUpdate: [],
                afterCreate: [saveUploadFile],
                afterUpdate: [saveUploadFile],
                afterDestroy: deleteUploadFile,
            },
            instanceMethods: {
                gaishu: () => this.title,
            },
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
