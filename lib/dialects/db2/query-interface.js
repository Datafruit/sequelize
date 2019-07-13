'use strict';

const DataTypes = require('../../data-types');
// const Promise = require('../../promise');
// const QueryTypes = require('../../query-types');
const _ = require('lodash');
const Utils = require('../../utils');
const Op = require('../../operators');
const OpHelper = require('./query-generator/operators');


/**
 Returns an object that handles Db2's inabilities to do certain queries.

 @class QueryInterface
 @static
 @private
 */

function getWhereConditions(smth, tableName, factory, options, prepend) {
  if (Array.isArray(tableName)) {
    tableName = tableName[0];
    if (Array.isArray(tableName)) {
      tableName = tableName[1];
    }
  }

  options = options || {};

  if (prepend === undefined) {
    prepend = true;
  }

  // TODO support
  if (smth && smth instanceof Utils.SequelizeMethod) { // Checking a property is cheaper than a lot of instanceof calls
  //   return this.handleSequelizeMethod(smth, tableName, factory, options, prepend);
    throw new Error('Unimplemented');
  }
  if (_.isPlainObject(smth)) {
    return whereItemsQuery(smth, {
      model: factory,
      // prefix: prepend && tableName,
      type: options.type,
      queryInterface: options.queryInterface
    });
  }
  if (typeof smth === 'number') {
    return [];
  }
  if (typeof smth === 'string') {
    return whereItemsQuery(smth, {
      model: factory,
      // prefix: prepend && tableName,
      queryInterface: options.queryInterface
    });
  }
  if (Buffer.isBuffer(smth)) {
    throw new Error('Unimplemented');
    // return this.escape(smth);
  }
  if (Array.isArray(smth)) {
    if (smth.length === 0 || smth.length > 0 && smth[0].length === 0) return [];
    if (Utils.canTreatArrayAsAnd(smth)) {
      const _smth = { [Op.and]: smth };
      return getWhereConditions(_smth, tableName, factory, options, prepend);
    }
    throw new Error('Support for literal replacements in the `where` object has been removed.');
  }
  if (smth === null) {
    return whereItemsQuery(smth, {
      model: factory,
      // prefix: prepend && tableName,
      queryInterface: options.queryInterface
    });
  }

  return [];
}

function whereItemsQuery(where, options, binding) {
  if (
    where === null ||
    where === undefined ||
    Utils.getComplexSize(where) === 0
  ) {
    // NO OP
    return [];
  }

  if (typeof where === 'string') {
    throw new Error('Support for `{where: \'raw query\'}` has been removed.');
  }

  const items = [];

  if (_.isPlainObject(where)) {
    Utils.getComplexKeys(where).forEach(prop => {
      const item = where[prop];
      const filters = whereItemQuery(prop, item, options);
      items.push(...filters);
    });
  } else {
    const filters = whereItemQuery(undefined, where, options);
    items.push(...filters);
  }

  return /or/i.test(binding) ? [_.overSome(items)] : items;
  // return items.length && items.filter(item => item && item.length).join(binding) || '';
}

