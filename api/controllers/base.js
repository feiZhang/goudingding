module.exports = ({ mainModel, helper, U, importModel }) => {
  const Op = U.rest.Sequelize.Op;
  const list = [
    // helper.checker.sysAdmin(),
    helper.rest.list(mainModel, '', null, 'list_data'),
    (req, res, next) => {
      res.send({ data: req.hooks.list_data, count: res.header('X-Content-Record-Total') || 0 });
      next();
    },
  ];

  const importList = [
    (req, res, next) => {
      if (req.params.baseImportFileId) {
        req.params.importFileId = req.params.baseImportFileId;
      }
      if (req.params.baseFileId) {
        req.params.importFileId = req.params.baseFileId;
      }
      if (req.params.isError && Array.isArray(req.params.isError)) req.params.isError = req.params.isError.join(',');
      else if (req.params.isError) req.params.isError = 1;
      const tlist = helper.rest.list(req.params.baseImportFileId ? importModel : mainModel, '', null, 'list_data');
      tlist(req, res, () => {
        res.send({ data: req.hooks.list_data, count: res.header('X-Content-Record-Total') || 0 });
        next();
      })
    }
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

  /***
   * 根据用户的管理权限，与 要查询的机构，组合出根据机构ID进行数据过滤的功能。
   * user           用户的登录信息
   * searchDeptId   url传递的查询机构id
   * yewuManager    业务管理角色信息
   *
   * 返回值 false:没有查询权限，直接返回空，不用进行数据查询
   *        true:全部权限，不用进行部门过滤
   *        {manageLevel:最大能够查询的级别(暂无用), manageDeptIds(需要附加的查询范围)}
   **/
  const searchDeptCheck = async ({ user = {}, searchDeptId, yewuManager = [], onlySearchDept = false }) => {
    let manageDeptIds = [];
    let manageLevel = 9;
    const isAdmin = user.isAdmin || user.isAllManager;
    // 不是超级管理员，则根据区域管理员管理范围、业务管理员管理范围，进行合并，获取此次查询的基础管理范围。
    if (!isAdmin) {
      if (user.isAreaManager) {
        manageDeptIds = manageDeptIds.concat(user.isAreaManager.manageDeptIds);
        manageLevel = user.isAreaManager.manageLevel;
      }
      yewuManager.map(one => {
        if (user[one]) {
          if (user[one].manageLevel < manageLevel) manageLevel = user[one].manageLevel;
          // console.log(manageDeptIds, user[one].manageDeptIds, 888);
          manageDeptIds = manageDeptIds.concat(user[one].manageDeptIds);
        }
      })
      if (manageDeptIds.length < 1) return false;
    }
    if (searchDeptId) {
      if (!(isAdmin || manageDeptIds.indexOf(searchDeptId) >= 0)) return false;

      const theDept = await U.model('dept').findById(searchDeptId);
      if (theDept && (isAdmin || manageDeptIds.indexOf(theDept.id) >= 0)) {
        if (onlySearchDept) return theDept.get();
        const depts = await U.model('dept').findAll({ where: { fdn: { [Op.like]: `${theDept.fdn}%` } } });
        return { manageLevel, deptInfo: theDept.get(), manageDeptIds: depts.map(one => one.id) };
      }
      return false;
    }
    if (isAdmin || manageLevel === 1) return true;
    return { manageLevel, manageDeptIds: U._.uniq(manageDeptIds) }; // 你最大能够管理的范围，地市、中心、服务站
  }

  const deptDataFilter = (searchDepts = false) => async (req, res, next) => {
    const Sequelize = U.rest.Sequelize;
    if (req.params.searchDeptId) {
      if (req.user.isAreaManager || req.user.isAdmin || req.user.isAllManager || searchDepts) {
        const theDept = await U.model('dept').findById(req.params.searchDeptId);
        if (theDept) {
          req.params.searchDeptInfo = theDept;
          const allDept = await U.model('dept').findAll({ where: { ...(req.deptWhere || {}), fdn: { [Sequelize.Op.like]: `${theDept.fdn}%` } } });
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

  const deptList = ({ haveDelete = false, where = {}, attributes, order }) => async (req, res, next) => {
    const mDept = U.model('dept');
    const d = await mDept.findAll({
      attributes: attributes || ['renliId', 'id', 'orderNum', 'name', 'fdnLevel', 'fullName', 'fdn'],
      paranoid: !haveDelete, where,
      order: order || [['fdnLevel', 'asc'], ['orderNum', 'asc']],
    });
    const cityList = { 0: { id: 0, cityId: 0, cityName: '其他', orderNum: 0, name: '其他' } };
    const wfqList = {
      0: { id: 0, cityId: 0, cityName: '其他', orderNum: 0, wfqId: 0, wfqName: '其他', name: '其他' },
    };
    const wgList = {
      0: { id: 0, cityId: 0, cityName: '其他', orderNum: 0, wfqId: 0, wfqName: '其他', wgName: '其他', wgId: 0, name: '其他' },
    };
    const renliIdToId = {};
    d.forEach(ii => {
      const tempFdn = ii.fdn.split('.');
      if (ii.fdnLevel === 2) {
        cityList[ii.id] = { id: ii.id, cityId: ii.id, cityName: ii.name, orderNum: Number(ii.orderNum), name: ii.name };
      }
      if (ii.fdnLevel === 3) {
        wfqList[ii.id] = Object.assign({}, cityList[tempFdn[1]], { id: ii.id, wfqId: ii.id, wfqName: ii.name, name: ii.name });
      }
      if (ii.fdnLevel === 4) {
        wgList[ii.id] = Object.assign({}, wfqList[tempFdn[2]], { id: ii.id, wgName: ii.name, wgId: ii.id, name: ii.name });
      }
      renliIdToId[ii.canton_id] = ii.id;
    });
    // 生成每个网格的机构信息。
    req.deptList = { city: cityList, wfq: wfqList, wg: wgList, renliIdToId };
    next();
  };

  return {
    deptDataFilter,
    deptList,
    searchDeptCheck,
    list,
    importList,
    detail,
    modify,
    remove,
    add,
    helper,
    Op,
    feifa: (req, res, next) => {
      res.send({ error: '非法请求' });
      next();
    }
  };
};
