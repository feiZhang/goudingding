module.exports = ({ mainModel, helper, U }) => {
  const list = [
    // helper.checker.sysAdmin(),
    helper.rest.list(mainModel, '', null, 'list_data'),
    (req, res) => {
      res.send({ data: req.hooks.list_data, count: res.header('X-Content-Record-Total') || 0 });
    },
  ];

  const modify = [
    helper.getter(mainModel, 'modelName'),
    helper.assert.exists('hooks.modelName'),
    [
      // helper.checker.ownSelf('id', 'modelName'),
      // helper.checker.sysAdmin(),
    ],
    helper.rest.modify(mainModel, 'modelName'),
  ];

  const remove = [
    // helper.checker.sysAdmin(),
    helper.getter(mainModel, 'modelName'),
    helper.assert.exists('hooks.modelName'),
    helper.rest.remove.hook('modelName').exec(),
  ];

  const detail = [
    (req, res, next) => {
      if (req.params.id) {
        next();
      } else {
        next(U.error('非法请求！'));
      }
    },
  ].concat(list);

  const add = [
    // helper.checker.sysAdmin(),
    helper.rest.add(mainModel),
  ];

  const deptDataFilter = (searchDepts = false) => async (req, res, next) => {
    const Sequelize = U.rest.Sequelize;
    if (req.params.searchDeptId) {
      if (req.user.isAreaManager || req.user.isAdmin || req.user.isAllManager || searchDepts) {
        const theDept = await U.model('dept').findById(req.params.searchDeptId);
        if (theDept) {
          req.params.searchDeptInfo = theDept;
          const allDept = await U.model('dept').findAll({ where: { fdn: { [Sequelize.Op.like]: `${theDept.fdn}%` } } });
          const sIds = allDept.map(one => one.id);
          // console.log(searchDepts, sIds, 222);
          if (searchDepts) {
            req.params.deptIds = U._.intersection(searchDepts, sIds).join(',');
          } else if (req.user.isAdmin || req.user.isAllManager) {
            req.params.deptIds = sIds.join(',');
          } else if (req.user.isAreaManager) {
            req.params.deptIds = U._.intersection(req.user.isAreaManager.manageDeptIds, sIds).join(',');
          } else {
            req.params.deptIds = 0;
          }
          //   where.toDeptId = { [Op.in]: Sequelize.literal(`(SELECT id FROM dept WHERE fdn LIKE "${theDept.fdn}%")`) };
        } else {
          req.params.deptIds = 0;
        }
      } else {
        req.params.deptIds = Number(req.params.searchDeptId) === Number(req.user.deptId) ? req.params.searchDeptId : '0';
      }
    } else if (!req.user.isAdmin && !req.user.isAllManager) {
      if (searchDepts) {
        req.params.deptIds = searchDepts.join(',');
      } else if (req.user.isAreaManager) {
        req.params.deptIds = req.user.isAreaManager.manageDeptIds.join(',');
      } else {
        req.params.deptIds = req.user.deptId;
      }
    }
    next();
  };

  const deptList = (haveDelete = false) => async (req, res, next) => {
    const mDept = U.model('dept');
    const d = await mDept.findAll({
      attributes: ['renliId', 'id', 'orderNum', 'name', 'fdnLevel', 'fullName', 'fdn'],
      paranoid: !haveDelete,
      order: [['fdnLevel', 'asc'], ['orderNum', 'asc']],
    });
    const cityList = { 0: { id: 0, cityId: 0, cityName: '其他', orderNum: 0, name: '其他' } };
    const wfqList = {
      0: { id: 0, cityId: 0, cityName: '其他', orderNum: 0, wfqId: 0, wfqName: '其他', name: '其他' },
    };
    const wgList = {
      0: { id: 0, cityId: 0, cityName: '其他', orderNum: 0, wfqId: 0, wfqName: '其他', wgName: '其他', wgId: 0, name: '其他' },
    };
    const wgCantonIdToId = {};
    req.params.searchDeptIds = [0];
    d.forEach(ii => {
      const tempFdn = ii.fdn.split('.');
      if (ii.fdnLevel === 2) {
        cityList[ii.id] = { id: ii.id, cityId: ii.id, cityName: ii.name, orderNum: Number(ii.orderNum), name: ii.name };
      }
      if (ii.fdnLevel === 3) {
        wfqList[ii.id] = Object.assign({}, cityList[tempFdn[1]], { id: ii.id, wfqId: ii.id, wfqName: ii.name, name: ii.name });
      }
      if (ii.fdnLevel === 4) {
        wgCantonIdToId[ii.canton_id] = ii.id;
        wgList[ii.id] = Object.assign({}, wfqList[tempFdn[2]], { id: ii.id, wgName: ii.name, wgId: ii.id, name: ii.name });
      }
    });
    // 生成每个网格的机构信息。
    req.deptList = { city: cityList, wfq: wfqList, wg: wgList };
    next();
  };

  return {
    deptDataFilter,
    deptList,
    list,
    detail,
    modify,
    remove,
    add,
  };
};