function whereItemQuery(key, value, options = {}) {
  if (value === undefined) {
    throw new Error(`WHERE parameter "${key}" has invalid "undefined" value`);
  }

  const queryInterface = options.queryInterface;
  if (typeof key === 'string' && key.includes('.') && options.model) {
    const keyParts = key.split('.');
    if (options.model.rawAttributes[keyParts[0]] && options.model.rawAttributes[keyParts[0]].type instanceof DataTypes.JSON) {
      const tmp = {};
      const field = options.model.rawAttributes[keyParts[0]];
      _.set(tmp, keyParts.slice(1), value);
      return whereItemQuery(field.field || keyParts[0], tmp, Object.assign({ field }, options));
    }
  }

  const field = _findField(key, options);
  const fieldType = field && field.type || options.type;

  const isPlainObject = _.isPlainObject(value);
  const isArray = !isPlainObject && Array.isArray(value);
  key = queryInterface.QueryGenerator.OperatorsAliasMap && queryInterface.QueryGenerator.OperatorsAliasMap[key] || key;
  if (isPlainObject) {
    value = queryInterface.QueryGenerator._replaceAliases(value);
  }
  const valueKeys = isPlainObject && Utils.getComplexKeys(value);

  if (key === undefined) {
    if (typeof value === 'string') {
      throw new Error('Unimplemented');
      // return value;
    }

    if (isPlainObject && valueKeys.length === 1) {
      return whereItemQuery(valueKeys[0], value[valueKeys[0]], options);
    }
  }

  if (value === null) {
    // const opValue = options.bindParam ? 'NULL' : this.escape(value, field);
    const opValue = value;
    return _joinKeyValue(key, opValue, queryInterface.QueryGenerator.OperatorMap[Op.is], options.prefix);
  }

  if (!value) {
    throw new Error('Unimplemented');
    // const opValue = options.bindParam ? this.format(value, field, options, options.bindParam) : this.escape(value, field);
    // return _joinKeyValue(key, opValue, queryInterface.QueryGenerator.OperatorMap[Op.eq], options.prefix);
  }

  if (value instanceof Utils.SequelizeMethod && !(key !== undefined && value instanceof Utils.Fn)) {
    throw new Error('Unimplemented');
    // return this.handleSequelizeMethod(value);
  }

  // Convert where: [] to Op.and if possible, else treat as literal/replacements
  if (key === undefined && isArray) {
    if (Utils.canTreatArrayAsAnd(value)) {
      key = Op.and;
    } else {
      throw new Error('Support for literal replacements in the `where` object has been removed.');
    }
  }

  if (key === Op.or || key === Op.and || key === Op.not) {
    return _whereGroupBind(key, value, options);
  }

  if (value[Op.or]) {
    return _whereBind(queryInterface.QueryGenerator.OperatorMap[Op.or], key, value[Op.or], options);
  }

  if (value[Op.and]) {
    return _whereBind(queryInterface.QueryGenerator.OperatorMap[Op.and], key, value[Op.and], options);
  }

  if (isArray && fieldType instanceof DataTypes.ARRAY) {
    throw new Error('Unimplemented');
    // const opValue = options.bindParam ? this.format(value, field, options, options.bindParam) : this.escape(value, field);
    // return _joinKeyValue(key, opValue, queryInterface.QueryGenerator.OperatorMap[Op.eq], options.prefix);
  }

  if (isPlainObject && fieldType instanceof DataTypes.JSON && options.json !== false) {
    return _whereJSON(key, value, options);
  }
  // If multiple keys we combine the different logic conditions
  if (isPlainObject && valueKeys.length > 1) {
    return _whereBind(queryInterface.QueryGenerator.OperatorMap[Op.and], key, value, options);
  }

  if (isArray) {
    return _whereParseSingleValueObject(key, field, Op.in, value, options);
  }
  if (isPlainObject) {
    if (queryInterface.QueryGenerator.OperatorMap[valueKeys[0]]) {
      return _whereParseSingleValueObject(key, field, valueKeys[0], value[valueKeys[0]], options);
    }
    return _whereParseSingleValueObject(key, field, queryInterface.QueryGenerator.OperatorMap[Op.eq], value, options);
  }

  if (key === Op.placeholder) {
    throw new Error('Unimplemented');
    // const opValue = options.bindParam ? this.format(value, field, options, options.bindParam) : this.escape(value, field);
    // return _joinKeyValue(queryInterface.QueryGenerator.OperatorMap[key], opValue, queryInterface.QueryGenerator.OperatorMap[Op.eq], options.prefix);
  }

  // const opValue = options.bindParam ? this.format(value, field, options, options.bindParam) : this.escape(value, field);
  if (options.json !== false) {
    return [];
  }
  const opValue = value;
  return _joinKeyValue(key, opValue, queryInterface.QueryGenerator.OperatorMap[Op.eq], options.prefix);
}

