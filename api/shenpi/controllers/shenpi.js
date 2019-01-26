const U = require('../lib/utils');
const helper = require('./helper');
const config = require('../configs');

const Sequelize = U.rest.Sequelize;
const Op = Sequelize.Op;
const mainModel = U.model('laowuFenbaoShenpi');
const mShenpiMingxi = U.model('laowuFenbaoShenpiMingxi');
const mShenpiUser = U.model('laowuFenbaoShenpiUser');

const getAllUserIds = ({ curV, oldV, newV }) => {
  U._.pullAll(curV, U._.difference(oldV, newV));
  return U._.union(curV, newV);
};

const list = [
  // helper.checker.sysAdmin(),
  async (req, res, next) => {
    req.params.shenpiId = 0;
    // req.params.includes = "sendToUsers";
    // 代办的
    if (req.params.sendToMy) {
      if (req.params.isHistory) {
        // 允许省公司人员或劳务订单查看人员	参看本部门相关的订单。
        if (req.user.roleId.indexOf(2) >= 0 || req.user.roleId.indexOf(16) >= 0) {
        }
        req.params.allUserIds_like = `%,${req.user.id},%`;
        if (!req.params.zhuangtais) req.params.zhuangtais = '已结束,办理中';
      } else {
        req.params.currentUserIds_like = `%,${req.user.id},%`;
        req.params.zhuangtai = '办理中';
      }
      // req.params.includes = "myGonggaos";
      // req.params.myGonggaos = { userId: req.user.id };
    } else if (!req.user.isAdmin) {
      req.params.creatorId = req.user.id;
    }
    req.params.includes = 'neirong';
    req.params.includes += ',tagsData';
    req.params.tagsData = { creatorId: req.user.id };
    if (req.params.tagsIds) {
      const tagsIds = await U.model('tagsData').findAll({
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
  helper.rest.list(mainModel, '', null, 'list_data'),
  (req, res, next) => {
    const workIds = req.hooks.list_data.map(tt => tt.id);
    mShenpiMingxi.findAll({ where: { shenpiId: { $in: workIds } }, order: [['id', 'desc']] }).then(results => {
      res.send({
        data: req.hooks.list_data.map(tt => {
          const ee = tt.get();
          ee.tagsData = ee.tagsData || ee.innerTagsData;
          ee.replys = results.filter(ee => ee.shenpiId === tt.id);
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
    if (req.params.doType === 'reply') {
      const replyModel = U.model('laowuFenbaoShenpiMingxi');
      if (!req.user.isAdmin) {
        const isMy = await replyModel.findOne({
          where: { id: req.params.id, toUserIds: { $like: `%,${req.user.id},%` } },
        });
        if (!isMy) {
          next(U.error('请求的数据不存在或您没权限处理!'));
          return;
        }
      }
      let smsUserIds = [];
      const mainData = await mainModel.findById(req.params.shenpiId);
      switch (req.params.doAction) {
        case 'jujue':
          await mShenpiUser.update(
            { banliyijian: req.params.banliyijian },
            { where: { index: req.params.index, shenpiId: req.params.shenpiId, userId: req.user.id, roleId: req.params.roleId } }
          );
          await mShenpiUser.update({ isDelete: 0, color: 'red' }, { silent: true, where: { shenpiId: req.params.shenpiId } });
          await replyModel.update(
            { zhuangtai: '经办', toUserIds: replyModel.sequelize.literal('initToUserIds') },
            { where: { shenpiId: req.params.shenpiId } }
          );
          // const qianyige = await replyModel.findOne({ where: { shenpiId: req.params.shenpiId, id: { $gt: req.params.id } }, order: [['id', 'asc']] });
          // 直接驳回到第一步。
          const qianyige = await replyModel.findOne({
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
        case 'tongyi':
          const currentStep = await replyModel.findById(req.params.id);
          currentStep.toUserNames = await mShenpiUser.findAll({ where: { shenpiId: req.params.shenpiId, index: currentStep.index, isDelete: 0 } });
          let gotoNext = true;
          currentStep.toUserNames.map(one => {
            if ((one.userId === req.user.id && one.roleId == req.params.roleId) || currentStep.shenpiType === '单批') {
              if (one.userId === req.user.id && one.roleId == req.params.roleId) {
                one.banliyijian = req.params.banliyijian;
              }
              one.color = 'block';
              one.updatedTime = U.now();
              one.save();
            }
            if (one.color === 'red') {
              gotoNext = false;
            }
            return one;
          });
          // console.log(JSON.stringify(currentStep.toUserNames), gotoNext, 11);
          //减少当前处理人
          if (gotoNext) {
            const xiayige = await replyModel.findOne({
              where: { shenpiId: req.params.shenpiId, id: { [Op.lt]: req.params.id } },
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
                  .filter(one => one != '')
                  .join(',')},`;
                xiayige.toUserIds = ',' + req.params.nextUserIds.join(',') + ',';
                await mShenpiUser.update({ isDelete: 1 }, { where: { index: xiayige.index, userId: { [Op.notIn]: req.params.nextUserIds } } });
              }
              //如果传递了下一步的人员，上面已经格式化过了。
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
            //上面已经修改了当前处理人toUserNames
            await currentStep.save();
          }
          break;
      }
      const { laowuFenbaoShenpi } = config.shenpi;
      if (laowuFenbaoShenpi.sendSms === true && smsUserIds.length > 0) {
        U.model('user')
          .findAll({ where: { id: { $in: smsUserIds } } })
          .then(users => {
            if (users.length > 0) {
              const userTels = users
                .map(one => {
                  return one.telno;
                })
                .join(',');
              U.model('laowuFenbaoShenpiNeirong')
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
                    U.sms
                      .sendSMS({
                        PhoneNumbers: userTels,
                        SignName: '河南铁通',
                        TemplateCode: 'SMS_155856246',
                        TemplateParam: smsContent,
                      })
                      .then(
                        res => {
                          const { Code } = res;
                          const smsInfo = users.map(one => ({
                            userId: one.id,
                            deptId: one.deptId,
                            renliId: one.renliId,
                            type: '劳务分包费审批',
                            telno: one.telno,
                            content: smsContent,
                            zhuangtai: Code,
                            beizhu: JSON.stringify(res),
                          }));
                          U.model('smsSend').bulkCreate(smsInfo);
                          if (Code === 'OK') {
                            // 处理返回参数
                            console.log(res, 'DingdanSendSMS-success');
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
      U.model('laowuFenbaoShenpiNeirong')
        .findOne({ where: { shenpiId: req.params.id } })
        .then(gdInfo => {
          if (gdInfo) {
            req.hooks.mainModel = gdInfo;
            const aa = helper.rest.modify(U.model('laowuFenbaoShenpiNeirong'), 'mainModel');
            mainModel.update(
              {
                searchString: JSON.stringify(U._.omit(req.hooks.mainModel.get(), ['fujian', 'createdAt', 'updatedAt'])),
              },
              { where: { id: req.params.id } }
            );
            aa(req, res, next);
          } else {
            next(U.error('请求的数据不存在!'));
          }
        });
    }
  },
];

const add = [
  async (req, res, next) => {
    if (!req.user.isLaowuFenbaoFeiShenpiFaqi) next(U.error('你没有这个权限!'));
    req.params.cityName = req.user.cityInfo.name;
    req.params.cityId = req.user.cityInfo.renliId;
    req.params.telno = req.user.telno;
    // 生成流程数据。
    const replys = [];
    const UserM = U.model('user');
    const DeptM = U.model('dept');
    const { laowuFenbaoShenpi } = config.shenpi;
    let allUserIds = [];
    // let nextToUsers = JSON.stringify([]);
    const shenpiLiucheng = [];
    laowuFenbaoShenpi.liucheng.forEach(level => {
      level.liucheng.forEach(one => {
        shenpiLiucheng.push({ ...one, cengji: level.cengji });
      });
    });
    // console.log(JSON.stringify(laowuFenbaoShenpi),allUserIds, 'shenpiLiucheng');
    //为了方便生成nextToUser倒序来
    let toUserNames = [];
    for (let ii = shenpiLiucheng.length - 1; ii >= 0; ii -= 1) {
      let otherInfo = {};
      const tt = shenpiLiucheng[ii];
      const userWhere = {};
      const index = ii + 1;
      let userList = [];
      // 发起人
      if (tt.zhanghao.isme === 1) {
        userList = [req.user];
        toUserNames.push({ updatedAt: null, index, userId: req.user.id, name: req.user.name, color: 'red', roleId: '250' });
      } else {
        if (tt.zhanghao.role && tt.zhanghao.role.id) {
          userWhere.roleId = {
            [Op.or]: tt.zhanghao.role.id.map(ttt => ({ [Op.like]: `%,${ttt},%` })),
          };
          if (tt.cengji !== 1) {
            //地市级的数据，需要选址选择范围，否则能找到其他地市的人员
            const fdns = req.user.deptFdn.split('.');
            const dishiFdn = `${U._.slice(fdns, 0, tt.cengji).join('.')}.%`;
            const include = [{ model: DeptM, require: true, as: 'userdept', where: { fdn: { $like: dishiFdn } } }];
            userList = await UserM.findAll({ where: userWhere, include, limit: 50 });
            //console.log(userList.length);
          } else {
            userList = await UserM.findAll({ where: userWhere, limit: 50 });
            //console.log(userList.length);
          }
          //为了在前端摆放的合适的格子里，需要角色数据
          tt.zhanghao.role.id.forEach(roleId => {
            const roleUserList = userList.filter(one => one.roleId.indexOf(',' + roleId + ',') >= 0);
            if (laowuFenbaoShenpi.readOnly.indexOf(roleId) >= 0) {
              allUserIds = allUserIds.concat(
                roleUserList.map(one => {
                  return one.id;
                })
              );
            } else {
              roleUserList.forEach(mm => {
                toUserNames.push({
                  updatedAt: null,
                  index,
                  userId: mm.id,
                  name: mm.name,
                  color: 'red',
                  roleId: roleId,
                });
              });
            }
          });
        }
      }
      const toUserIds = userList.map(mm => mm.id);
      allUserIds = toUserIds.concat(allUserIds);
      if (ii === 0) {
        req.params.currentUserIds = `,${toUserIds.join(',')},`;
        //req.params.currentUserNames = JSON.stringify(toUserNames);
        otherInfo = {
          creatorId: req.user.id,
          creatorName: req.user.name,
          chuliyijian: '',
          zhuangtai: '待办',
        };
      }
      if (ii === 1) {
        req.params.toUserIds = ',' + toUserIds.join(',') + ',';
        //req.params.toUserNames = JSON.stringify(toUserNames);
      }
      replys.push(
        Object.assign(
          {
            shenpiContent: tt.neirong,
            shenpiDept: tt.bumen,
            zhuangtai: '经办',
            shenpiType: tt.shenpiType || '多批',
            index,
            toUserIds: ',' + toUserIds.join(',') + ',',
            initToUserIds: ',' + toUserIds.join(',') + ',',
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
    //console.log(replys);
    req.replys = replys;
    req.toUserNames = toUserNames;
    next();
  },
  // fillOtherInfo,
  (req, res, next) => {
    // 创建新工单。
    req.res_no_send = true;
    req.params.zhanghao = '未提交';
    const aa = helper.rest.add(mainModel, null, 'mainModel');
    aa(req, res, () => {
      req.params.shenpiId = req.hooks.mainModel.id;
      //req.params.title = `中移建设有限公司河南分公司${(req.user.cityDept || {}).name || ''}分公司工劳务外包审批`;
      const bb = helper.rest.add(U.model('laowuFenbaoShenpiNeirong'), null, 'neirong');
      bb(req, res, error => {
        if (error) {
          next(error);
        } else {
          req.hooks.mainModel.update({
            searchString: JSON.stringify(U._.omit(req.hooks.neirong.get(), ['fujian', 'createdAt', 'updatedAt'])),
          });
          const replys = req.replys.map(rr => {
            rr.shenpiId = req.hooks.mainModel.id;
            return rr;
          });
          U.model('laowuFenbaoShenpiMingxi')
            .bulkCreate(replys)
            .then(() => {
              const toUsers = req.toUserNames.map(rr => {
                return { ...rr, shenpiId: req.hooks.mainModel.id };
              });
              mShenpiUser.bulkCreate(toUsers);
              res.send(req.hooks.mainModel);
              next();
            });
        }
      });
    });
  },
  // helper.checker.sysAdmin(),
];

const detail = [
  helper.getter(mainModel, 'modelName'),
  helper.assert.exists('hooks.modelName'),
  (req, res, next) => {
    if (!req.user.isAdmin && req.hooks['modelName'].allUserIds.indexOf(`,${req.user.id},`) < 0) {
      next(U.error('请求的数据不存在或您没权限处理!'));
      return;
    }

    const item = req.hooks.modelName.get();
    U.model('laowuFenbaoShenpiNeirong')
      .findOne({ where: { shenpiId: item.id } })
      .then(lwInfo => {
        mShenpiMingxi.findAll({ where: { shenpiId: item.id }, order: [['id', 'desc']] }).then(results => {
          mShenpiUser.findAll({ where: { shenpiId: item.id, isDelete: 0 } }).then(toUserNames => {
            item.historyList = results.map(rr => {
              return { ...rr.get(), toUserNames: toUserNames.filter(one => one.index === rr.index) };
            });
            res.send(Object.assign({}, item, lwInfo.get(), { id: item.id }));
            next();
          });
        });
        // mainModel.update({ zhuangtai: '已读' }, { where: { zhuangtai: '未读', id: item.id } }).then(() => {
        // });
      });
  },
];

const remove = [
  helper.getter(mainModel, 'modelName'),
  helper.assert.exists('hooks.modelName'),
  (req, res, next) => {
    U.model('laowuFenbaoShenpiNeirong').destroy({ where: { shenpiId: req.params.id } });
    U.model('laowuFenbaoShenpiMingxi').destroy({ where: { shenpiId: req.params.id } });
    U.model('laowuFenbaoShenpiUser').destroy({ where: { shenpiId: req.params.id } });
    next();
  },
  helper.rest.remove.hook('modelName').exec(),
];

module.exports = {
  list,
  detail,
  modify,
  remove,
  add,
};
