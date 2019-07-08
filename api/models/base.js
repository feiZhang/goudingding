/* eslint-disable new-cap */
/* eslint-disable no-nested-ternary */
/* eslint-disable max-len */
const Sequelize = require('sequelize');
const _ = require('lodash');
const moment = require('moment');
const fs = require('fs');
const { exec } = require('child_process');

module.exports = ({ U, config: { service, upload } }) => {
  const formatDbField = (model, fieldName, type, defaultVal = []) => {
    let tValue = model.getDataValue(fieldName);
    if (tValue === undefined) return undefined;
    switch (type) {
      case 'json':
        tValue = !tValue || _.trim(tValue) === '' ? defaultVal : _.isString(tValue) ? JSON.parse(tValue) : tValue;
        break;
      case 'month':
        tValue = tValue ? moment(tValue).format('YYYY-MM') : '';
        break;
      case 'date':
        tValue = tValue ? moment(tValue).format('YYYY-MM-DD') : '';
        break;
      case 'date-month':
        tValue = tValue ? moment(tValue).format('YYYY-MM') : '';
        break;
      case 'date-year':
        tValue = tValue ? moment(tValue).format('YYYY') : '';
        break;
      case 'datetime':
        tValue = tValue ? moment(tValue).format('YYYY-MM-DD HH:mm:ss') : '';
        break;
      case 'files': {
        const list = tValue ? JSON.parse(tValue) : [];
        // console.log("formatDbField1", fieldName, tValue);
        // list = list.map(item => {
        //   if (!item.path) {
        //     //在这里进行path设置，会在数据creater之前，进行path设定，从而让 saveUploadFile 函数在afterCreate中执行，保证获取到数据的id
        //     //数据保存是，从临时上传目录copy文件到实际存放的目标目录
        //     const monthPath = moment().format("YYYYMM");
        //     const dayPath = monthPath + "/" + moment().format("DD");
        //     if (!U.fs.existsSync(config.upload.dir + "/" + monthPath)) U.fs.mkdir(config.upload.dir + "/" + monthPath);
        //     if (!U.fs.existsSync(config.upload.dir + "/" + dayPath)) U.fs.mkdir(config.upload.dir + "/" + dayPath);
        //     item.path = "/" + dayPath;
        //   }
        //   return item;
        // });
        // tValue = JSON.stringify(list);
        // model[fieldName] = tValue;
        let key = '';
        const keyFile = `${upload.dir}/photo.txt`;
        if (fs.existsSync(keyFile)) {
          key = fs.readFileSync(keyFile);
        }
        const formatFile = (fileList) => {
          return fileList.map(item => {
            if (item && item.uid && item.path) {
              item.url = item && item.uid ? `${upload.accessUrl}?notgzip=1&f=${item.path || ''}/${item.uid}&n=${item.name}&key=${key}` : '';
            }
            if (Array.isArray(item.children) && item.children.length > 0) {
              item.children = formatFile(item.children);
            }
            return item;
          });
        }
        tValue = formatFile(list);
        // console.log(tValue, list,18989)
        // tValue = JSON.stringify(list);
        // console.log("formatDbField", fieldName, tValue);
        break;
      }
      default:
        break;
    }
    return tValue;
  };

  const delFileTo = (fileList, haveUids) => {
    fileList.forEach(oldFile => {
      // console.log(uids, oldFile);
      if (oldFile.uid && oldFile.uid !== '' && (haveUids === 'all' || haveUids.indexOf(oldFile.uid) < 0)) {
        try {
          // console.log('rm ' + config.upload.dir + "/" + oldFile.uid);
          console.log(`mv ${upload.dir}${oldFile.path}/${oldFile.uid} ${upload.deleteDir}/`);
          exec(`mv ${upload.dir}${oldFile.path}/${oldFile.uid} ${upload.deleteDir}/`);
          // U.model('uploadFile').destroy({ where: { uid: oldFile.uid } });
          // child_process.exec('rm ' + config.upload.dir + "/" + oldFile.uid);
          // U.fs.unlink(config.upload.dir + "/" + oldFile.uid);  //文件不存在时出错
        } catch (e) {
          console.log(e);
        }
      }
      if (Array.isArray(oldFile.children) && oldFile.children.length > 0) {
        delFileTo(oldFile.children, haveUids);
      }
    });
  }
  return {
    baseAttr: {
      omitNull: false,
      timestamps: true,
      paranoid: true, // 软删除 deletaAt
      freezeTableName: true,
    },
    baseExtAttr: {
      /** 分页设定 */
      pagination: {
        maxResults: 50,
        maxResultsLimit: 999999,
        maxStartIndex: 999999,
      },
      /** sort 设定 */
      sort: {
        default: 'id',
        defaultDirection: 'desc',
        allow: ['id', 'createdAt', 'updatedAt'],
      },
    },
    formatDbField,
    baseField: {
      id: {
        type: Sequelize.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
      },
      // isDelete: {
      //   type: Sequelize.STRING('string', 3),
      //   defaultValue: 'no', allowNull: false
      // },
      creatorName: {
        type: Sequelize.STRING(100),
        allowNull: false,
        defaultValue: '',
        comment: '发布人名，微信名等',
      },
      clientIp: {
        type: Sequelize.STRING(30),
        defaultValue: '',
        allowNull: false,
      },
      creatorId: {
        type: Sequelize.INTEGER.UNSIGNED,
        defaultValue: 0,
        allowNull: false,
      },
      creatorDeptId: {
        type: Sequelize.INTEGER.UNSIGNED,
        defaultValue: 0,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.NOW,
        get() {
          return formatDbField(this, 'createdAt', 'datetime');
        },
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: Sequelize.NOW,
        get() {
          return formatDbField(this, 'updatedAt', 'datetime');
        },
      },
      deletedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        defaultValue: null,
        get() {
          return formatDbField(this, 'deletedAt', 'datetime');
        },
      },
    },

    fdnField: {
      fdnId: {
        // eslint-disable-next-line new-cap
        type: Sequelize.INTEGER(5).ZEROFILL.UNSIGNED,
        defaultValue: 0,
        allowNull: false,
        comment: 'fdn用到的id，初始为cangku_id，进行排序后，修改它来调整fdn的值，id作为主键不能修改',
      },
      fdn: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: '',
        unique: true,
      },
      fdnLevel: {
        type: Sequelize.INTEGER.UNSIGNED,
        defaultValue: 0,
        allowNull: false,
      },
      parentId: {
        type: Sequelize.INTEGER.UNSIGNED,
        defaultValue: 0,
        allowNull: false,
      },
      parentFdn: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: '',
      },
      parentFullName: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: '',
      },
      fullName: {
        type: Sequelize.STRING(64),
        allowNull: false,
        defaultValue: '',
        comment: '根fdn类似的全称',
      },
      enableDelete: {
        type: Sequelize.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 1,
      },
    },

    resetFdnInfo(model) {
      const fdnFenge = '.';
      const fdnNameFenge = '';
      const resetFdn = (parentId, parentFdn, parentFullName) => {
        model
          .update({
            parent_fdn: parentFdn,
            fdn: Sequelize.fn('CONCAT', parentFdn, Sequelize.col('fdn_id'), fdnFenge),
            parent_full_name: parentFullName,
            full_name: Sequelize.fn('CONCAT', parentFullName, Sequelize.col('name'), fdnNameFenge),
          },
            { where: { parent_id: parentId } })
          .then(() => {
            model.findAll({ where: { parent_id: parentId } }).then(results => {
              if (results) {
                results.forEach(item => {
                  resetFdn(item.id, item.fdn, item.full_name);
                });
              }
            });
          });
      };
      resetFdn(0, '', '');
    },

    beforeUpdateFdn(model, options) {
      // 注意，此功能会在afterCreate后触发。此时数据还没有fdn值。
      if (!model.previous('fdn') || model.previous('fdn') == '') return;

      const changed = model.changed();
      // console.log("before_update_fdn",model,77,options,88,fn,"99",changed);
      if (changed) {
        const tableSetStr = [];
        let newFdn = '';
        if (changed.indexOf('fdnId') > -1 && model.previous('fdnId') != 0) {
          newFdn = `${model.parentFdn}${model.fdnId}.`;
          tableSetStr.push('parentFdn=CONCAT(:parentFdn,SUBSTRING(fdn,:len))');
          tableSetStr.push('fdn = CONCAT(:parentFdn,SUBSTRING(fdn,:len))');
          // 必须有这一样，才会更新此字段，否则会被忽略
          options.fields.push('fdn');
          model.fdn = newFdn;
        }
        let newFullName = '';
        if (changed.indexOf('name') > -1 && U._.keys(model.rawAttributes).indexOf('fullName') >= 0) {
          newFullName =
            model.parentFullName === undefined || model.parentFullName === 0 || model.parentFullName === ''
              ? model.name
              : `${model.parentFullName}-${model.name}`;
          tableSetStr.push('parentFullName=CONCAT(:parentFullName,SUBSTRING(parentFullName,:nameLen))');
          tableSetStr.push('fullName = CONCAT(:parentFullName,SUBSTRING(fullName,:nameLen))');

          options.fields.push('fullName');
          model.setDataValue('fullName', newFullName);
        }
        if (tableSetStr.length > 0) {
          // console.log(model.fullName, model.previous('fullName'), `UPDATE ${model._modelOptions.name.singular} SET ${tableSetStr.join(',')}  WHERE fdn LIKE :oldFdn AND id!=:id`);
          model.sequelize.query(`UPDATE ${model._modelOptions.name.singular} SET ${tableSetStr.join(',')}  WHERE fdn LIKE :oldFdn AND id!=:id`, {
            replacements: {
              id: model.id,
              parentFdn: newFdn,
              parentFullName: newFullName,
              nameLen: model.previous('fullName').length + 1,
              len: model.previous('fdn').length + 1,
              oldFdn: `${model.previous('fdn')}%`,
            },
            type: Sequelize.QueryTypes.UPDATE,
          });
        }
      }
    },

    afterCreateFdn(model) {
      // console.log(111,model.rawAttributes)
      model.fdnId = model.id;
      const qianzhui = '0000000'.substr(0, 5 - model.fdnId.toString().length);
      model.fdn = `${model.parentFdn}${qianzhui}${model.fdnId.toString()}.`;
      model.fdnLevel = model.fdn.split('.').length - 1;
      if (_.keys(model.rawAttributes).indexOf('fullName') >= 0) {
        // options.fields.push("full_name");
        // console.log(model.parent_full_name,model.parent_full_name==undefined,model.parent_full_name==0,model.parent_full_name=='');
        model.fullName =
          model.parentFullName === undefined || model.parentFullName === 0 || model.parentFullName === ''
            ? model.name
            : `${model.parentFullName}-${model.name}`;
      }
      const changed = model.changed();
      if (changed) {
        // 必须执行fn，否则不更新数据，直接install结束了。
        return model.save({ fields: changed });
      }
      return true;
    },

    // if (val && val != "") {
    //   const tList = JSON.parse(val);
    //   const nVal = [];
    //   tList.map((tVal) => {
    //     if (tVal.uid && tVal.uid != "") {
    //       let tName = tVal.uid.split(".");
    //       U.mvFile(service.bodyParser.uploadDir + "/" + tName[0], config.upload.uploadDiv + "/" + tVal.uid, (status, file) => {
    //         if (status) {
    //           nVal.push(tVal);
    //         }
    //       })
    //     }
    //   })
    //   this.setDataValue('shenfenzheng_zheng', JSON.stringify(nVal));
    // }
    deleteUploadFile(model) {
      const uploadFields = (model._modelOptions || model.$modelOptions).uploadFields;
      if (uploadFields && Array.isArray(uploadFields) && uploadFields.length > 0) {
        uploadFields.forEach(item => {
          if (model[item] && model[item] !== '') {
            const newFiles = _.isString(model[item]) ? JSON.parse(model[item]) : model[item];
            delFileTo(newFiles, 'all');
            // newFiles.forEach(nF => {
            //   exec(`mv ${upload.dir}${nF.path}/${nF.uid} ${upload.deleteDir}/`);
            // });
          }
        });
      }
    },

    saveUploadFile(model) {
      // console.log(model);
      const mvFileTo = (fileList) => {
        let uids = [];
        // console.log(fileList,'ffff');
        fileList.forEach(nF => {
          if (nF.uid && nF.uid !== '') {
            const tttName = nF.uid.split('.');
            const tFile = `${service.bodyParser.uploadDir}/${tttName[0]}`;
            if (fs.existsSync(tFile)) {
              console.log(`mv ${tFile} ${upload.dir}${nF.path}/${nF.uid}`);
              exec(`mv ${tFile} ${upload.dir}${nF.path}/${nF.uid}`);
              U.model('uploadFile').update(
                Object.assign(nF, {
                  dataId: model.id,
                  dataType: (model._modelOptions || model.$modelOptions).name.singular,
                }),
                { where: { uid: nF.uid } }
              );
              uids.push(nF.uid);
            } else {
              console.log(`no ${tFile} ${upload.dir}${nF.path}/${nF.uid}`);
            }
          }
          if (Array.isArray(nF.children) && nF.children.length > 0) {
            const tt2 = mvFileTo(nF.children);
            // console.log(tt2,nF.children, 222);
            uids = uids.concat(tt2);
          }
        });
        return uids;
      }

      const uploadFields = (model._modelOptions || model.$modelOptions).uploadFields;
      const changed = model.changed();
      if (changed) {
        // console.log("saveUploadFile", model.changed(), uploadFields, options);
        if (uploadFields && Array.isArray(uploadFields) && uploadFields.length > 0) {
          uploadFields.forEach(item => {
            if (changed.indexOf(item) >= 0) {
              let newFiles = [];
              if (model[item] && model[item] !== '') {
                newFiles = _.isString(model[item]) ? JSON.parse(model[item]) : model[item];
                mvFileTo(newFiles);
              }
              const uids = newFiles.map(nFile => nFile.uid);
              if (model.previous(item) && model.previous(item) !== '') {
                // 删除旧的,不要的文件
                const mvFileLists = (_.isString(model.previous(item)) ? JSON.parse(model.previous(item)) : model.previous(item));
                // filePath = file.path.substr(service.bodyParser.uploadDir.length + 1);
                delFileTo(mvFileLists, uids);
              }
            }
          });
        }
      }
    },

    async checkShujuGuanlian(model) {
      const shanchuGuanlian = (model._modelOptions || model.$modelOptions).shanchuGuanlian;
      // console.log('checkShujuGuanlian', shanchuGuanlian);
      if (shanchuGuanlian) {
        for (let one of shanchuGuanlian) {
          const where = one.where || {};
          U._.each(one.fields || {}, (two, key) => {
            where[key] = model[two];
          })
          const have = await U.model(one.modelName).findAll({ where });
          if (have) {
            return model.sequelize.Promise.reject(new Error(typeof one.message === 'function' ? one.message(one, have) : `${one.message}!`));
          }
        }
      }
    },

    async checkUnique(model) {
      const Op = (U.rest.Sequelize || {}).Op;
      const changed = model.changed();
      if (!changed) return true;
      const checkUnique = (model._modelOptions || model.$modelOptions).checkUnique;
      // return model.sequelize.Promise.reject(new Error("I'm afraid I can't let you do that!"));
      if (!Array.isArray(checkUnique) || checkUnique.length < 0) return true;
      for (let i = 0; i < checkUnique.length; ++i) {
        const one = checkUnique[i];
        const where = {};
        const tempCheckValue = [];
        if (model.rawAttributes.isDelete) {
          where.isDelete = 'no';
        }
        let haveChange = false;
        one.fields.forEach(field => {
          where[field] = model[field];
          tempCheckValue.push(model[field]);
          if (!haveChange) haveChange = changed.indexOf(field) >= 0;
          console.log(haveChange, changed, field);
        });
        if (haveChange) {
          if (!(Array.isArray(one.noCheck) && one.noCheck.indexOf(tempCheckValue.join(',-,')) >= 0)) {
            if (!model.isNewRecord) {
              where.id = { [Op.ne]: model.id };
            }
            const results = await U.model((model._modelOptions || model.$modelOptions).name.singular).find({ where });
            if (results) {
              return model.sequelize.Promise.reject(new Error(`${one.message}(${tempCheckValue.join(',')})!`));
            }
          }
        }
      }
      return true;
    },

    createNo(model, options) {
      const Op = (U.rest.Sequelize || {}).Op;
      const type = { 1: '01', 2: '02' };
      const benYue = type[model.type.toString()] + moment().format('YYYYMM');
      model.constructor.max({ where: { no: { [Op.like]: `${benYue}%` } } }).then(max => {
        if (max) model.no = Number(max) + 1;
        else model.no = `${benYue}00001`;
        options.fields.push('no');
      });
    },
  };
};