// OR/AND/NOT grouping logic
function _whereGroupBind(key, value, options) {
  const queryInterface = options.queryInterface;
  const binding = key === Op.or ? queryInterface.QueryGenerator.OperatorMap[Op.or] : queryInterface.QueryGenerator.OperatorMap[Op.and];
  const outerBinding = key === Op.not ? 'NOT ': '';

  if (Array.isArray(value)) {
    value = value.map(item => {
      let filters = whereItemsQuery(item, options, queryInterface.QueryGenerator.OperatorMap[Op.and]);
      if (filters && filters.length && (Array.isArray(item) || _.isPlainObject(item)) && Utils.getComplexSize(item) > 1) {
        // filters = `(${filters})`;
        filters = _.overEvery(filters);
      }
      return filters;
    }).filter(item => item && item.length);

    // value = value.length && value.join(binding);
    value = value.length && /or/i.test(binding) ? _.overSome(value) : value;
  } else {
    value = whereItemsQuery(value, options, binding);
  }
  // Op.or: [] should return no data.
  // Op.not of no restriction should also return no data
  if ((key === Op.or || key === Op.not) && !value) {
    // return '0 = 1';
    return [() => false];
  }

  // return value ? `${outerBinding}(${value})` : undefined;
  return value
    ? outerBinding ? [_.negate(_.overEvery(value))] : [_.overEvery(value)]
    : [];
}

function _whereBind(binding, key, value, options) {
  if (_.isPlainObject(value)) {
    value = _.flatMap(Utils.getComplexKeys(value), prop => {
      const item = value[prop];
      return whereItemQuery(key, { [prop]: item }, options);
    });
  } else {
    value = _.flatMap(value, item => whereItemQuery(key, item, options));
  }

  value = value.filter(item => item && item.length);

  // return value.length ? `(${value.join(binding)})` : undefined;
  return value.length ? [_.overEvery(value)] : [];
}


function _whereJSON(key, value, options) {
  // const queryInterface = options.queryInterface;
  const items = [];
  // let baseKey = this.quoteIdentifier(key);
  const baseKey = key;
  // if (options.prefix) {
  //   if (options.prefix instanceof Utils.Literal) {
  //     baseKey = `${this.handleSequelizeMethod(options.prefix)}.${baseKey}`;
  //   } else {
  //     baseKey = `${this.quoteTable(options.prefix)}.${baseKey}`;
  //   }
  // }

  Utils.getOperators(value).forEach(op => {
    const where = {
      [op]: value[op]
    };
    items.push(whereItemQuery(key, where, Object.assign({}, options, { json: false })));
  });

  _.forOwn(value, (item, prop) => {
    _traverseJSON(items, baseKey, prop, item, [prop], _.pick(options, 'queryInterface'));
  });

  // const result = items.join(queryInterface.QueryGenerator.OperatorMap[Op.and]);
  // return 1 < items.length ? `(${result})` : result;
  return 1 < items.length
    ? [_.overEvery(items)]
    : items;
}

