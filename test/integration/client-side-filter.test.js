'use strict';

const chai = require('chai'),
  expect = chai.expect,
  Support = require('../unit/support'),
  Sequelize = Support.Sequelize,
  _ = require('lodash');

describe('Client side filter', () => {
  let sequelize, DB2Test;
  before(() => {
    // 兼容旧版本调用方式
    sequelize = Support.createSequelizeInstance({
      logging: console.log,
      operatorsAliases: _.mapKeys(Sequelize.Op, (v, k) => `$${k}`)
    });
    DB2Test = sequelize.define('DB2Test', {
      id: {
        type: Sequelize.STRING(32),
        primaryKey: true
      },
      name: Sequelize.STRING,
      visitCount: Sequelize.INTEGER,
      price: Sequelize.FLOAT,
      is_private: Sequelize.BOOLEAN,
      params: {
        type: Sequelize.JSONB,
        defaultValue: {}
      }
    });
    return DB2Test.sync({ force: true });
  });

  after(() => {
  });

  it('should be create success', () => {
    return DB2Test.create({
      id: 's1',
      name: 'slice_01',
      visitCount: 10,
      price: 5.2,
      is_private: true,
      params: {
        type: 'line'
      }
    }).then(slice1 => {
      const { id, name, visitCount, price, is_private, params } = slice1 || { };
      expect(id).to.equal('s1');
      expect(name).to.equal('slice_01');
      expect(visitCount).to.equal(10);
      expect(price).to.equal(5.2);
      expect(is_private).to.equal(true);
      expect(params && params.type).to.equal('line');
    });
  });

  it('should be bulk create success', () => {
    const s2 = {
      id: 's2',
      name: 'slice_02',
      visitCount: 20,
      price: 10.4,
      is_private: false,
      params: { type: 'bar' }
    };
    const s3 = {
      id: 's3',
      name: 'slice_03',
      visitCount: 30,
      price: 15.8,
      is_private: true,
      params: { type: 'pie' }
    };
    return DB2Test.bulkCreate([s2, s3])
      .then(() => {
        return DB2Test.findAll({
          where: {
            id: { $in: ['s2', 's3'] }
          },
          raw: true
        });
      })
      .then(slices => {
        const keys = Object.keys(s2);
        const picked = slices.map(s => _.pick(s, keys));
        expect(picked).to.deep.equal([s2, s3]);
      });
  });

  it('should be find success(findOne)', () => {
    return DB2Test.findOne({
      where: {
        id: 's1'
      },
      raw: true
    }).then(slice1 => {
      const { id, name, visitCount, price, is_private, params } = slice1 || { };
      expect(id).to.equal('s1');
      expect(name).to.equal('slice_01');
      expect(visitCount).to.equal(10);
      expect(price).to.equal(5.2);
      expect(is_private).to.equal(true);
      expect(params && params.type).to.equal('line');
    });
  });

  it('should be find success(findAll)', () => {
    return DB2Test.findAll({
      where: {
        id: 's1'
      },
      raw: true
    }).then(arr => {
      const { id, name, visitCount, price, is_private, params } = arr[0] || { };
      expect(id).to.equal('s1');
      expect(name).to.equal('slice_01');
      expect(visitCount).to.equal(10);
      expect(price).to.equal(5.2);
      expect(is_private).to.equal(true);
      expect(params && params.type).to.equal('line');
    });
  });

  it('should be find nothing', () => {
    return DB2Test.findOne({
      where: {
        id: 's0'
      },
      raw: true
    }).then(slice1 => {
      expect(!slice1).to.equal(true);
    });
  });

  it('should be find success(json sub query)', () => {
    return DB2Test.findOne({
      where: {
        params: { type: 'line' }
      },
      raw: true
    }).then(slice1 => {
      const { id, name, visitCount, price, is_private, params } = slice1 || { };
      expect(id).to.equal('s1');
      expect(name).to.equal('slice_01');
      expect(visitCount).to.equal(10);
      expect(price).to.equal(5.2);
      expect(is_private).to.equal(true);
      expect(params && params.type).to.equal('line');
    });
  });

  it('should be find success(json sub query with nested key)', () => {
    return DB2Test.findOne({
      where: {
        'params.type': 'line'
      },
      raw: true
    }).then(slice1 => {
      const { id, name, visitCount, price, is_private, params } = slice1 || { };
      expect(id).to.equal('s1');
      expect(name).to.equal('slice_01');
      expect(visitCount).to.equal(10);
      expect(price).to.equal(5.2);
      expect(is_private).to.equal(true);
      expect(params && params.type).to.equal('line');
    });
  });

  it('should be find nothing(json sub query)', () => {
    return DB2Test.findOne({
      where: {
        params: { type: 'line1' }
      },
      raw: true
    }).then(slice1 => {
      expect(!slice1).to.equal(true);
    });
  });

  it('should be find nothing(json sub query with nested key)', () => {
    return DB2Test.findOne({
      where: {
        'params.type': 'line1'
      },
      raw: true
    }).then(slice1 => {
      expect(!slice1).to.equal(true);
    });
  });

  /*it('should be find success(string path for json query)', async () => {
    let slice1 = await DB2Test.findOne({
      where: {
        'params.type': 'line'
      }
    })
    const { id, name, visitCount, price, is_private, params } = slice1 || { };
    expect(id).to.equal('s1');
    expect(name).to.equal('slice_01');
    expect(visitCount).to.equal(10);
    expect(price).to.equal(5.2);
    expect(is_private).to.equal(true);
    expect(params && params.type).to.equal('line');
  })*/

  // TODO findAll where -> findAll, client side filter
  // TODO count where -> findAll, client side aggregate
  // TODO update where -> findAll, updateById
  // TODO delete where -> findAll, deleteById
});
