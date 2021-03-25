/* eslint-disable max-len */
/**
 * req.viewShenpi = true  能够查看所有审批数据
 */
const _ = require('lodash');
const moment = require('moment');
const tools = require('../../../tools');
const commonLib = tools({});

module.exports = config => {
    const {
        shenpiConfig,
        U: { rest, error, model, sms },
        config: sysConfig,
    } = config;
    const { helper } = rest;
    const Sequelize = rest.Sequelize;
    const Op = Sequelize.Op;
    const { name = 'shenpi', userModelName = 'user', deptModelName = 'dept' } = shenpiConfig;
    // console.log(name, model, shenpiConfig);
    if (!name) return {};
    const mShenpi = model(name);
    const mShenpiMingxi = model(`${name}Mingxi`);
    const mShenpiBuzhou = model(`${name}Buzhou`);
    const getAllUserIds = ({ curV, oldV, newV }) => {
        _.pullAll(curV, _.difference(oldV, newV));
        return _.union(curV, newV);
    };

    const shenpiLiucheng = async (req, res, next) => {
        // 生成流程数据。
        const buzhous = [];
        const UserM = model(userModelName);
        const DeptM = model(deptModelName);
        let allUserIds = [];
        let nextToUsers = JSON.stringify([]);
        let nextSelectUser = 0;
        const shenpiLiucheng = [];
        shenpiConfig[req.params.shenpiType].liucheng.forEach(level => {
            level.liucheng.forEach(one => {
                shenpiLiucheng.push({ ...one, cengji: one.cengji || level.cengji });
            });
        });
        req.params.neirongType = shenpiConfig[req.params.shenpiType].neirongType || '';
        // console.log(JSON.stringify(shenpiConfig),allUserIds, 'shenpiLiucheng');
        // 为了方便生成nextToUser倒序来
        let allUserNames = [];
        for (let ii = shenpiLiucheng.length - 1; ii >= 0; ii -= 1) {
            const toUserNames = [];
            let otherInfo = {};
            // 不进行复制的话，下面的 tt.zhanghao.role 在设置的时候，会直接更新原始变量
            // 导致 tt.zhanghao.role instanceof Function  不起作用。
            // 在control中，不在具体方法中的头部信息，应该是只执行一次。导致config信息是全生命周期变量注入。
            const tt = _.cloneDeep(shenpiLiucheng[ii]);
            let userWhere = {};
            const deptWhere = {};
            const index = ii + 1;
            let userList = [];
            // 发起人
            if (tt.zhanghao.isme !== undefined) {
                userList = [req.user];
                toUserNames.push({ updatedAt: null, index, userId: req.user.id, name: req.user.name, color: 'red', roleId: tt.zhanghao.isme });
            } else if (tt.zhanghao.role) {
                if (tt.zhanghao.role instanceof Function) {
                    tt.zhanghao.role = await tt.zhanghao.role({ data: req.params, user: req.user, liucheng: shenpiLiucheng, index: ii });
                    // 为了兼容历史配置，进行判定。比如：函数直接返回 false;
                    // tt.zhanghao.role = rvRole.id ? rvRole : { id: rvRole };
                }
                // console.log(tt, tt.zhanghao.role.id, 'check', req.user.dept_id, req.user.role_id, req.user.role_id.indexOf(94));
                if (tt.zhanghao.role === false || tt.zhanghao.role.id === false) {
                    // 有些步骤根据情况，可以跳过。
                    // eslint-disable-next-line no-continue
                    continue;
                }
                if (Array.isArray(tt.zhanghao.role.id) && tt.zhanghao.role.id.length > 0) {
                    userWhere.roleId = {
                        $or: tt.zhanghao.role.id.map(ttt => ({ $like: `%,${ttt},%` })),
                    };
                }
                // 指定同一角色的某个人。
                if (Array.isArray(tt.zhanghao.role.accountId)) {
                    userWhere.id = {
                        $in: tt.zhanghao.role.accountId,
                    };
                }
                if (Array.isArray(tt.zhanghao.role.dutyId)) {
                    userWhere.dutyId = {
                        $in: tt.zhanghao.role.dutyId,
                    };
                }
                if (tt.zhanghao.role.userWhere) {
                    userWhere = tt.zhanghao.role.userWhere;
                }
                if (tt.zhanghao.role.deptFdn) {
                    deptWhere.fdn = { $like: tt.zhanghao.role.deptFdn };
                }
                // 在代码里面配置，这里就不需要了。也不用写dept_id了。
                // UserM.belongsTo(DeptM, { foreignKey: 'dept_id', sourceKey: 'id', as: 'userdept', scope: { isDelete: 'no' } });
                console.log('shenpiBuzhou', JSON.stringify(shenpiLiucheng[ii]), JSON.stringify(tt), userWhere, deptWhere);
                if (tt.cengji > 0) {
                    // 地市级的数据，需要选址选择范围，否则能找到其他地市的人员
                    const fdns = (req.user.deptFdn || req.user.dept_fdn || '').split('.');
                    // 如果是省分的机关，则下沉一层。
                    const dishiFdn = `${_.slice(fdns, 0, (fdns[1] || '').toString() === '24968' ? Number(tt.cengji) + 1 : tt.cengji).join('.')}.%`;
                    const include = [{ model: DeptM, require: true, as: 'userdept', where: { fdn: { $like: dishiFdn } } }];
                    userList = await UserM.findAll({ where: userWhere, include, limit: 50 });
                    // console.log(userList.length);
                } else {
                    const include = [{ model: DeptM, require: true, as: 'userdept', where: deptWhere }];
                    userList = await UserM.findAll({ where: userWhere, include, limit: 50 });
                    // console.log(userList.length);
                }
                if (!Array.isArray(tt.zhanghao.role.id)) {
                    userList.forEach(mm => {
                        toUserNames.push({
                            updatedAt: null,
                            index,
                            deptName: mm.userdept.name,
                            userId: mm.id,
                            name: mm.name,
                            color: 'red',
                            roleId: 0,
                        });
                    });
                } else {
                    // 为了在前端摆放的合适的格子里，需要角色数据，
                    // 遍历这个角色数据，是为了说明此用户是以那个角色被选中的，一个用户可以以多个角色参与流程审批。
                    // 但是审批意见要填在对应的角色中。
                    // 上面的UserList只是用户列表，如果一个用户的多个角色参与，就需要生成多条，
                    // eslint-disable-next-line no-loop-func
                    tt.zhanghao.role.id.forEach(roleId => {
                        const roleUserList = userList.filter(one => one.roleId.indexOf(`,${roleId},`) >= 0);
                        if (shenpiConfig[req.params.shenpiType].readOnly.indexOf(roleId) < 0) {
                            roleUserList.forEach(mm => {
                                const haveUser = _.find(toUserNames, { userId: mm.id });
                                if (!haveUser)
                                    toUserNames.push({
                                        updatedAt: null,
                                        index,
                                        deptName: mm.userdept.name,
                                        userId: mm.id,
                                        name: mm.name,
                                        color: 'red',
                                        roleId,
                                        tongbuShenpi: tt.tongbuShenpi || 0,
                                    });
                            });
                        }
                    });
                }
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
                        selectUser: nextSelectUser,
                        zhuangtai: '经办',
                        shenpiType: tt.shenpiType || '单批',
                        index,
                        tongbuShenpi: tt.tongbuShenpi || 0,
                        toUserIds: `,${toUserIds.join(',')},`,
                        initToUserIds: `,${toUserIds.join(',')},`,
                        // toUserNames: JSON.stringify(toUserNames),
                        // initToUserNames: JSON.stringify(toUserNames),
                        nextToUsers,
                    },
                    otherInfo
                )
            );
            nextToUsers = JSON.stringify(toUserNames);
            nextSelectUser = tt.selectUser || 0;
        }
        req.params.allUserIds = `,${allUserIds.join(',')},`;
        // 用户生成步骤和明细的数组。
        req.buzhous = buzhous;
        console.log('shenpiBuzhouNeirong', req.buzhous);
        const formatMingxi = shenpiConfig[req.params.shenpiType].formatMingxi;
        req.toUserNames = formatMingxi ? formatMingxi(allUserNames) : allUserNames;
        next();
    };
    const shenpiLiuchengSave = async (req, res, next) => {
        if (req.isAdd) {
            // 新增时候生成的审批步骤
            const buzhous = req.buzhous.map(rr => {
                rr.shenpiId = req.params.shenpiId;
                return rr;
            });
            await mShenpiBuzhou.bulkCreate(buzhous);
            const toUsers = req.toUserNames.map(rr => ({ ...rr, shenpiId: req.hooks.mShenpi.id }));
            console.log('shenpiMingxiNeirong', toUsers);
            await mShenpiMingxi.bulkCreate(toUsers);
            res.send(req.hooks.neirong);
        } else {
            // 修改
            const buzhouId = [];
            for (const one of req.buzhous) {
                const tBuzhou = await mShenpiBuzhou.findOne({ where: { shenpiId: req.params.shenpiId, index: one.index } });
                if (tBuzhou) {
                    await tBuzhou.update(one);
                    buzhouId.push(tBuzhou.id);
                } else {
                    const n = await mShenpiBuzhou.build({ ...one, shenpiId: req.params.shenpiId }).save();
                    buzhouId.push(n.id);
                }
            }
            await mShenpiBuzhou.destroy({ where: { shenpiId: req.params.shenpiId, id: { $notIn: buzhouId } } });

            const mingxiId = [];
            for (const one of req.toUserNames) {
                const tmingxi = await mShenpiMingxi.findOne({
                    where: { shenpiId: req.params.shenpiId, userId: one.userId, index: one.index, roleId: one.roleId },
                });
                if (tmingxi) {
                    await tmingxi.update(one);
                    mingxiId.push(tmingxi.id);
                } else {
                    const n = await mShenpiMingxi.build({ ...one, shenpiId: req.params.shenpiId }).save();
                    // console.log(n);
                    mingxiId.push(n.id);
                }
            }
            await mShenpiMingxi.destroy({ where: { shenpiId: req.params.shenpiId, id: { $notIn: mingxiId } } });
        }
        next();
    };

    const list = [
        // helper.checker.sysAdmin(),
        async (req, res, next) => {
            // if (!req.params.shenpiType || !model(`${name}Neirong_${(req.params.shenpiType || '').toLowerCase()}`)) {
            //   return next(error('非法请求'));
            // }
            req.params.shenpiId = 0;
            _options = {};
            // 代办的
            if (req.params.sendToMy) {
                if (req.params.isHistory) {
                    // 允许省公司人员或劳务订单查看人员	查看本部门相关的订单。
                    // 如果使用配置得readOnly将查看人员加入allUser，会导致，后面添加的查看人员，无法查看角色分配之前的数据。
                    if (req.viewShenpi !== true) {
                        req.params.allUserIds_like = `%,${req.user.id},%`;
                        // req.params.currentUserIds_notLike = `%,${req.user.id},%`;
                    }
                    if (!req.params.zhuangtais) req.params.zhuangtais = '已结束,办理中';
                } else {
                    _options.where = {
                        [Op.or]: [
                            { currentUserIds: { [Op.like]: `%,${req.user.id},%` }, zhuangtai: '办理中' },
                            { creatorId: req.user.id, zhuangtai: '未提交' },
                        ],
                    };
                }
            } else if (!req.user.isAdmin) {
                req.params.creatorId = req.user.id;
            }
            // req.params.includes = 'neirong';
            if (req.params.includes) req.params.includes += ',tagsData';
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
            const tList = helper.rest.list(mShenpi, '', null, 'list_data', _options);
            tList(req, res, next);
        },
        async (req, res, next) => {
            const workIds = req.hooks.list_data.map(tt => tt.id);
            const buzhous = req.params.haveBuzhou ? await mShenpiBuzhou.findAll({ where: { shenpiId: { $in: workIds } }, order: [['id', 'desc']] }) : [];
            const neirongs = req.params.haveNeirong
                ? (await model(`${name}Neirong_${(req.params.shenpiType || '').toLowerCase()}`).findAll({ where: { shenpiId: { $in: workIds } } })).map(one =>
                      one.get()
                  )
                : [];
            // console.log(_.find(neirongs, { shenpiId: 1 }), buzhous);
            res.send({
                data: req.hooks.list_data.map(tt => {
                    const ee = tt.get();
                    ee.tagsData = ee.tagsData || ee.innerTagsData;
                    ee.buzhous = (buzhous || []).filter(one => one.shenpiId === tt.id);
                    return { ...(_.find(neirongs, { shenpiId: tt.id }) || {}), ...ee };
                }),
                count: res.header('X-Content-Record-Total') || 0,
            });
            next();
        },
    ];

    const modify = [
        async (req, res, next) => {
            if (req.params.doType === 'reply') {
                const mainData = await mShenpi.findById(req.params.shenpiId);
                if (!mainData) {
                    return next(error('非法请求!'));
                }
                if ((mainData.currentUserIds || '').indexOf(`,${req.user.id},`) < 0) {
                    next(error('此审批还没到您的处理步骤，或您已处理!'));
                    return;
                }
                const isMyMingxi = await mShenpiMingxi.findOne({
                    where: { shenpiId: req.params.shenpiId, userId: req.user.id, roleId: req.params.roleId, index: req.params.index, isDelete: 0 },
                });
                if (!isMyMingxi) {
                    next(error('请求的数据不存在或您没权限处理或还没到您处理步骤或您已处理!'));
                } else if (isMyMingxi.color !== 'red') {
                    next(error('此步骤您已处理，请刷新查看!'));
                }
                const currentStep = await mShenpiBuzhou.findOne({
                    where: { id: req.params.id, zhuangtai: '待办', toUserIds: { $like: `%,${req.user.id},%` } },
                });
                if (!currentStep) {
                    next(error('请求的数据不存在或您没权限处理或还没到您处理步骤或您已处理!'));
                    return;
                }
                let smsUserIds = [];
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
                        // 驳回直接进入修改状态。
                        mainData.zhuangtai = '未提交';
                        // 返回给第一人，发起人
                        smsUserIds = qianyige.toUserIds.split(',');
                        await qianyige.update({ zhuangtai: '待办' });
                        await mainData.save();
                        break;
                    }
                    case 'tongyi': {
                        currentStep.toUserNames = await mShenpiMingxi.findAll({
                            where:
                                currentStep.tongbuShenpi > 0
                                    ? { shenpiId: req.params.shenpiId, tongbuShenpi: currentStep.tongbuShenpi, isDelete: 0 }
                                    : { shenpiId: req.params.shenpiId, index: currentStep.index, isDelete: 0 },
                        });
                        let gotoNext = true;
                        currentStep.toUserNames.forEach(one => {
                            // 一个人会有多个角色，前端要传递参数，此次审批的是哪个角色
                            // console.log(one.get(), req.user.id, req.params.roleId, currentStep.shenpiType);
                            const isMyShenpi = one.userId === req.user.id && one.roleId === req.params.roleId && one.index === req.params.index;
                            if (isMyShenpi) {
                                one.banliyijian = req.params.banliyijian;
                                one.color = 'black';
                                one.updatedTime = moment().format('YYYY-MM-DD HH:mm:ss');
                                one.save();
                            } else if (currentStep.shenpiType === '单批' && one.index === currentStep.index) {
                                one.color = 'green';
                                one.save();
                            }

                            if (one.color === 'red') {
                                gotoNext = false;
                            }
                        });
                        // console.log(JSON.stringify(currentStep.toUserNames), gotoNext, 11);
                        // 减少当前处理人
                        if (gotoNext) {
                            // 支持下一个是多个部门一块审批
                            const xiayiges2 = await mShenpiBuzhou.findAll({
                                where: { shenpiId: req.params.shenpiId, zhuangtai: '经办', index: { $gt: currentStep.index } },
                                order: [['index', 'asc']],
                            });
                            if (xiayiges2.length > 0) {
                                mainData.currentUserIds = [];
                                const firstXiayige = xiayiges2[0];
                                const xiayiges =
                                    firstXiayige.tongbuShenpi > 0 ? xiayiges2.filter(one => one.tongbuShenpi === firstXiayige.tongbuShenpi) : [firstXiayige];
                                for (const xiayige of xiayiges) {
                                    xiayige.zhuangtai = '待办';
                                    mainData.zhuangtai = '办理中';
                                    // 如果下一步是多人，前端可以选择下一步处理人。这是选定的下一步处理人
                                    if (Array.isArray(req.params.nextUserIds)) {
                                        const oldV = xiayige.toUserIds.split(',');
                                        const tNextUserIds = _.intersection(oldV, req.params.nextUserIds.map(one => one.userId.toString()));
                                        mainData.allUserIds = `,${getAllUserIds({
                                            curV: mainData.allUserIds.split(','),
                                            oldV,
                                            newV: tNextUserIds,
                                        })
                                            .filter(one => one !== '')
                                            .join(',')},`;
                                        xiayige.toUserIds = `,${tNextUserIds.join(',')},`;
                                        await mShenpiMingxi.update({ isDelete: 1 }, { where: { index: xiayige.index, userId: { $notIn: tNextUserIds } } });
                                    }
                                    // 如果传递了下一步的人员，上面已经格式化过了。
                                    // 这个字段作废掉
                                    // mainData.currentUserNames = Array.isArray(xiayige.toUserNames) ? JSON.stringify(xiayige.toUserNames) : xiayige.toUserNames;
                                    mainData.currentUserIds = mainData.currentUserIds.concat(xiayige.toUserIds.split(','));
                                    await xiayige.save();
                                    smsUserIds = smsUserIds.concat(xiayige.toUserIds.split(','));
                                }
                                mainData.currentUserIds = `,${mainData.currentUserIds.join(',')},`;
                                currentStep.zhuangtai = '已办';
                                await currentStep.save();
                                await mainData.save();
                            } else {
                                mainData.currentUserIds = ',,';
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
                if (shenpiConfig[mainData.shenpiType].sendSms && smsUserIds.length > 0) {
                    model(userModelName)
                        .findAll({ where: { id: { $in: smsUserIds } } })
                        .then(users => {
                            if (users.length > 0) {
                                const userTels = users.map(one => one.telno).join(',');
                                mShenpi.findOne({ where: { id: req.params.shenpiId } }).then(tShenpiInfo => {
                                    if (tShenpiInfo) {
                                        const smsParams = shenpiConfig[mainData.shenpiType].sendSms(tShenpiInfo);
                                        sms.sendSMS({
                                            PhoneNumbers: userTels,
                                            SignName: '河南铁通',
                                            TemplateCode: 'SMS_155856246',
                                            TemplateParam: '',
                                            ...smsParams,
                                        }).then(
                                            results => {
                                                const { Code } = results;
                                                const smsInfo = users.map(one => ({
                                                    userId: one.id,
                                                    deptId: one.deptId,
                                                    renliId: one.renliId,
                                                    type: `Shenpi_${mainData.shenpiType}`,
                                                    telno: one.telno,
                                                    content: smsParams.TemplateParam,
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
                                                const smsInfo = users.map(one => ({
                                                    userId: one.id,
                                                    deptId: one.deptId,
                                                    renliId: one.renliId,
                                                    type: `Shenpi_${mainData.shenpiType}`,
                                                    telno: one.telno,
                                                    content: smsParams.TemplateParam,
                                                    zhuangtai: 'error',
                                                    beizhu: JSON.stringify(err),
                                                }));
                                                model('smsSend').bulkCreate(smsInfo);
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
                const shenpiInfo = await mShenpi.findById(req.params.shenpiId || 0);
                if (!shenpiInfo || ['已结束', '办理中'].indexOf(shenpiInfo.zhuangtai) >= 0) {
                    return next(error('非法请求!'));
                }
                req.params.shenpiType = shenpiInfo.shenpiType;
                req.mShenpiNeirong = model(`${name}Neirong_${(shenpiInfo.shenpiType || '').toLowerCase()}`);
                if (!req.mShenpiNeirong) {
                    return next(error('非法请求!'));
                }
                await shenpiLiucheng(req, res, () => {});
                await shenpiLiuchengSave(req, res, () => {});
                req.mShenpiNeirong.findById(req.params.id).then(gdInfo => {
                    if (gdInfo) {
                        req.hooks.neirong = gdInfo;
                        mShenpi.update(
                            {
                                searchString: JSON.stringify(_.omit(req.hooks.neirong.get(), ['fujian', 'createdAt', 'updatedAt'])),
                                shenpiTitle: gdInfo.gaishu ? gdInfo.gaishu() : '',
                                no: req.params.no,
                                allUserIds: req.params.allUserIds,
                            },
                            { where: { id: req.params.shenpiId } }
                        );
                        const aa = helper.rest.modify(req.mShenpiNeirong, 'neirong');
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
            if (!req.mShenpiNeirong) {
                return next(error('非法请求'));
            }
            // console.log(`${name}Neirong_${(req.params.shenpiType || '').toLowerCase()}`, req.mShenpiNeirong);
            // eslint-disable-next-line no-constant-condition
            if (
                req.user.shenpi != undefined &&
                !req.user.shenpi['all'] &&
                !req.user.shenpi[name] &&
                !req.user.shenpi[`${name}_${(req.params.shenpiType || '').toLowerCase()}`]
            ) {
                return next(error('你没有这个权限!'));
            }
            const userCityInfo = req.user.cityInfo || req.user.cityDept || {};
            req.params.cityName = userCityInfo.name;
            req.params.cityId = userCityInfo.renliId;
            req.params.creatorCityName = userCityInfo.name || '';

            if (req.params.baseNo !== false) {
                const baseNo = req.params.baseNo
                    ? req.params.baseNo
                    : `${(config.config.CITY_JC || {})[req.params.cityId] || 'WZ'}${moment().format('YYYYMM')}`;
                req.params.no = await commonLib.generateNo({ baseNo, noModel: model('no'), type: `shenpi_${req.params.shenpiType}` });
            }
            next();
        },
        shenpiLiucheng,
        // fillOtherInfo,
        (req, res, next) => {
            // 创建新工单。
            req.res_no_send = true;
            req.params.zhuangtai = '未提交';
            // console.log(req.params, 333);
            req.isAdd = true;
            const aa = helper.rest.add(mShenpi, null, 'mShenpi');
            aa(req, res, async err1 => {
                if (err1) {
                    next(err1);
                    return;
                }
                req.params.shenpiId = req.hooks.mShenpi.id;
                if (req.hooks.mShenpi.neirongType != '' && req.hooks.mShenpi.neirongType != '单条内容') {
                    const duotiaoNeirongM = model(`${name}Neirong_${(req.params.shenpiType || '').toLowerCase()}_${req.hooks.mShenpi.neirongType}`);
                    console.log(`${name}Neirong_${(req.params.shenpiType || '').toLowerCase()}_${req.hooks.mShenpi.neirongType}`);
                    await duotiaoNeirongM.update({ shenpiId: req.params.shenpiId }, { where: { creatorId: req.user.id, shenpiId: 0 } });
                    next();
                }
                // 单内容审批
                const bb = helper.rest.add(req.mShenpiNeirong, null, 'neirong');
                bb(req, res, async err => {
                    if (err) {
                        next(err);
                        return;
                    }
                    await req.hooks.mShenpi.update({
                        searchString: JSON.stringify(_.omit(req.hooks.neirong.get(), ['fujian', 'createdAt', 'updatedAt'])),
                        shenpiTitle: req.hooks.neirong.gaishu ? req.hooks.neirong.gaishu() : '',
                    });
                    next();
                });
            });
        },
        shenpiLiuchengSave,
        // helper.checker.sysAdmin(),
    ];

    const detail = [
        helper.getter(mShenpi, 'modelName'),
        helper.assert.exists('hooks.modelName'),
        async (req, res, next) => {
            // req.viewShenpi 是在组件之外设置的，特殊能查看数据的人权，比如admin
            if (!req.viewShenpi && req.hooks.modelName.allUserIds.indexOf(`,${req.user.id},`) < 0) {
                next(error('请求的数据不存在或您没权限处理!'));
                return;
            }

            req.params.shenpiType = req.hooks.modelName.shenpiType;
            req.mShenpiNeirong = model(`${name}Neirong_${req.params.shenpiType.toLowerCase()}`);
            if (!req.params.shenpiType || !req.mShenpiNeirong) {
                return next(error('非法请求'));
            }
            return next();
        },
        async (req, res, next) => {
            const item = req.hooks.modelName.get();
            // 有可能是多数据,多条数据编辑时用此不能实时获取。 await req.mShenpiNeirong.findAll({ where: { shenpiId: item.id } })
            let neirongList = [];
            if (item.neirongType != '' && item.neirongType != '单条内容') {
                neirongList = await model(`${name}Neirong_${req.params.shenpiType.toLowerCase()}_${item.neirongType}`).findAll({
                    where: { shenpiId: item.id },
                });
            }
            const neirongXinxi = await req.mShenpiNeirong.findOne({ where: { shenpiId: item.id } });
            mShenpiBuzhou.findAll({ where: { shenpiId: item.id }, order: [['index', 'asc']] }).then(results => {
                mShenpiMingxi.findAll({ where: { shenpiId: item.id, isDelete: 0 } }).then(toUserNames => {
                    item.historyList = results.map(rr => ({ ...rr.get(), toUserNames: toUserNames.filter(one => one.index === rr.index) }));
                    res.send(Object.assign({}, item, neirongXinxi.get(), { neirongList }));
                    next();
                });
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
            if (item.neirongType && item.neirongType != '') {
                const shenpiMingxiModel = model(`${name}Neirong_${item.shenpiType.toLowerCase()}_${item.neirongType}`);
                shenpiMingxiModel.destroy({ where: { shenpiId: req.params.id } });
            }
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