function _whereParseSingleValueObject(key, field, prop, value, options) {
  const queryInterface = options.queryInterface;
  if (prop === Op.not) {
    if (Array.isArray(value)) {
      prop = Op.notIn;
    } else if (value !== null && value !== true && value !== false) {
      prop = Op.ne;
    }
  }

  const comparator = queryInterface.QueryGenerator.OperatorMap[prop] || queryInterface.QueryGenerator.OperatorMap[Op.eq];

  switch (prop) {
    case Op.in:
    case Op.notIn:
      if (value instanceof Utils.Literal) {
        return _joinKeyValue(key, value.val, comparator, options.prefix);
      }

      if (value.length) {
        // return _joinKeyValue(key, `(${value.map(item => this.escape(item, field)).join(', ')})`, comparator, options.prefix);
        return _joinKeyValue(key, value, comparator, options.prefix);
      }

      if (comparator === queryInterface.QueryGenerator.OperatorMap[Op.in]) {
        return _joinKeyValue(key, '(NULL)', comparator, options.prefix);
      }

      return '';
    case Op.any:
    case Op.all:
      throw new Error('Unimplemented');
      // comparator = `${queryInterface.QueryGenerator.OperatorMap[Op.eq]} ${comparator}`;
      // if (value[Op.values]) {
      //   return _joinKeyValue(key, `(VALUES ${value[Op.values].map(item => `(${this.escape(item)})`).join(', ')})`, comparator, options.prefix);
      // }
      //
      // return _joinKeyValue(key, `(${this.escape(value, field)})`, comparator, options.prefix);
    case Op.between:
    case Op.notBetween:
      throw new Error('Unimplemented');
      // return _joinKeyValue(key, `${this.escape(value[0], field)} AND ${this.escape(value[1], field)}`, comparator, options.prefix);
    case Op.raw:
      throw new Error('The `$raw` where property is no longer supported.  Use `sequelize.literal` instead.');
    case Op.col:
      throw new Error('Unimplemented');
      // comparator = queryInterface.QueryGenerator.OperatorMap[Op.eq];
      // value = value.split('.');
      //
      // if (value.length > 2) {
      //   value = [
      //     // join the tables by -> to match out internal namings
      //     value.slice(0, -1).join('->'),
      //     value[value.length - 1]
      //   ];
      // }
      //
      // return _joinKeyValue(key, value.map(identifier => this.quoteIdentifier(identifier)).join('.'), comparator, options.prefix);
    case Op.startsWith:
      throw new Error('Unimplemented');
      // comparator = queryInterface.QueryGenerator.OperatorMap[Op.like];
      // return _joinKeyValue(key, this.escape(`${value}%`), comparator, options.prefix);
    case Op.endsWith:
      throw new Error('Unimplemented');
      // comparator = queryInterface.QueryGenerator.OperatorMap[Op.like];
      // return _joinKeyValue(key, this.escape(`%${value}`), comparator, options.prefix);
    case Op.substring:
      throw new Error('Unimplemented');
      // comparator = queryInterface.QueryGenerator.OperatorMap[Op.like];
      // return _joinKeyValue(key, this.escape(`%${value}%`), comparator, options.prefix);
  }

  // const escapeOptions = {
  //   acceptStrings: comparator.includes(queryInterface.QueryGenerator.OperatorMap[Op.like])
  // };

  if (_.isPlainObject(value)) {
    throw new Error('Unimplemented');

    // if (value[Op.col]) {
    //   return _joinKeyValue(key, whereItemQuery(null, value), comparator, options.prefix);
    // }
    // if (value[Op.any]) {
    //   escapeOptions.isList = true;
    //   return _joinKeyValue(key, `(${this.escape(value[Op.any], field, escapeOptions)})`, `${comparator} ${queryInterface.QueryGenerator.OperatorMap[Op.any]}`, options.prefix);
    // }
    // if (value[Op.all]) {
    //   escapeOptions.isList = true;
    //   return _joinKeyValue(key, `(${this.escape(value[Op.all], field, escapeOptions)})`, `${comparator} ${queryInterface.QueryGenerator.OperatorMap[Op.all]}`, options.prefix);
    // }
  }

  if (value === null && comparator === queryInterface.QueryGenerator.OperatorMap[Op.eq]) {
    return _joinKeyValue(key, value, queryInterface.QueryGenerator.OperatorMap[Op.is], options.prefix);
  }
  if (value === null && comparator === queryInterface.QueryGenerator.OperatorMap[Op.ne]) {
    return _joinKeyValue(key, value, queryInterface.QueryGenerator.OperatorMap[Op.not], options.prefix);
  }

  return _joinKeyValue(key, value, comparator, options.prefix);
}


function _traverseJSON(items, baseKey, prop, item, path, options) {
  // let cast;
  //
  // if (path[path.length - 1].includes('::')) {
  //   const tmp = path[path.length - 1].split('::');
  //   cast = tmp[1];
  //   path[path.length - 1] = tmp[0];
  // }

  // const pathKey = this.jsonPathExtractionQuery(baseKey, path);
  const pathKey = `${baseKey}.${path}`;

  if (_.isPlainObject(item)) {
    Utils.getOperators(item).forEach(op => {
      // const value = this._toJSONValue(item[op]);
      const value = item[op];
      items.push(whereItemQuery(pathKey, { [op]: value }, options));
    });
    _.forOwn(item, (value, itemProp) => {
      _traverseJSON(items, baseKey, itemProp, value, path.concat([itemProp]), options);
    });

    return;
  }

  // item = this._toJSONValue(item);
  items.push(whereItemQuery(pathKey, { [Op.eq]: item }, options));
}

