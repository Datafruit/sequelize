'use strict';

const chai = require('chai'),
  expect = chai.expect,
  Support = require('../unit/support'),
  Sequelize = Support.Sequelize;

describe('Client side filter', () => {
  let sequelize, DB2Test;
  before(() => {
    sequelize = Support.createSequelizeInstance({ logging: console.log });
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

  /*it('should be find success(findAll)', () => {
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

  it('should be find success(json sub query)', async () => {
    let slice1 = await DB2Test.findOne({
      where: {
        params: { type: 'line' }
      }
    })
    const { id, name, visitCount, price, is_private, params } = slice1 || { };
    expect(id).to.equal('s1');
    expect(name).to.equal('slice_01');
    expect(visitCount).to.equal(10);
    expect(price).to.equal(5.2);
    expect(is_private).to.equal(true);
    expect(params && params.type).to.equal('line');
  })

  it('should be find success(string path for json query)', async () => {
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
});
