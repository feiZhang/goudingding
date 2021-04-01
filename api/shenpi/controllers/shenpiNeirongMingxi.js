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

    const list = [
        // helper.checker.sysAdmin(),
        async (req, res, next) => {
            const ShenpiNeirongMingxi = model(
                `${name}Neirong_${(req.params.shenpiType || '').toLowerCase()}_${(shenpiConfig[req.params.shenpiType] || {}).neirongType}`
            );
            const aa = helper.rest.list(ShenpiNeirongMingxi, '', null, 'list_data');
            aa(req, res, error => {
                if (error) return next(error);
                res.send({
                    data: req.hooks.list_data,
                    count: res.header('X-Content-Record-Total') || 0,
                });
                next();
            });
        },
    ];

    const modify = [
        async (req, res, next) => {
            if (!req.params.id) {
                return next(U.error('非法请求！'));
            }
            req.ShenpiNeirongMingxi = model(`${name}Neirong_${(req.params.shenpiType || '').toLowerCase()}_${shenpiConfig[req.params.shenpiType].neirongType}`);
            const aa = helper.getter(req.ShenpiNeirongMingxi, 'modelName');
            aa(req, res, next);
        },
        helper.assert.exists('hooks.modelName'),
        async (req, res, next) => {
            const bb = helper.rest.modify(req.ShenpiNeirongMingxi, 'modelName');
            bb(req, res, next);
        },
    ];

    const add = [
        async (req, res, next) => {
            const ShenpiNeirongMingxi = model(
                `${name}Neirong_${(req.params.shenpiType || '').toLowerCase()}_${shenpiConfig[req.params.shenpiType].neirongType}`
            );
            const aa = helper.rest.add(ShenpiNeirongMingxi, null);
            aa(req, res, next);
        },
    ];

    const detail = [
        async (req, res, next) => {
            if (!req.params.id) {
                next(U.error('非法请求！'));
            }
            const ShenpiNeirongMingxi = model(
                `${name}Neirong_${(req.params.shenpiType || '').toLowerCase()}_${shenpiConfig[req.params.shenpiType].neirongType}`
            );
            const aa = helper.rest.list(ShenpiNeirongMingxi);
            aa(req, res, next);
        },
    ];

    const remove = [
        async (req, res, next) => {
            if (!req.params.id) {
                return next(U.error('非法请求！'));
            }
            const ShenpiNeirongMingxi = model(
                `${name}Neirong_${(req.params.shenpiType || '').toLowerCase()}_${shenpiConfig[req.params.shenpiType].neirongType}`
            );
            const aa = helper.getter(ShenpiNeirongMingxi, 'modelName');
            aa(req, res, next);
        },
        helper.assert.exists('hooks.modelName'),
        helper.rest.remove.hook('modelName').exec(),
    ];

    return {
        list,
        detail,
        modify,
        remove,
        add,
        helper,
    };
};