function _findField(key, options) {
  if (options.field) {
    return options.field;
  }

  if (options.model && options.model.rawAttributes && options.model.rawAttributes[key]) {
    return options.model.rawAttributes[key];
  }

  if (options.model && options.model.fieldRawAttributesMap && options.model.fieldRawAttributesMap[key]) {
    return options.model.fieldRawAttributesMap[key];
  }
}

const JsOpDict = {
  [Op.eq]: (a, b) => a === b,
  [Op.ne]: (a, b) => a !== b,
  [Op.gte]: (a, b) => a >= b,
  [Op.gt]: (a, b) => a > b,
  [Op.lte]: (a, b) => a <= b,
  [Op.lt]: (a, b) => a < b,
  [Op.not]: (a, b) => a !== b, // ?
  [Op.is]: (a, b) => a === b,
  [Op.in]: (a, b) => _.includes(b, a),
  [Op.notIn]: (a, b) => !_.includes(b, a),
  [Op.like]: (a, b) => {
    const start = _.startsWith(b, '%');
    const end = _.endsWith(b, '%');
    if (start && end) {
      return a.includes(b);
    }
    if (start) {
      return _.endsWith(a, b);
    }
    if (end) {
      return _.startsWith(a, b);
    }
    return a === b;
  },
  [Op.notLike]: (a, b) => {
    const start = _.startsWith(b, '%');
    const end = _.endsWith(b, '%');
    if (start && end) {
      return !a.includes(b);
    }
    if (start) {
      return !_.endsWith(a, b);
    }
    if (end) {
      return !_.startsWith(a, b);
    }
    return a !== b;
  },
  [Op.iLike]: (a, b) => {
    a = _.toUpper(a);
    b = _.toUpper(b);
    const start = _.startsWith(b, '%');
    const end = _.endsWith(b, '%');
    if (start && end) {
      return a.includes(b);
    }
    if (start) {
      return _.endsWith(a, b);
    }
    if (end) {
      return _.startsWith(a, b);
    }
    return a === b;
  },
  [Op.notILike]: (a, b) => {
    a = _.toUpper(a);
    b = _.toUpper(b);
    const start = _.startsWith(b, '%');
    const end = _.endsWith(b, '%');
    if (start && end) {
      return !a.includes(b);
    }
    if (start) {
      return !_.endsWith(a, b);
    }
    if (end) {
      return !_.startsWith(a, b);
    }
    return a !== b;
  },
  [Op.startsWith]: 'LIKE',
  [Op.endsWith]: 'LIKE',
  [Op.substring]: 'LIKE',
  [Op.regexp]: (a, b) => b.test(a),
  [Op.notRegexp]: '!~',
  [Op.iRegexp]: '~*',
  [Op.notIRegexp]: '!~*',
  [Op.between]: (a, b) => {
    const [start, end] = b;
    return a >= start && a < end;
  },
  [Op.notBetween]: (a, b) => {
    const [start, end] = b;
    return a < start && a >= end;
  },
  [Op.overlap]: '&&',
  [Op.contains]: (a, b) => {
    if (_.isString(b)) {
      return a.includes(b);
    } if (_.isArray(b)) {
      return _.difference(b, a).length === 0;
    } if (_.isObject(b)) {
      return JSON.stringify(_.pick(a, _.keys(b))) === JSON.stringify(b);
    }
    return false;
  },
  [Op.contained]: '<@',
  [Op.adjacent]: '-|-',
  [Op.strictLeft]: '<<',
  [Op.strictRight]: '>>',
  [Op.noExtendRight]: '&<',
  [Op.noExtendLeft]: '&>',
  [Op.any]: 'ANY',
  [Op.all]: 'ALL',
  [Op.and]: ' AND ',
  [Op.or]: ' OR ',
  [Op.col]: 'COL',
  [Op.placeholder]: '$$PLACEHOLDER$$'
};

