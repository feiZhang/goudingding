/* eslint-disable no-extend-native */
/* eslint-disable no-restricted-properties */
/* eslint-disable no-console */
/* eslint-disable func-names */
/* eslint-disable no-bitwise */
/* eslint-disable no-inner-declarations */
/* eslint-disable no-underscore-dangle */
/* eslint-disable prefer-destructuring */
/* eslint-disable no-undef */
/* eslint-disable camelcase */
/* eslint-disable no-loop-func */
/* eslint-disable radix */
/* eslint-disable no-shadow */
/* eslint-disable no-nested-ternary */
/* eslint-disable react/no-this-in-sfc */
/* eslint-disable array-callback-return */
/* eslint-disable consistent-return */
/* eslint-disable no-param-reassign */
/* eslint-disable react/jsx-no-undef */
/* eslint-disable eqeqeq */
const _ = require('lodash');
const moment = require('moment');

module.exports = ({ Modal }) => ({
  _,
  getExcelColName: (index) => `${index > 25 ? String.fromCharCode(65 + parseInt(index / 26, 10) - 1) : ''}${String.fromCharCode(65 + (index % 26))}`,
  jiaxing: (t) => {
    if (t) {
      if (t.length > 8) {
        return `${t.substr(0, t.length - 8)}****${t.substr(t.length - 5)}`;
      } else if (t.length > 2) {
        return `${t.substr(0, t.length - 2)}**`;
      }
    } else {
      return '';
    }
  },
  number: () => {
    // 总结的口诀是：四舍六入五考虑，五后非零就进一，五后皆零看奇偶，五前为偶应舍去，五前为奇要进一！
    // https://zhuanlan.zhihu.com/p/31202697
    // 这个方案的方法还是不能用，也许是64位的原因。
    if (!Number.prototype.__toFixed) {
      Number.prototype.__toFixed = Number.prototype.toFixed;
    }
    Number.prototype._toFixed = function (n) {
      return Math.round(`${+this}e${n}`) / Math.pow(10, n)
    }
    Number.prototype.toFixed = function (n) {
      return this._toFixed(n).toString();
      // return (this + 3e-16)._toFixed(n);
    };
    // console.log((15822.11+2056.44),Number(15822.11+2056.44).toFixed(1));

    // 除法函数，用来得到精确的除法结果
    // 说明：javascript的除法结果会有误差，在两个浮点数相除的时候会比较明显。这个函数返回较为精确的除法结果。
    // 调用：accDiv(arg1,arg2)
    // 返回值：arg1除以arg2的精确结果
    function accDiv(arg1, arg2) {
      if (!arg2 || arg2 == '0' || arg2 == 0) return 0;
      let t1 = 0;
      let t2 = 0;
      try {
        t1 = arg1.toString().split('.')[1].length;
      } catch (e) {
        console.log(e);
      }
      try {
        t2 = arg2.toString().split('.')[1].length;
      } catch (e) {
        console.log(e);
      }
      const r1 = Number(arg1.toString().replace('.', ''));
      const r2 = Number(arg2.toString().replace('.', ''));
      return Number(r2 == 0 ? 0 : (r1 / r2) * Math.pow(10, t2 - t1));
    }
    // 给Number类型增加一个div方法，调用起来更加方便。
    Number.prototype.div = function (arg) {
      return accDiv(this, arg);
    };
    // 乘法函数，用来得到精确的乘法结果
    // 说明：javascript的乘法结果会有误差，在两个浮点数相乘的时候会比较明显。这个函数返回较为精确的乘法结果。
    // 调用：accMul(arg1,arg2)
    // 返回值：arg1乘以arg2的精确结果
    function accMul(arg1, arg2) {
      let m = 0;

      const s1 = arg1.toString();

      const s2 = arg2.toString();
      try {
        m += s1.split('.')[1].length;
      } catch (e) {
        console.log(e);
      }
      try {
        m += s2.split('.')[1].length;
      } catch (e) {
        console.log(e);
      }
      return Number(((Number(s1.replace('.', '')) * Number(s2.replace('.', ''))) / Math.pow(10, m)).toFixed(m));
    }
    // 给Number类型增加一个mul方法，调用起来更加方便。
    Number.prototype.mul = function (arg) {
      return accMul(arg, this);
    };
    // 加法函数，用来得到精确的加法结果
    // 说明：javascript的加法结果会有误差，在两个浮点数相加的时候会比较明显。这个函数返回较为精确的加法结果。
    // 调用：accAdd(arg1,arg2)
    // 返回值：arg1加上arg2的精确结果
    function accAdd(arg1, arg2) {
      let r1;
      let r2;
      try {
        r1 = arg1.toString().split('.')[1].length;
      } catch (e) {
        r1 = 0;
      }
      try {
        r2 = arg2.toString().split('.')[1].length;
      } catch (e) {
        r2 = 0;
      }
      const m = Math.max(r1, r2);
      const p = Math.pow(10, m);
      // m = Math.pow(10, Math.max(r1, r2));
      return Number(((arg1 * p + arg2 * p) / Math.pow(10, m)).toFixed(m));
    }
    // 给Number类型增加一个add方法，调用起来更加方便。
    Number.prototype.add = function (arg) {
      return accAdd(arg, this);
    };
    // 减法函数
    function accSub(arg1, arg2) {
      let r1;
      let r2;
      try {
        r1 = arg1.toString().split('.')[1].length;
      } catch (e) {
        r1 = 0;
      }
      try {
        r2 = arg2.toString().split('.')[1].length;
      } catch (e) {
        r2 = 0;
      }
      const m = Math.pow(10, Math.max(r1, r2));
      // last modify by deeka
      // 动态控制精度长度
      const n = r1 >= r2 ? r1 : r2;
      return Number(((arg2 * m - arg1 * m) / m).toFixed(n));
    }
    // /给number类增加一个sub方法，调用起来更加方便
    Number.prototype.sub = function (arg) {
      return accSub(arg, this);
    };
    return true;
  },
  editDataList: (dataList = [], data = {}, key = 'id') => {
    if (!Array.isArray(dataList) || !data || !data[key]) return [];
    return dataList.map(tt => (tt[key] == data[key] ? data : tt));
  },
  // showDownFiles: text => {
  //   if (text) {
  //     const allFiles = _.isString(text) ? JSON.parse(text) : text;
  //     const files = [];
  //     allFiles.forEach(file => {
  //       files.push(
  //         <p key={`p${file.uid}`}>
  //           <a key={file.uid} href={file.url} rel="noopener noreferrer" target="_blank">
  //             {file.name}
  //           </a>
  //         </p>
  //       );
  //     });
  //     return files;
  //   }
  //   return <div />;
  // },
  downloadUrl: url => {
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    // let token = Cookies.get('token')
    iframe.src = url;
    iframe.onload = function () {
      document.body.removeChild(iframe);
    };
    document.body.appendChild(iframe);
  },
  pop: data => {
    if (Array.isArray(data) && data.length > 0) {
      return data[data.length - 1];
    }
    return undefined;
  },
  date: () => moment().format('YYYY-MM-DD'),
  now: () => moment().format('YYYY-MM-DD HH:mm:ss'),
  randStr(_len = 32) {
    const dist = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const len = Number(_len) < 1 ? 4 : Number(_len);
    return _.range(len)
      .map(() => dist[Math.floor(Math.random() * dist.length)])
      .join('');
  },
  jiaxing(t) {
    if (t) {
      if (t.length > 8) {
        return `${t.substr(0, t.length - 8)}****${t.substr(t.length - 5)}`;
      }
      if (t.length > 2) {
        return `${t.substr(0, t.length - 2)}**`;
      }
    }
    return '';
  },
  checkIsImg(name) {
    const nn = (name || '').split('.');
    return ['bmp', 'gif', 'jpe', 'png', 'jpeg', 'jpg'].indexOf(nn[nn.length - 1].toLowerCase()) >= 0;
  },
  // {data:xx,root_id:xx,labelName:xx,valueName:xx}
  // showUserNames(users) {
  //   return (users || []).map((ii, key) => (
  //     <span key={ii.id} style={{ color: ii.color ? ii.color : 'black' }}>
  //       {ii.name + (key === users.length - 1 ? '' : ',')}
  //     </span>
  //   ));
  // },
  // showImgs(imgs) {
  //   return imgs.map(img => (
  //     <a href="img.url" target="_blank">
  //       <img alt={img.name} key={img.uid} src={img.url} title={img.name} style={{ height: '60px', width: '60px' }} />
  //     </a>
  //   ));
  // },
  // showFiles(files) {
  //   return files.map(file => (
  //     <p key={`p${file.uid}`}>
  //       <a key={file.uid} href={file.url} rel="noreferrer noopener">
  //         {file.name}
  //       </a>
  //     </p>
  //   ));
  // },
  /**
     * rootId 根节点Id
     * mySelf 是否要自己的的首层数据。
     * */
  listToMap(orgData) {
    const { mySelf = false, parentIdName = 'parentId', valueName = 'id', labelName = 'name', rootId = 0 } = orgData;
    const data = orgData.data ? _.cloneDeep(orgData.data) : [];
    // let runTimes = 0;
    const fa = function (parentid) {
      // runTimes += 1;
      const tArray = [];
      for (let i = 0; i < data.length; i += 1) {
        const n = data[i];
        // console.log(parentid, n,n.id,n[parentIdName]);
        if (n[parentIdName] === parentid) {
          if (!(n.noChildren === true)) n.children = fa(n.id, false);
          let lbNs = [];
          if (Array.isArray(labelName)) {
            lbNs = labelName.map(item => n[item]);
          } else {
            lbNs = [n[labelName]];
          }
          tArray.push({ ...n, label: lbNs.join(' '), value: n[valueName].toString() });
        }
      }
      return tArray;
    };
    const rvD = fa(rootId);
    return mySelf && rvD[rootId] ? rvD[rootId].children : rvD;
  },
  /**
   * 将list设置为table需要的rowSpan格式
   */
  listRowSpan(faContentList, keys = []) {
    const tFaContentList = [];
    const rowSpan = {};
    const shangyiRowSpan = {};
    keys.map(ii => {
      rowSpan[ii] = -1;
      shangyiRowSpan[ii] = '';
    });
    faContentList.map((item, key) => {
      keys.map(ii => {
        item[`${ii}Rows`] = { children: item[ii], props: { rowSpan: 0 } };
      });
      tFaContentList.push(item);
      // console.log(tFaContentList,key);
      keys.map(ii => {
        rowSpan[ii] += 1;
        if (shangyiRowSpan[ii] != item[ii] && shangyiRowSpan[ii] != '') {
          tFaContentList[key - rowSpan[ii]][`${ii}Rows`].props.rowSpan = rowSpan[ii];
          rowSpan[ii] = 0;
        }
        shangyiRowSpan[ii] = item[ii];
        // console.log(item, ii, rowSpan[ii], shangyiRowSpan[ii], 112233);
      });
    });
    if (tFaContentList.length > 0) {
      keys.map(ii => {
        tFaContentList[tFaContentList.length - 1 - rowSpan[ii]][`${ii}Rows`].props.rowSpan = rowSpan[ii] + 1;
      });
    }
    return tFaContentList;
  },
  clearCascader(casVals, fields) {
    const fn = Vals => {
      const list = [];
      Vals.map(one => {
        if (one.children) {
          one.children = fn(one.children);
        }
        list.push(_.pick(one, fields));
      });
      return list;
    };
    return fn(casVals);
  },
  /**
   * 将cascader转换成list
   */
  cascaderToList(cascaderVals, fieldName, hebing = true, index = 0) {
    // console.log(cascaderVals,fieldName,hebing,index);
    const fa = (theData, tIndex) => {
      let listData = [];
      let isEnd = false;
      theData.map(item => {
        let dd = [];
        if (Array.isArray(item.children) && item.children.length > 0) {
          dd = fa(item.children, tIndex + 1);
          const tt = dd.map(ddd => {
            ddd[`sort${tIndex}`] = item[fieldName];
            if (!ddd.id || ddd.id == 0) ddd.id = item.id;
            return ddd;
          });
          listData = listData.concat(tt);
        } else {
          if (hebing) isEnd = true;
          listData.push({ content: item[fieldName], id: item.id });
        }
      });
      return isEnd ? [{ id: 0, content: listData }] : listData;
    };
    return fa(cascaderVals, index + 1);
  },
  // 根据select数据生成select选择框。
  // createSelect(selectVals, group, placeholder, mode = 'multiple') {
  //   if (!selectVals) {
  //     return '';
  //   }
  //   let sVals = selectVals.filter(item => !(item.zhuangtai && item.zhuangtai == '停用'));
  //   if (group != undefined) {
  //     sVals = this.listToMap({ data: sVals, root_id: group });
  //   }
  //   const loop = data =>
  //     data.map(d4 => {
  //       if (d4.children && d4.children.length > 0) {
  //         return (
  //           <OptGroup key={`${d4.id.toString()}dd`} value={d4.id.toString()} label={d4.name}>
  //             {loop(d4.children)}
  //           </OptGroup>
  //         );
  //       }
  //       return (
  //         <Option key={`${d4.id.toString()}dd`} value={d4.id.toString()}>
  //           {d4.name}
  //         </Option>
  //       );
  //     });
  //   const options = loop(sVals);
  //   return (
  //     <Select
  //       showSearch
  //       allowClear
  //       optionFilterProp="children"
  //       mode={mode}
  //       filterOption={(input, option) => option.props.children.toLowerCase().indexOf(input.toLowerCase()) >= 0}
  //       placeholder={placeholder}
  //     >
  //       {options}
  //     </Select>
  //   );
  // },
  /**
   * 修改cascader的某个值
   * @param {array} cascaderVals  cascader数据
   * @param {*} selectVal         要找到的值
   * @param {*} selectField       要找到值对应的字段
   * @param {*} value             要更新的新数据
   * @param {boolean} isEdit      用于新增
   */
  editCascaderValue(cascaderVals, selectVal, selectField = 'value', newValue = {}, isEdit = true) {
    console.log(cascaderVals, selectVal, selectField, newValue, isEdit);
    const fn = function (cv) {
      return cv.map(val => {
        if (isEdit && val[selectField] == selectVal) {
          val = { ...val, ...newValue };
          return val;
        }
        if (!isEdit && val[selectField] == selectVal) {
          console.log(isEdit, val[isEdit], val);
          val.children = val.children ? [newValue].concat(val.children) : [newValue];
          return val;
        }
        if (val.children) val.children = fn(val.children);
        return val;
      });
    };
    return fn(cascaderVals);
  },
  /**
   * 从cascader中找到某个值的path。
   * @param {array} cascaderVals cascader数组
   * @param {string} selectVal   要找的数据
   * @param {string} selectField 要找到的数据对应的字段名
   * @param {string} valueField  要获取的数据对应的字段名
   */
  getCascaderPath(cascaderVals, selectVal, selectField = 'value', valueField = 'value') {
    const fn = function (cv) {
      let rv = [];
      _.each(cv, val => {
        // console.log(val[selectField] == selectVal, val[selectField], "aa");
        if (val[selectField] == selectVal) {
          rv = [val[valueField]];
        } else if (val.children && Array.isArray(val.children) && val.children.length > 0) {
          const child = fn(val.children);
          if (child.length > 0) {
            rv = [val[valueField]].concat(child);
          }
        }
        if (rv.length > 0) return false;
      });
      return rv;
    };
    const v = fn(cascaderVals);
    return v;
  },
  /**
   * 对cascader进行过滤
   * @param {cascader} cascader
   * @param {function} filter
   */
  filterCascader(cascader, filter) {
    const newList = [];
    cascader.map(item => {
      if (item.children) item.children = this.filterCascader(item.children, filter);
      if (filter(item)) newList.push(item);
    });
    return newList;
  },
  /**
   * 过滤掉casc的某些枝叶
   * cascaderVals   数值
   * filterIds      要过滤的ID
   * havRoot        是否需要父节点。比如：仓库（false:过滤出来没有省公司仓库，true:必定有）
   * */
  filterCascaderFromValues(cascaderVals, filterIds, havRoot = true) {
    const fn = function (child) {
      let rv = [];
      _.each(child, val => {
        if (filterIds.indexOf(val.value) >= 0) {
          rv.push(val);
        } else if (val.children && val.children.length > 0) {
          const cl = fn(val.children);
          if (cl.length > 0) {
            if (havRoot) {
              val.children = cl;
              rv.push(val);
            } else {
              rv = cl;
            }
          }
        }
      });
      return rv;
    };
    return fn(cascaderVals);
  },
  /**
   * 根据数组，获取到name值
   * sorts        数组
   * id           数据的ID
   * filedName    要显示的属性
   * isCascader   是否是树壮目录
   * */
  showSortName(sorts, id, idField = 'id', valueField = 'name', isCascader = false, defaultValue = undefined) {
    if (!sorts || !id) return '';
    // console.log("showSortName", sorts, id, valueField, isCascader);
    if (isCascader) {
      const fn = child => {
        let find = '';
        _.each(child, item => {
          if (item[idField] == id) {
            find = item[valueField] || item.label;
            return false;
          }
          if (item.children && find == '') {
            find = fn(item.children);
          }
        });
        return find;
      };
      const rv = fn(sorts);
      return rv == '' ? (defaultValue != undefined ? defaultValue : id) : rv;
    }
    if (!Array.isArray(sorts)) {
      const ids = Array.isArray(id) ? id : [id];
      // console.log(ids, sorts,'object');
      return ids.map(one => (sorts[one] || one)).join(',');
    }
    const ids = Array.isArray(id) ? (idField === 'id' ? id.map(ii => Number(ii)) : id) : [idField === 'id' ? Number(id) : id];
    // console.log(ids, sorts,'array');
    const r = (sorts || []).filter(item => ids.indexOf(item[idField]) >= 0);
    const names = r.map(ii => {
      if (Array.isArray(valueField)) {
        const tName = valueField.map(tt => ii[tt]);
        return tName.join(' ');
      }
      return ii[valueField];
    });
    return r && r.length > 0 ? names.join(',') : defaultValue != undefined ? defaultValue : id;
  },
  /**
   * 获取cascader下属的所有值。
   */
  getChildIdsFromPath(casVals, path) {
    let findCas = casVals;
    let haveFind = true;
    if (!Array.isArray(path) || path.length < 1) return [];
    const pathId = path[path.length - 1];
    path.map(item => {
      if (haveFind) {
        haveFind = false;
        _.each(findCas, val => {
          if (item == val.value) {
            haveFind = true;
            findCas = val.children;
            return false;
          }
        });
      }
    });
    // 此时的findCas，只是path下面的children
    return haveFind ? this.getChildIds(findCas).concat([pathId]) : [pathId];
  },
  getChildIds(casVals) {
    console.log(casVals);
    const rv = [];
    const fn = one => {
      if (one && one.value) {
        rv.push(one.value);
        if (Array.isArray(one.children) && one.children.length > 0) {
          one.children.map(item => {
            fn(item);
          });
        }
      }
    };
    casVals.map(item => {
      fn(item);
    });
    return rv;
  },
  /**
   * 根据某值截取 cas的部分分支。
   * */
  getChildFromVal(casVals, val, key = 'name', haveRoot = false) {
    // console.log(casVals, val, key, 111);
    let rv = [];
    const fn = cas => {
      _.each(cas, item => {
        // console.log(item[key], val);
        if (item[key] == val) {
          rv = haveRoot ? [item] : item.children || [];
          return false;
        }
        if (Array.isArray(item.children) && item.children.length > 0) {
          fn(item.children);
        }
      });
      return rv;
    };
    return fn(casVals);
  },
  getExcelHeader(listProps, noColumns = ['operation']) {
    const headerTitle = {};
    listProps.columns.map(item => {
      if (noColumns.indexOf(item.key) < 0) {
        headerTitle[item.dataIndex] = item;
      }
    });
    return {
      data: _.cloneDeep(listProps.dataSource),
      header: {
        title: headerTitle,
      },
    };
  },
  removeToken(tokenName = 'x-auth-token') {
    localStorage.setItem(tokenName, '');
    document.cookie = `${tokenName}=`;
    console.log('removeToken', localStorage.getItem(tokenName));
  },
  setToken(tokenValue, tokenName = 'x-auth-token') {
    localStorage.setItem(tokenName, tokenValue);
    document.cookie = `${tokenName}=${tokenValue}`; // localStorage，有时候取不到。
  },
  getToken(tokenName = 'x-auth-token') {
    // console.log("getToken", document.cookie);
    let userToken = '';
    let cStart = document.cookie.indexOf(`${tokenName}=`);
    if (cStart != -1) {
      cStart = cStart + tokenName.length + 1;
      let cEnd = document.cookie.indexOf(';', cStart);
      if (cEnd == -1) cEnd = document.cookie.length;
      userToken = unescape(document.cookie.substring(cStart, cEnd));
    }
    if (!userToken || userToken == '') userToken = localStorage.getItem(tokenName);
    if (!userToken || userToken == '') userToken = localStorage.getItem(tokenName);
    return userToken;
  },
  /**
   * 导出excel数据
   * fileName     文件名
   * data         输出的数据
   * dataCols     数据的数据列定义
   * merge        excel头合并说明
   * style        excel的样式说明：default默认的演示  0\1\2 行对应的样式  A1:B2具体cell的样式
   * defaultWidth 默认的列宽度
   * tableCols    table的列说明，根据这个生成系统需要的列说明
   * fileType     导出的数据格式，excel、csv
   */
  // 新版本
  getListCols({ cols, type = 'list' }) {
    if (!cols || !Array.isArray(cols)) return [];
    let tList = [];
    let tCols = cols;
    if (type === 'list') {
      tCols = cols.filter(one => !(one.key === 'operation' || one.noList === true || one.type === 'divider'))
    } else if (type === 'export') {
      tCols = cols.filter(one => !(one.key === 'operation' || one.noExport === true || one.type === 'divider'))
    }
    tCols.map(one => {
      if (one.children) {
        tList = tList.concat(this.getListCols({ cols: one.children, type }));
      } else {
        tList.push({ ...one, dataIndex: one.dataIndex || one.key });
      }
    })
    return tList;
  },
  exportExcelData({ fileName, data, headerData = [], dataCols, merge = [], style = {}, defaultWidth = '150', tableCols = [], fileType = 'excel' }) {
    if (!dataCols && Array.isArray(tableCols) && tableCols.length > 0) {
      dataCols = this.getListCols({ cols: tableCols, type: 'export' });
      // console.log(dataCols);
      const headerData2 = {};
      dataCols.forEach(one => {
        headerData2[one.dataIndex] = one.title;
      })
      data.unshift(headerData2);
    }
    const initData = {};
    dataCols.map(one => { initData[one.dataIndex] = ''; })
    data = headerData.map(one => ({ ...initData, ...one })).concat(data);
    // console.log(!dataCols, Array.isArray(tableCols), tableCols.length > 0, fileName, data, dataCols, merge, style, defaultWidth, tableCols, fileType);

    const defaultStyle = {};
    function datenum(v, date1904) {
      if (date1904) v += 1462;
      const epoch = Date.parse(v);
      return (epoch - new Date(Date.UTC(1899, 11, 30))) / (24 * 60 * 60 * 1000);
    }
    function sheetFromtArrayOftArrays(data, opts) {
      const ws = {};
      const range = opts || { s: { c: 10000000, r: 10000000 }, e: { c: 0, r: 0 } };
      const cols = [];
      _.each(dataCols, colsSet => {
        cols.push({
          wpx: colsSet.width && colsSet.width.indexOf('%') < 0 ? parseInt(colsSet.width) : defaultWidth,
        });
      });
      for (let R = 0; R != data.length; R += 1) {
        let C = -1;
        _.each(dataCols, colsSet => {
          C += 1;
          if (range.s.r > R) range.s.r = R;
          if (range.s.c > C) range.s.c = C;
          if (range.e.r < R) range.e.r = R;
          if (range.e.c < C) range.e.c = C;
          const cell_ref = XLSX.utils.encode_cell({ c: C, r: R });
          const cellStyle = style[cell_ref] || style[R] || style.default || defaultStyle || false;
          const cell = {};
          if (cellStyle) {
            cell.s = cellStyle;
          }
          // console.log(colsSet.dataIndex, colsSet.dataIndex && data[R][colsSet.dataIndex] != undefined, data[R][colsSet.dataIndex], colsSet.render, colsSet.data)
          if (colsSet.dataIndex && data[R][colsSet.dataIndex] != undefined) {
            cell.v = _.isObject(data[R][colsSet.dataIndex]) ? JSON.stringify(data[R][colsSet.dataIndex]) : data[R][colsSet.dataIndex];
            if (typeof cell.v === 'number') {
              cell.t = 'n';
            } else if (typeof cell.v === 'boolean') cell.t = 'b';
            else if (cell.v instanceof Date) {
              cell.t = 'n';
              cell.z = XLSX.SSF._table[14];
              cell.v = datenum(cell.v);
            } else cell.t = 's';
            // console.log(R,colsSet.dataIndex,cell);
          } else if (colsSet.render) {
            // } else if (colsSet.render && data[R]['headerTitle'] != "headerTitle") {
            const vv = (colsSet.render)(data[R][colsSet.dataIndex], data[R], R);
            cell.v = vv.toString();
            cell.t = 's';
          } else if (colsSet.data) {
            cell.v = tools.showSortName(colsSet.data, _.isString(data[R][colsSet.key]) ? data[R][colsSet.key].split(',') : data[R][colsSet.key], 'id', 'name', colsSet.type === 'cascader', data[R][colsSet.key])
          } else cell.v = '';
          ws[cell_ref] = cell;
        });
      }
      if (range.s.c < 10000000) ws['!ref'] = XLSX.utils.encode_range(range);
      ws['!cols'] = cols;
      return ws;
    }

    function Workbook() {
      if (!(this instanceof Workbook)) return new Workbook();
      this.SheetNames = [];
      this.Sheets = {};
    }

    if (fileType == 'csv') {
      const fileLines = data.map(tt => {
        const fields = [];
        dataCols.map(ttt => {
          if (tt[ttt.dataIndex] == undefined) {
            // console.log(ttt, "noData", tt);
            fields.push('""');
          } else {
            fields.push(`"${tt[ttt.dataIndex].toString().replace('"', '""')}"`);
          }
        });
        return `${fields.join(',')}\r\n`;
      });
      const blob = new Blob(fileLines, { type: 'text/plain;charset=utf-8' });
      saveAs(blob, `${fileName}.csv`);
    } else {
      const wb = new Workbook();
      const ws = sheetFromtArrayOftArrays(data);
      // console.log(ws,'222');
      if (Array.isArray(merge) && merge.length > 0) ws['!merges'] = merge;
      /* add worksheet to workbook */
      wb.SheetNames.push(fileName);
      wb.Sheets[fileName] = ws;
      const wbout = XLSX.write(wb, { bookType: 'xlsx', bookSST: true, type: 'binary' });
      function s2ab(s) {
        const buf = new ArrayBuffer(s.length);
        const view = new Uint8Array(buf);
        for (let i = 0; i != s.length; i += 1) view[i] = s.charCodeAt(i) & 0xff;
        return buf;
      }
      saveAs(new Blob([s2ab(wbout)], { type: 'application/octet-stream' }), `${fileName}.xlsx`);
    }
  },
  exportExcel({ fileName, data, header, merge }) {
    const headerStyle = {
      font: { color: { rgb: 'FF000000' }, bold: true },
      fill: { fgColor: { rgb: 'FFE0E0E0' } },
    };
    const defaultStyle = {};
    function datenum(v, date1904) {
      if (date1904) v += 1462;
      const epoch = Date.parse(v);
      return (epoch - new Date(Date.UTC(1899, 11, 30))) / (24 * 60 * 60 * 1000);
    }

    function sheetFromtArrayOftArrays(data = [], opts) {
      const ws = {};
      let lineStyle = {};
      let headerTitle = {};
      const range = opts || { s: { c: 10000000, r: 10000000 }, e: { c: 0, r: 0 } };
      const cols = [];
      if (header) {
        headerTitle = header.title;
        const headerData = {};
        _.each(headerTitle, item => {
          cols.push({
            wpx: item.width && item.width.indexOf('%') < 0 ? parseInt(item.width) : '150',
          });
          headerData[item.dataIndex] = item.title;
        });
        if (header.show !== false && data.length > 0) {
          data.unshift(headerData);
        }
      } else if (data.length > 0) {
        headerTitle = data[0];
      }
      for (let R = 0; R != data.length; R += 1) {
        if (header.show !== false && R == 0) {
          lineStyle = headerStyle;
        } else {
          lineStyle = defaultStyle;
        }
        let C = -1;
        _.each(headerTitle, valu => {
          C += 1;
          if (range.s.r > R) range.s.r = R;
          if (range.s.c > C) range.s.c = C;
          if (range.e.r < R) range.e.r = R;
          if (range.e.c < C) range.e.c = C;
          let cellStyle = lineStyle;
          if (header && header.style) {
            if (header.style[R]) {
              cellStyle = header.style[R];
              if (header.style[R][valu.dataIndex]) cellStyle = header.style[R][valu.dataIndex];
            }
          }
          const cell = {
            v: data[R][valu.dataIndex],
            s: cellStyle,
          };
          if (cell.v == null || cell.v == undefined) {
            cell.v = '';
          } else {
            const cell_ref = XLSX.utils.encode_cell({ c: C, r: R });

            if (typeof cell.v === 'number') cell.t = 'n';
            else if (typeof cell.v === 'boolean') cell.t = 'b';
            else if (cell.v instanceof Date) {
              cell.t = 'n';
              cell.z = XLSX.SSF._table[14];
              cell.v = datenum(cell.v);
            } else cell.t = 's';
            ws[cell_ref] = cell;
          }
        });
      }
      if (range.s.c < 10000000) ws['!ref'] = XLSX.utils.encode_range(range);
      ws['!cols'] = cols;
      return ws;
    }

    /* original data */
    function Workbook() {
      if (!(this instanceof Workbook)) return new Workbook();
      this.SheetNames = [];
      this.Sheets = {};
    }
    const wb = new Workbook();

    const ws = sheetFromtArrayOftArrays(data);
    if (Array.isArray(merge) && merge.length > 0) ws['!merges'] = merge;
    /* add worksheet to workbook */
    wb.SheetNames.push(fileName);
    wb.Sheets[fileName] = ws;
    const wbout = XLSX.write(wb, { bookType: 'xlsx', bookSST: true, type: 'binary' });
    function s2ab(s) {
      const buf = new ArrayBuffer(s.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i != s.length; i += 1) view[i] = s.charCodeAt(i) & 0xff;
      return buf;
    }
    saveAs(new Blob([s2ab(wbout)], { type: 'application/octet-stream' }), `${fileName}.xlsx`);
  },
  readDataFromFile({ file, onFinish, onProgress, onStart, onAbort, fileEncoding = 'utf-8' }) {
    const isCsv = file.type == 'text/csv' || (file.type == 'application/vnd.ms-excel' && file.name.substr(file.name.length - 4) == '.csv');
    const rABS =
      typeof FileReader !== 'undefined' && typeof FileReader.prototype !== 'undefined' && typeof FileReader.prototype.readAsBinaryString !== 'undefined';
    function fixdata(data) {
      let o = '';

      let l = 0;

      const w = 10240;
      for (; l < data.byteLength / w; l += 1) o += String.fromCharCode.apply(null, new Uint8Array(data.slice(l * w, l * w + w)));
      o += String.fromCharCode.apply(null, new Uint8Array(data.slice(l * w)));
      return o;
    }
    function xw(data) {
      let jsonData = [];
      try {
        const arr = rABS ? data : btoa(fixdata(data));
        jsonData = XLSX.read(arr, { type: rABS ? 'binary' : 'base64' });
        onFinish(jsonData);
      } catch (e) {
        console.log(e.stack || e);
        onFinish(false);
        Modal.alert({ content: '数据解析失败' });
      }
    }
    // 读取文件内容，h5 接口
    const reader = new FileReader();
    reader.onabort = () => {
      onAbort();
    };
    reader.onloadstart = e => {
      console.log('onloadstart', e);
      onStart(reader);
    };
    reader.onprogress = e => {
      console.log('onprogress', e);
      onProgress(e);
    };
    reader.onload = function (e) {
      const data = e.target.result;
      function doitnow() {
        try {
          xw(data);
        } catch (e) {
          console.log(e);
          Modal.error({
            content: '读取文件失败，请确认您提供的Excel文件有效。',
          });
          onFinish(false);
        }
      }
      if (isCsv) {
        onFinish(data);
      } else if (file.type == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
        doitnow();
      }
    };
    console.log(file, 'file', file.name.substr(file.name.length - 4));
    if (isCsv) {
      reader.readAsText(file, fileEncoding);
    } else if (file.type != 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
      Modal.error({ content: '提交的文件不是有效的xlsx文件或者csv文件!' });
    } else if (file.size > 1e6) {
      Modal.confirm({
        content: `这个文件记录树为${file.size} 字节，处理数据需要较多的时间，在此期间，不要作其他操作。是否处理?`,
        onOk() {
          if (rABS) reader.readAsBinaryString(file);
          else reader.readAsArrayBuffer(file);
        },
        onCancel() { },
      });
    } else if (rABS) reader.readAsBinaryString(file);
    else reader.readAsArrayBuffer(file);
  },
  // request(url, options, callback) {
  //   url = `${config.apiUrl  }/${  url}`;
  //   options.method = options.method || 'GET';
  //   options.data = options.data || {};

  //   let userToken = this.getToken();
  //   const paramData = options.data;
  //   if (paramData && paramData.access_token != undefined) userToken = paramData.access_token; // 主动登录时，取消token，防止认证失败的提示。
  //   options.method = options.method.toUpperCase();
  //   if (options.method == 'GET') {
  //     url = `${url  }?${  querystring.encode(paramData)}`;
  //   } else {
  //     options.body = JSON.stringify(paramData);
  //   }
  //   options.headers = new Headers({
  //     'Content-Type': 'application/json; charset=utf-8',
  //     'x-auth-token': userToken,
  //   });
  //   return fetch(url, options)
  //     .then((response) => {
  //       if (response.status >= 200 && response.status < 300) {
  //         return response.json();
  //       }
  //         return new Promise(((resolve) => {
  //           resolve(false);
  //         }));

  //     })
  //     .then(data => {
  //       callback(data);
  //     })
  //     .catch(err => {
  //       console.log('request_err', err);
  //       callback(false);
  //     });
  // },
  numToDX(n) {
    if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(n)) return '数据非法';
    let unit = '千百拾亿千百拾万千百拾元角分';

    let str = '';
    n += '00';
    const p = n.indexOf('.');
    if (p >= 0) n = n.substring(0, p) + n.substr(p + 1, 2);
    unit = unit.substr(unit.length - n.length);
    for (let i = 0; i < n.length; i += 1) str += '零壹贰叁肆伍陆柒捌玖'.charAt(n.charAt(i)) + unit.charAt(i);
    return str
      .replace(/零(千|百|拾|角)/g, '零')
      .replace(/(零)+/g, '零')
      .replace(/零(万|亿|元)/g, '$1')
      .replace(/(亿)万|壹(拾)/g, '$1$2')
      .replace(/^元零?|零分/g, '')
      .replace(/元$/g, '元整');
  },
  // 生成唯一编号。
  generateNo: async ({ baseNo, noModel, type = '通用', length = 5 }) => {
    // 这里无法取到model，只能通过参数传递；
    let install = false;
    let no = '';
    let times = 0;
    while (!install && ++times < 200) {
      // {no:"ZZ20181200001"};//
      const result = await noModel.findOne({
        where: { type, no: { $like: `${baseNo}%` } },
        order: [['no', 'desc']],
      });
      no = '1';
      if (result) {
        no = (+result.no.substr(result.no.length - length, length) + 1).toString();
      }
      no = `${baseNo}${'0000000000'.substr(0, length - no.length)}${no}`;

      try {
        install = await noModel.build({ type, no }).save();
      } catch (error) {
        console.log(error, install, 'no');
        install = false;
      }
    }
    // console.log(baseNo, no);
    return no;
  },
  formatList({ dataList = [], baseData = {}, cols = [], showCount = false }) {
    if (!Array.isArray(dataList) || dataList.length < 1) return [];
    const noArray = !Array.isArray(dataList);
    const tDataList = noArray ? [dataList] : dataList;

    const formatCols = this.getListCols({ cols }).filter(one => (one.data || one.baseData) && (one.format || (tDataList[0][one.dataIndex] === undefined))).map(one => ({ ...one, data: one.data ? one.data : baseData[one.baseData] }));
    // console.log(formatCols, dataList, cols, baseData, 'format');
    const newData = tDataList.map(one => {
      const formatD = {};
      formatCols.map((iii) => {
        formatD[iii.dataIndex || iii.key] = tools.showSortName(iii.data, (_.isString(one[iii.key]) ? one[iii.key].split(',') : one[iii.key]), 'id', iii.format, iii.type === 'cascader', one[iii.key]);
      });
      // console.log(one, formatD);
      return { ...one, ...formatD };
    });
    if (showCount && _.isObject(showCount)) {
      const dataSourceCount = {};
      _.each(showCount, (val, key) => {
        // eslint-disable-next-line no-restricted-globals
        if (isNaN(val)) {
          dataSourceCount[key] = val;
        } else {
          (newData || []).forEach(one => {
            dataSourceCount[key] = Number(dataSourceCount[key] || 0).add(one[key] || 0);
          })
        }
      });
      return noArray ? newData[0] : newData.concat(dataSourceCount);
    }
    return noArray ? newData[0] : newData;
  },
});
