/* eslint-disable max-len */
const _ = require('lodash');
const moment = require('moment');

module.exports = (config) => {
  const { name, shenpiConfig, U: { rest, error, model, sms } } = config;
  const { helper } = rest;
  // console.log(name, model);
  if (!name) return {};
  const mShenpi = model(name);
  const mShenpiMingxi = model(`${name}Mingxi`);
  const mShenpiBuzhou = model(`${name}Buzhou`);
  const getAllUserIds = ({ curV, oldV, newV }) => {
    _.pullAll(curV, _.difference(oldV, newV));
    return _.union(curV, newV);
  };

  const list = [
  // helper.checker.sysAdmin(),
    async (req, res, next) => {
      req.params.shenpiId = 0;
      // 代办的
      if (req.params.sendToMy) {
        if (req.params.isHistory) {
          // 允许省公司人员或劳务订单查看人员	参看本部门相关的订单。
          req.params.allUserIds_like = `%,${req.user.id},%`;
          if (!req.params.zhuangtais) req.params.zhuangtais = '已结束,办理中';
        } else {
          req.params.currentUserIds_like = `%,${req.user.id},%`;
          req.params.zhuangtai = '办理中';
        }
      } else if (!req.user.isAdmin) {
        req.params.creatorId = req.user.id;
      }
      // req.params.includes = 'neirong';
      req.params.includes += ',tagsData';
      req.params.tagsData = { creatorId: req.user.id };
      if (req.params.tagsIds) {
        const tagsIds = await model('tagsData').findAll({
          where: { tagsId: { $in: req.params.tagsIds.split(',') } },
        });
        const ids = tagsIds.map(tt => tt.dataId);
        if (ids.length > 0) {
          if (req.params.notTagsIds) {
            req.params['ids!'] = ids.join(',');
          } else {
            req.params.ids = ids.join(',');
          }
        }
      }
      next();
    },
    helper.rest.list(mShenpi, '', null, 'list_data'),
    (req, res, next) => {
      const workIds = req.hooks.list_data.map(tt => tt.id);
      mShenpiBuzhou.findAll({ where: { shenpiId: { $in: workIds } }, order: [['id', 'desc']] }).then(results => {
        res.send({
          data: req.hooks.list_data.map(tt => {
            const ee = tt.get();
            ee.tagsData = ee.tagsData || ee.innerTagsData;
            ee.buzhous = results.filter(one => (one.shenpiId === tt.id));
            return ee;
          }),
          count: res.header('X-Content-Record-Total') || 0,
        });
        next();
      });
    },
  ];

  const modify = [
  // fillOtherInfo,
    async (req, res, next) => {
      req.mShenpiNeirong = model(`${name}Neirong_${(req.params.shenpiType || '').toLowerCase()}`);
      if (!req.mShenpiNeirong) {
        next(error('非法请求!'));
        return;
      }
      if (req.params.doType === 'reply') {
        if (!req.user.isAdmin) {
          const isMy = await mShenpiBuzhou.findOne({
            where: { id: req.params.id, toUserIds: { $like: `%,${req.user.id},%` } },
          });
          if (!isMy) {
            next(error('请求的数据不存在或您没权限处理!'));
            return;
          }
        }
        let smsUserIds = [];
        const mainData = await mShenpi.findById(req.params.shenpiId);
        // 根据类型匹配内容表。
        switch (req.params.doAction) {
        case 'jujue': {
          await mShenpiMingxi.update(
            { banliyijian: req.params.banliyijian },
            { where: { index: req.params.index, shenpiId: req.params.shenpiId, userId: req.user.id, roleId: req.params.roleId } }
          );
          await mShenpiMingxi.update({ isDelete: 0, color: 'red' }, { silent: true, where: { shenpiId: req.params.shenpiId } });
          await mShenpiBuzhou.update(
            { zhuangtai: '经办', toUserIds: mShenpiBuzhou.sequelize.literal('initToUserIds') },
            { where: { shenpiId: req.params.shenpiId } }
          );
          // const qianyige = await mShenpiBuzhou.findOne({ where: { shenpiId: req.params.shenpiId, id: { $gt: req.params.id } }, order: [['id', 'asc']] });
          // 直接驳回到第一步。
          const qianyige = await mShenpiBuzhou.findOne({
            where: { shenpiId: req.params.shenpiId },
            order: [['id', 'desc']],
          });
          mainData.currentUserIds = qianyige.toUserIds;
          // 对第一步再驳回，进入修改状态。
          mainData.zhuangtai = '未提交';
          // 返回给第一人，发起人
          smsUserIds = qianyige.toUserIds.split(',');
          await qianyige.update({ zhuangtai: '待办' });
          await mainData.save();
          break;
        }
        case 'tongyi': {
          const currentStep = await mShenpiBuzhou.findById(req.params.id);
          currentStep.toUserNames = await mShenpiMingxi.findAll({ where: { shenpiId: req.params.shenpiId, index: currentStep.index, isDelete: 0 } });
          let gotoNext = true;
          currentStep.toUserNames.map(one => {
            // 一个人会有多个角色，前端要传递参数，此次审批的是哪个角色
            if ((one.userId === req.user.id && one.roleId === req.params.roleId) || currentStep.shenpiType === '单批') {
              if (one.userId === req.user.id && one.roleId === req.params.roleId) {
                one.banliyijian = req.params.banliyijian;
              }
              one.color = 'black';
              one.updatedTime = moment().format('YYYY-MM-DD HH:mm:ss');
              one.save();
            }
            if (one.color === 'red') {
              gotoNext = false;
            }
            return one;
          });
          // console.log(JSON.stringify(currentStep.toUserNames), gotoNext, 11);
          // 减少当前处理人
          if (gotoNext) {
            const xiayige = await mShenpiBuzhou.findOne({
              where: { shenpiId: req.params.shenpiId, id: { $lt: req.params.id } },
              order: [['id', 'desc']],
            });
            if (xiayige) {
              xiayige.zhuangtai = '待办';
              mainData.zhuangtai = '办理中';
              // 如果下一步是多人，前端可以选择下一步处理人。这是选定的下一步处理人
              if (Array.isArray(req.params.nextUserIds)) {
                mainData.allUserIds = `,${getAllUserIds({
                  curV: mainData.allUserIds.split(','),
                  oldV: xiayige.toUserIds.split(','),
                  newV: req.params.nextUserIds,
                })
                  .filter(one => one !== '')
                  .join(',')},`;
                xiayige.toUserIds = `,${req.params.nextUserIds.join(',')},`;
                await mShenpiMingxi.update({ isDelete: 1 }, { where: { index: xiayige.index, userId: { $notIn: req.params.nextUserIds } } });
              }
              // 如果传递了下一步的人员，上面已经格式化过了。
              // 这个字段作废掉
              // mainData.currentUserNames = Array.isArray(xiayige.toUserNames) ? JSON.stringify(xiayige.toUserNames) : xiayige.toUserNames;
              mainData.currentUserIds = xiayige.toUserIds;
              currentStep.zhuangtai = '已办';
              await currentStep.save();
              await xiayige.save();
              await mainData.save();
              smsUserIds = xiayige.toUserIds.split(',');
            } else {
              mainData.zhuangtai = '已结束';
              await mainData.save();
              currentStep.zhuangtai = '已办';
              await currentStep.save();
            }
          } else {
            mainData.currentUserIds = mainData.currentUserIds.replace(`,${req.user.id},`, ',');
            await mainData.save();
            // 上面已经修改了当前处理人toUserNames
            await currentStep.save();
          }
          break;
        }
        default:
          break;
        }
        if (shenpiConfig[req.params.shenpiType].sendSms === true && smsUserIds.length > 0) {
          model('user')
            .findAll({ where: { id: { $in: smsUserIds } } })
            .then(users => {
              if (users.length > 0) {
                const userTels = users
                  .map(one => one.telno)
                  .join(',');
                req.mShenpiNeirong
                  .findOne({ where: { shenpiId: req.params.shenpiId } })
                  .then(gdInfo => {
                    if (gdInfo) {
                      // const kjhtName = gdInfo.kjhtName || "";
                      // console.log(userTels, kjhtName, kjhtName.substr(0, 20), kjhtName.substr(20, 20), kjhtName.substr(40, 20), "DingdanSendSMS");
                      // const tContent = kjhtName.substr(0, 20);
                      // const tContent1 = kjhtName.substr(20, 20);
                      // const tContent2 = kjhtName.substr(40, 20);
                      // const smsContent = JSON.stringify({ title: '工程劳务订单', content: tContent, content1: tContent1, content2: tContent2 });
                      const smsContent = JSON.stringify({
                        title: `[${gdInfo.title}]`,
                        no: gdInfo.no,
                        userName: `[${gdInfo.creatorName}]`,
                        city: `[${gdInfo.cityName}]`,
                      });
                      sms
                        .sendSMS({
                          PhoneNumbers: userTels,
                          SignName: '河南铁通',
                          TemplateCode: 'SMS_155856246',
                          TemplateParam: smsContent,
                        })
                        .then(
                          results => {
                            const { Code } = results;
                            const smsInfo = users.map(one => ({
                              userId: one.id,
                              deptId: one.deptId,
                              renliId: one.renliId,
                              type: '劳务分包费审批',
                              telno: one.telno,
                              content: smsContent,
                              zhuangtai: Code,
                              beizhu: JSON.stringify(results),
                            }));
                            model('smsSend').bulkCreate(smsInfo);
                            if (Code === 'OK') {
                              // 处理返回参数
                              console.log(results, 'DingdanSendSMS-success');
                            }
                          },
                          err => {
                            console.log(err, 'DingdanSendSMS-error');
                          }
                        );
                    }
                  });
              }
            });
        }
        res.send({ shenpiId: req.params.shenpiId });
        next();
      } else {
        req.mShenpiNeirong
          .findOne({ where: { shenpiId: req.params.id } })
          .then(gdInfo => {
            if (gdInfo) {
              req.hooks.mShenpi = gdInfo;
              const aa = helper.rest.modify(req.mShenpiNeirong, 'mShenpi');
              mShenpi.update(
                {
                  searchString: JSON.stringify(_.omit(req.hooks.mShenpi.get(), ['fujian', 'createdAt', 'updatedAt'])),
                },
                { where: { id: req.params.id } }
              );
              aa(req, res, next);
            } else {
              next(error('请求的数据不存在!'));
            }
          });
      }
    },
  ];

  const add = [
    async (req, res, next) => {
      req.mShenpiNeirong = model(`${name}Neirong_${(req.params.shenpiType || '').toLowerCase()}`);
      console.log(`${name}Neirong_${(req.params.shenpiType || '').toLowerCase()}`, req.mShenpiNeirong);
      // eslint-disable-next-line no-constant-condition
      if (false && !req.user.shenpi[name]) {
        next(error('你没有这个权限!'));
        return;
      }
      const userCityInfo = (req.user.cityInfo || req.user.cityDept || {});
      req.params.cityName = userCityInfo.name;
      req.params.cityId = userCityInfo.renliId;
      // 生成流程数据。
      const buzhous = [];
      const UserM = model('user');
      const DeptM = model('dept');
      let allUserIds = [];
      // let nextToUsers = JSON.stringify([]);
      const shenpiLiucheng = [];
      shenpiConfig[req.params.shenpiType].liucheng.forEach(level => {
        level.liucheng.forEach(one => {
          shenpiLiucheng.push({ ...one, cengji: level.cengji });
        });
      });
      // console.log(JSON.stringify(shenpiConfig),allUserIds, 'shenpiLiucheng');
      // 为了方便生成nextToUser倒序来
      let allUserNames = [];
      for (let ii = shenpiLiucheng.length - 1; ii >= 0; ii -= 1) {
        const toUserNames = [];
        let otherInfo = {};
        const tt = shenpiLiucheng[ii];
        const userWhere = {};
        const index = ii + 1;
        let userList = [];
        // 发起人
        if (tt.zhanghao.isme !== undefined) {
          userList = [req.user];
          toUserNames.push({ updatedAt: null, index, userId: req.user.id, name: req.user.name, color: 'red', roleId: tt.zhanghao.isme });
        } else if (tt.zhanghao.role) {
          if (tt.zhanghao.role instanceof Function) {
            tt.zhanghao.role.id = tt.zhanghao.role({ data: req.params, user: req.user });
          }
          userWhere.roleId = {
            $or: tt.zhanghao.role.id.map(ttt => ({ $like: `%,${ttt},%` })),
          };
          if (tt.cengji !== 1) {
            // 地市级的数据，需要选址选择范围，否则能找到其他地市的人员
            const fdns = (req.user.deptFdn || req.user.dept_fdn || '').split('.');
            const dishiFdn = `${_.slice(fdns, 0, tt.cengji).join('.')}.%`;
            const include = [{ model: DeptM, require: true, as: 'userdept', where: { fdn: { $like: dishiFdn } } }];
            UserM.belongsTo(DeptM, { foreignKey: 'dept_id', sourceKey: 'id', as: 'userdept', scope: { isDelete: 'no' } });
            userList = await UserM.findAll({ where: userWhere, include, limit: 50 });
              // console.log(userList.length);
          } else {
            userList = await UserM.findAll({ where: userWhere, limit: 50 });
              // console.log(userList.length);
          }
          // 为了在前端摆放的合适的格子里，需要角色数据
          // eslint-disable-next-line no-loop-func
          tt.zhanghao.role.id.forEach(roleId => {
            const roleUserList = userList.filter(one => one.roleId.indexOf(`,${roleId},`) >= 0);
            if (shenpiConfig[req.params.shenpiType].readOnly.indexOf(roleId) < 0) {
              roleUserList.forEach(mm => {
                toUserNames.push({
                  updatedAt: null,
                  index,
                  deptName: mm.userdept.name,
                  userId: mm.id,
                  name: mm.name,
                  color: 'red',
                  roleId,
                });
              });
            }
          });
        }
        const toUserIds = toUserNames.map(mm => mm.userId);
        allUserIds = userList.map(mm => mm.id).concat(allUserIds);
        allUserNames = toUserNames.concat(allUserNames);
        if (ii === 0) {
          req.params.currentUserIds = `,${toUserIds.join(',')},`;
          // req.params.currentUserNames = JSON.stringify(toUserNames);
          otherInfo = {
            creatorId: req.user.id,
            creatorName: req.user.name,
            chuliyijian: '',
            zhuangtai: '待办',
          };
        }
        if (ii === 1) {
          req.params.toUserIds = `,${toUserIds.join(',')},`;
        // req.params.toUserNames = JSON.stringify(toUserNames);
        }
        buzhous.push(
        Object.assign(
          {
            shenpiContent: tt.neirong,
            shenpiDept: tt.bumen,
            zhuangtai: '经办',
            shenpiType: tt.shenpiType || '单批',
            index,
            toUserIds: `,${toUserIds.join(',')},`,
            initToUserIds: `,${toUserIds.join(',')},`,
            // toUserNames: JSON.stringify(toUserNames),
            // initToUserNames: JSON.stringify(toUserNames),
            // nextToUsers,
          },
          otherInfo
        )
      );
      // nextToUsers = JSON.stringify(toUserNames);
      }
      req.params.allUserIds = `,${allUserIds.join(',')},`;
      // console.log(buzhous);
      req.buzhous = buzhous;
      req.toUserNames = allUserNames;
      next();
    },
    // fillOtherInfo,
    (req, res, next) => {
      // 创建新工单。
      req.res_no_send = true;
      req.params.zhuangtai = '未提交';
      // console.log(req.params, 333);
      const aa = helper.rest.add(mShenpi, null, 'mShenpi');
      aa(req, res, (err1) => {
        if (err1) {
          next(err1);
          return;
        }
        req.params.shenpiId = req.hooks.mShenpi.id;
      // req.params.title = `中移建设有限公司河南分公司${(req.user.cityDept || {}).name || ''}分公司工劳务外包审批`;
        const bb = helper.rest.add(req.mShenpiNeirong, null, 'neirong');
        bb(req, res, err => {
          if (err) {
            next(err);
            return;
          }
          req.hooks.mShenpi.update({
            searchString: JSON.stringify(_.omit(req.hooks.neirong.get(), ['fujian', 'createdAt', 'updatedAt'])),
            shenpiTitle: req.hooks.neirong.gaishu(),
          });
          const buzhous = req.buzhous.map(rr => {
            rr.shenpiId = req.hooks.mShenpi.id;
            return rr;
          });
          mShenpiBuzhou
          .bulkCreate(buzhous)
          .then(() => {
            const toUsers = req.toUserNames.map(rr => ({ ...rr, shenpiId: req.hooks.mShenpi.id }));
            mShenpiMingxi.bulkCreate(toUsers);
            res.send(req.hooks.mShenpi);
            next();
          });
        });
      });
    },
  // helper.checker.sysAdmin(),
  ];

  const detail = [
    helper.getter(mShenpi, 'modelName'),
    helper.assert.exists('hooks.modelName'),
    (req, res, next) => {
      if (!req.user.isAdmin && req.hooks.modelName.allUserIds.indexOf(`,${req.user.id},`) < 0) {
        next(error('请求的数据不存在或您没权限处理!'));
        return;
      }

      const item = req.hooks.modelName.get();
      req.mShenpiNeirong = model(`${name}Neirong_${item.shenpiType.toLowerCase()}`);
      req.mShenpiNeirong.findOne({ where: { shenpiId: item.id } })
      .then(neirongInfo => {
        mShenpiBuzhou.findAll({ where: { shenpiId: item.id }, order: [['id', 'desc']] }).then(results => {
          mShenpiMingxi.findAll({ where: { shenpiId: item.id, isDelete: 0 } }).then(toUserNames => {
            item.historyList = results.map(rr => ({ ...rr.get(), toUserNames: toUserNames.filter(one => one.index === rr.index) }));
            res.send(Object.assign({}, item, neirongInfo.get(), { id: item.id }));
            next();
          });
        });
        // mShenpi.update({ zhuangtai: '已读' }, { where: { zhuangtai: '未读', id: item.id } }).then(() => {
        // });
      });
    },
  ];

  const remove = [
    helper.getter(mShenpi, 'modelName'),
    helper.assert.exists('hooks.modelName'),
    (req, res, next) => {
      const item = req.hooks.modelName.get();
      req.mShenpiNeirong = model(`${name}Neirong_${item.shenpiType.toLowerCase()}`);
      req.mShenpiNeirong.destroy({ where: { shenpiId: req.params.id } });
      mShenpiMingxi.destroy({ where: { shenpiId: req.params.id } });
      mShenpiBuzhou.destroy({ where: { shenpiId: req.params.id } });
      next();
    },
    helper.rest.remove.hook('modelName').exec(),
  ];

  return {
    list,
    detail,
    modify,
    remove,
    add,
  };
};
