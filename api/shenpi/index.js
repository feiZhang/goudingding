/* eslint-disable linebreak-style */
const shenpi = require('./models/shenpi.js');
const shenpiBuzhou = require('./models/shenpiBuzhou.js');
const shenpiMingxi = require('./models/shenpiMingxi.js');
const shenpiNeirong = require('./models/shenpiNeirong.js');
const shenpiController = require('./controllers/shenpi');

/**
 * shenpiConfig 及审批流程的配置文件
 */
module.exports = ({ baseModel, config, U, shenpiConfig }) => ({
  models: {
    shenpi: shenpi({ baseModel, U, config }),
    shenpiBuzhou: shenpiBuzhou({ baseModel }),
    shenpiMingxi: shenpiMingxi({ baseModel }),
    shenpiNeirong: shenpiNeirong({ baseModel }),
  },
  controllers: {
    shenpi: () => {
      return shenpiController({ U, shenpiConfig: shenpiConfig || config.shenpi, config })
    },
  },
});
/*
1. 表关系
  models.zhongduanCaigouShenpi.hasMany(models.tagsData, {
    foreignKey: 'dataId',
    sourceKey: 'id',
    as: 'tagsData',
  });
  models.zhongduanCaigouShenpi.hasMany(models.tagsData, {
    foreignKey: 'dataId',
    sourceKey: 'id',
    as: 'innerTagsData',
  });
2. 流程配置
      hetong: {
        formatMingxi: () =>{

        },
        sendSms: (shenpiInfo) => {
          const smsParams = {
            TemplateCode: 'SMS_159620519',
            TemplateParam: JSON.stringify({
              city: `[${shenpiInfo.creatorCityName}]`,
              no: shenpiInfo.no,
              userName: `[${shenpiInfo.creatorName}]`,
              title: '[合同审批]',
            }),
          }
          if (shenpiInfo.creatorId === 436) smsParams.PhoneNumbers = '18637101339';
          return smsParams;
        },
        readOnly: [],
        liucheng: [
          {
            title: '市分',
            cengji: 2,
            liucheng: [
              {
                bumen: '发起人',
                neirong: '发起合同会签需求',
                zhanghao: { isme: 0 },
              },
              {
                bumen: '地市项目部总经理',
                neirong: '审批',
                zhanghao: {
                  // eslint-disable-next-line no-confusing-arrow
                  role: ({ user }) => {
                    console.log(user.dept_id, 'shenpi-user');
                    return Number(user.dept_id) === 1 ? false : [10];
                  },
                },
              },
            ],
          },
          {
            title: '省分',
            cengji: 1,
            liucheng: [
              {
                bumen: '省分审批',
                neirong: '审批',
                shenpiType: '多批',
                selectUser: 1,
                zhanghao: {
                  // eslint-disable-next-line no-confusing-arrow
                  role: ({ user }) => Number(user.dept_id) === 1 ? [93] : false,
                },
              },
            ],
          },
          {
            title: '省分',
            cengji: 0,
            liucheng: [
              {
                bumen: '律师',
                neirong: '审核',
                zhanghao: { role: { id: [7] } },
              },
              {
                bumen: '与本合同相关的其他部门经理',
                neirong: '审核',
                // 返回值 { id: [5025], accountId: [Number(data.zhuguan)] }
                zhanghao: {
                  role: ({ data }) => {
                    if (Number(data.zhuguan) > 0) {
                      return { id: [5025], accountId: [Number(data.zhuguan)] };
                    }
                    return { id: [5025] };
                  },
                },
              },
              {
                bumen: '计划财务部经理',
                neirong: '审核',
                zhanghao: { role: { id: [51] } },
              },
              // {
              //   bumen: '党办经理',
              //   neirong: '审核',
              //   zhanghao: { role: { id: [18] } },
              // },
              {
                bumen: '副总经理',
                neirong: '审核',
                shenpiType: '多批',
                zhanghao: {
                  role: ({ data }) => {
                    if (data.shenpiDept === '生产支撑中心') {
                      return [12, 92];
                    }
                    return [12];
                  },
                },
              },
              // { bumen: '总经理', neirong: '审核', zhanghao: { role: { id: [81] } } },
            ],
          },
        ],
      },
    },
*/