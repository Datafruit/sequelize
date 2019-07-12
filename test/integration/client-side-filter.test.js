'use strict';

const chai = require('chai'),
  expect = chai.expect,
  Support = require('../unit/support'),
  Sequelize = Support.Sequelize,
  _ = require('lodash');

describe('Client side filter', () => {
  let sequelize, DB2Test;
  const sampleData = _.range(50).map(i => ({
    id: `s${i + 1}`,
    name: `slice_${i + 1}`,
    visitCount: 10 + i,
    price: _.round(5.2 + i * 5.2, 2),
    is_private: i % 2 === 0,
    params: _.pickBy({
      type: i % 3 === 0 ? 'line' : i % 3 === 1 ? 'bar' : 'pie',
      dimensions: i % 2 === 0 ? ['event_name', 'duration'] : ['event_name'],
      metrics: ['total'],
      extraSettings: i % 5 === 0
        ? { timeZone: i % 3 === 0 ? 'Asia/Tokyo' : 'Asia/Shanghai', refreshInterval: 5 * i }
        : undefined
    }, _.identity)
  }));
  const needKeys = Object.keys(sampleData[0]);
  const pickNeed = obj => _.pick(obj, needKeys);

  before(() => {
    sequelize = Support.createSequelizeInstance({
      logging: console.log,
      // 兼容旧版本调用方式
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

  describe('Insert test', () => {
    it('should be create success', () => {
      return DB2Test.create(sampleData[0]).then(slice1 => {
        expect(sampleData[0]).to.deep.equal(pickNeed(slice1));
      });
    });

    it('should be bulk create success', () => {
      const records = _.drop(sampleData, 1);
      return DB2Test.bulkCreate(records)
        .then(() => {
          return DB2Test.findAll({
            where: {
              id: { $ne: 's1' }
            },
            raw: true
          });
        })
        .then(slices => {
          const picked = slices.map(pickNeed);
          expect(records).to.deep.equal(picked);
        });
    });
  });

  describe('Non json find', () => {
    it('should be find success(findOne)', () => {
      return DB2Test.findOne({
        where: {
          id: 's1'
        },
        raw: true
      }).then(slice1 => {
        expect(sampleData[0]).to.deep.equal(pickNeed(slice1));
      });
    });

    it('should be find success(findAll)', () => {
      return DB2Test.findAll({
        where: {
          id: sampleData[10].id
        },
        raw: true
      }).then(arr => {
        expect(sampleData[10]).to.deep.equal(pickNeed(arr[0]));
      });
    });

    it('should be find nothing', () => {
      return DB2Test.findOne({
        where: {
          id: 's0'
        },
        raw: true
      }).then(slice1 => {
        expect(true).to.equal(!slice1);
      });
    });

    // TODO gt lte like iLike in ne orderby limit or and not
  });

  describe('Basic json find', () => {
    it('should be find success(json sub query)', () => {
      const target = _.find(sampleData, s => _.get(s, 'params.type') === 'pie');
      return DB2Test.findOne({
        where: {
          params: { type: 'pie' }
        },
        raw: true
      }).then(slice1 => {
        expect(target).to.deep.equal(pickNeed(slice1));
      });
    });

    it('should be find success(json sub query with nested key)', () => {
      const target = _.find(sampleData, s => _.get(s, 'params.type') === 'bar');
      return DB2Test.findOne({
        where: {
          'params.type': 'bar'
        },
        raw: true
      }).then(slice1 => {
        expect(target).to.deep.equal(pickNeed(slice1));
      });
    });

    it('should be find nothing(json sub query)', () => {
      return DB2Test.findOne({
        where: {
          params: { type: 'line1' }
        },
        raw: true
      }).then(slice1 => {
        expect(true).to.equal(!slice1);
      });
    });

    it('should be find nothing(json sub query with nested key)', () => {
      return DB2Test.findOne({
        where: {
          'params.type': 'line1'
        },
        raw: true
      }).then(slice1 => {
        expect(true).to.equal(!slice1);
      });
    });

    // TODO gt lte like iLike in ne orderby limit or and not
  });

  describe('Json find all by client side filter', () => {
    it('should be find success(json sub query)', () => {
      const targets = _.filter(sampleData, s => _.get(s, 'params.type') === 'pie');
      return DB2Test.findAll({
        where: {
          params: { type: 'pie' }
        },
        raw: true
      }).then(slices => {
        expect(targets).to.deep.equal(slices.map(pickNeed));
      });
    });

    it('should be find success(json sub query with nested key)', () => {
      const targets = _.filter(sampleData, s => _.get(s, 'params.type') === 'bar');
      return DB2Test.findAll({
        where: {
          'params.type': 'bar'
        },
        raw: true
      }).then(slices => {
        expect(targets).to.deep.equal(slices.map(pickNeed));
      });
    });

    it('should be find nothing(json sub query)', () => {
      return DB2Test.findAll({
        where: {
          params: { type: 'pie0' }
        },
        raw: true
      }).then(slices => {
        expect([]).to.deep.equal(slices);
      });
    });

    it('should be find nothing(json sub query with nested key)', () => {
      return DB2Test.findAll({
        where: {
          'params.type': 'bar0'
        },
        raw: true
      }).then(slices => {
        expect([]).to.deep.equal(slices);
      });
    });

    // TODO gt lte like iLike in ne orderby limit or and not
  });

  // TODO count where -> findAll, client side aggregate
  // TODO update where -> findAll, updateById
  // TODO delete where -> findAll, deleteById
});