const sqlOpToJsOpDict = Utils.getComplexKeys(OpHelper.OperatorMap).reduce((acc, symb) => {
  const sqlOp = OpHelper.OperatorMap[symb];
  acc[sqlOp] = JsOpDict[symb];
  return acc;
}, {});

function _joinKeyValue(key, value, comparator, prefix) {
  if (!key) {
    return value;
  }
  if (comparator === undefined) {
    throw new Error(`${key} and ${value} has no comparator`);
  }

  const jsOp = sqlOpToJsOpDict[comparator];
  const path = prefix ? _.toPath(`${prefix}.${key}`) : _.toPath(key);
  return obj => {
    const colVal = _.get(obj, path);
    return jsOp(colVal, value);
  };
  // key = this._getSafeKey(key, prefix);
  // return [key, value].join(` ${comparator} `);
}



/**
 * 针对 where 里的 json 筛选，生成客户端筛选函数
 *
 * @param {string} tableName
 * @param {Object} options
 * @param {Model}  model
 *
 * @returns {Function}
 */
function generateClientSideFilterForJsonCond(tableName, options, model) {
  const filters = getWhereConditions(options.where, tableName, model, options);
  return _.isEmpty(filters)
    ? _.identity
    : _.size(filters) === 1
      ? filters[0]
      : _.overEvery(filters);
}

/**
 * 判断filter中是否包含json字段
 *
 * @param {Object} model 
 * @param {Object} options 
 */
function isJsonFilter(model, options) {
  const jsonTypeFieldNames = _.values(model.fieldRawAttributesMap).filter(p => p.type instanceof DataTypes.JSON).map(p => p.fieldName);
  if (!jsonTypeFieldNames.length) {
    return false;
  }
  const filterKeys = getFilterAllKeys(options.where).filter(_.identity);
  return !!_.intersection(filterKeys, jsonTypeFieldNames).length;
}

/**
 * 获取filter所有的key
 *
 * @param {*} filter 
 */
function getFilterAllKeys(filter) {
  const keys = _.keys(filter).map(k => {
    const index = k.indexOf('.');
    return index > 0 ? k.substring(0, index) : k;
  });
  const childKeys = _.values(filter).map(v => {
    if (typeof v === 'object') {
      return getFilterAllKeys(v);
    }
    return '';
  });
  return _.concat(keys, _.flatten(childKeys) );
}

/**
 * 对结果进行筛选
 *
 * @param {Promise} queryPromise
 * @param {Function} filterFunc
 * @param {Object} options
 * @returns {Promise}
 */
function doClientSideFilter(queryPromise, filterFunc, options) {
  // 应用 options 中的 limit 和 offset
  if (filterFunc === _.identity) {
    return queryPromise;
  }
  const { limit, offset, plain } = options;
  return queryPromise.then(objOrArr => {
    const isArray = Array.isArray(objOrArr);
    const arr = isArray ? objOrArr : [objOrArr];
    let res = arr.filter(filterFunc);
    if (offset) {
      res = _.drop(res, offset);
    }
    if (limit) {
      res = _.take(res, limit);
    }
    return plain ? res[0] || null : res;
  });
}

/**
 * 生成主键的filter
 *
 * @param {Function} data 
 * @param {Object} primaryKeyField 
 */
function getPrimaryKeyFilter(data, primaryKeyField) {
  const pks = primaryKeyField.split(',').filter(_.identity);
  if (!pks.length) {
    //throw error
    throw new Error('operation table does not exist primaryKey');
  }
  if (!data) {
    return {
      [pks[0]]: {
        $in: []
      }
    };
  }
  if (pks.length === 1) {
    return {
      [pks[0]]: {
        $in: data.map(p => _.get(p, pks[0], ''))
      }
    };
  }
  return {
    $or: data.map(p => {
      return _.reduce(pks, (r, v) => {
        r[v] = _.get(p, v, '');
        return r;
      }, {});
    })
  };
}

exports.generateClientSideFilterForJsonCond = generateClientSideFilterForJsonCond;
exports.doClientSideFilter = doClientSideFilter;
exports.getPrimaryKeyFilter = getPrimaryKeyFilter;
exports.isJsonFilter = isJsonFilter;
