module.exports = function ({ mainModel, helper, U }) {
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

  return {
    list,
    detail,
    modify,
    remove,
    add,
  };
};
