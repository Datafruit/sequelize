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
    DB2Test = sequelize.define('DB2Test2', {
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
              id: { $ne: sampleData[0].id }
            },
            raw: true
          });
        })
        .then(slices => {
          expect(records).to.deep.equal(slices.map(pickNeed));
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

    it('should be find success(findAll gt)', () => {
      const targets = _.filter(sampleData, s => s.visitCount > 30);
      return DB2Test.findAll({
        where: {
          visitCount: { $gt: 30 }
        },
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

    it('should be find success(findAll lte)', () => {
      const targets = _.filter(sampleData, s => s.visitCount <= 30);
      return DB2Test.findAll({
        where: {
          visitCount: { $lte: 30 }
        },
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

    it('should be find success(findAll like)', () => {
      const targets = _.filter(sampleData, s => _.startsWith(s.name, 'slice_1'));
      return DB2Test.findAll({
        where: {
          name: { $like: 'slice_1%' }
        },
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

    it('should be find success(findAll not like)', () => {
      const targets = _.filter(sampleData, s => !_.startsWith(s.name, 'slice_1'));
      return DB2Test.findAll({
        where: {
          name: {
            $notLike: 'slice_1%'
          }
        },
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

    it('should be find success(findAll iLike)', () => {
      const targets = _.filter(sampleData, s => _.startsWith(s.name, 'slice_1'));
      return DB2Test.findAll({
        where: {
          name: { $iLike: 'SLICE_1%' }
        },
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

    it('should be find success(findAll in)', () => {
      const targets = _.filter(sampleData, s => s.name === 'slice_1' || s.name === 'slice_3');
      return DB2Test.findAll({
        where: {
          name: { $in: ['slice_1', 'slice_3'] }
        },
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

    it('should be find success(findAll ne)', () => {
      const targets = _.filter(sampleData, s => s.name !== 'slice_1');
      return DB2Test.findAll({
        where: {
          name: { $ne: 'slice_1' }
        },
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

    it('should be find success(findAll orderBy)', () => {
      const targets = _.orderBy(sampleData, s => s.visitCount, 'desc');
      return DB2Test.findAll({
        order: [['visitCount', 'desc']],
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

    it('should be find success(findAll offset limit)', () => {
      const targets = _(sampleData).drop(5).take(5).value();
      return DB2Test.findAll({
        offset: 5,
        limit: 5,
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

    it('should be find success(findAll or)', () => {
      const targets = _.filter(sampleData, s => s.id === 's2' || s.name === 'slice_3');
      return DB2Test.findAll({
        where: {
          $or: [{ id: 's2' }, { name: 'slice_3' }]
        },
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

    it('should be find success(findAll or array)', () => {
      const targets = _.filter(sampleData, s => s.visitCount === 10 || s.visitCount === 20);
      return DB2Test.findAll({
        where: {
          visitCount: {
            $or: [10, 20]
          }
        },
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

    it('should be find success(findAll and)', () => {
      const targets = _.filter(sampleData, s => s.id === 's2' || s.name === 'slice_2');
      return DB2Test.findAll({
        where: {
          $and: {
            id: 's2',
            name: 'slice_2'
          }
        },
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

    it('should be find success(findAll not)', () => {
      const targets = _.filter(sampleData, s => !(s.visitCount <= 50 && 6 <= s.price));
      return DB2Test.findAll({
        where: {
          $not: {
            visitCount: { $lte: 50 },
            price: { $gte: 6 }
          }
        },
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

  });

  describe('Json query', () => {
    it('should be find success(json sub query)', () => {
      const target = _.find(sampleData, s => _.get(s, 'params.type') === 'pie');
      return DB2Test.findOne({
        where: {
          params: { type: 'pie' }
        },
        raw: true
      }).then(slice1 => {
        expect(pickNeed(slice1)).to.deep.equal(target);
      });
    });

    it('should be find success(mix json filter with non json filter)', () => {
      const targets = _.filter(sampleData, s => s.id === 's3' && _.get(s, 'params.type') === 'pie');
      return DB2Test.findAll({
        where: {
          id: 's3',
          params: { type: 'pie' }
        },
        raw: true
      }).then(slices => {
        expect(targets).to.deep.equal(slices.map(pickNeed));
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
        expect(pickNeed(slice1)).to.deep.equal(target);
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

    it('should be find nothing(mix json filter with non json filter)', () => {
      return DB2Test.findOne({
        where: {
          id: 's1',
          'params.type': 'line1'
        },
        raw: true
      }).then(slice1 => {
        expect(true).to.equal(!slice1);
      });
    });

    it('should be find success(json sub query)', () => {
      const targets = _.filter(sampleData, s => _.get(s, 'params.type') === 'pie');
      return DB2Test.findAll({
        where: {
          params: { type: 'pie' }
        },
        raw: true
      }).then(slices => {
        expect(slices.map(pickNeed)).to.deep.equal(targets);
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
        expect(slices.map(pickNeed)).to.deep.equal(targets);
      });
    });

    it('should be find nothing(json sub query)', () => {
      return DB2Test.findAll({
        where: {
          params: { type: 'pie0' }
        },
        raw: true
      }).then(slices => {
        expect(slices).to.deep.equal([]);
      });
    });

    it('should be find nothing(json sub query with nested key)', () => {
      return DB2Test.findAll({
        where: {
          'params.type': 'bar0'
        },
        raw: true
      }).then(slices => {
        expect(slices).to.deep.equal([]);
      });
    });

    it('should be find success(findAll gt)', () => {
      const targets = _.filter(sampleData, s => {
        const refreshInterval = _.get(s, 'params.extraSettings.refreshInterval');
        return _.isNumber(refreshInterval) && 30 < refreshInterval;
      });
      return DB2Test.findAll({
        where: {
          'params.extraSettings.refreshInterval': { $gt: 30 }
        },
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

    it('should be find success(findAll lte)', () => {
      const targets = _.filter(sampleData, s => {
        const refreshInterval = _.get(s, 'params.extraSettings.refreshInterval');
        return _.isNumber(refreshInterval) && refreshInterval <= 30;
      });
      return DB2Test.findAll({
        where: {
          'params.extraSettings.refreshInterval': { $lte: 30 }
        },
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

    it('should be find success(findAll like)', () => {
      const targets = _.filter(sampleData, s => _.startsWith(s.params.type, 'pi'));
      return DB2Test.findAll({
        where: {
          'params.type': { $like: 'pi%' }
        },
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

    it('should be find success(findAll not like)', () => {
      const targets = _.filter(sampleData, s => !_.startsWith(s.params.type, 'pi'));
      return DB2Test.findAll({
        where: {
          'params.type': { $notLike: 'pi%' }
        },
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

    it('should be find success(findAll iLike)', () => {
      const targets = _.filter(sampleData, s => _.startsWith(s.params.type, 'pi'));
      return DB2Test.findAll({
        where: {
          'params.type': { $iLike: 'PI%' }
        },
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

    it('should be find success(findAll in)', () => {
      const targets = _.filter(sampleData, s => s.params.type === 'line' || s.params.type === 'pie');
      return DB2Test.findAll({
        where: {
          'params.type': { $in: ['line', 'pie'] }
        },
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

    it('should be find success(findAll ne)', () => {
      const targets = _.filter(sampleData, s => s.params.type !== 'bar');
      return DB2Test.findAll({
        where: {
          'params.type': { $ne: 'bar' }
        },
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

    // TODO
    it.skip('should be find success(findAll json orderBy)', () => {
      const targets = _.orderBy(sampleData, s => s.params.type, 'desc');
      return DB2Test.findAll({
        order: [['params.type', 'desc']],
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

    it('should be find success(json sub query with offset limit)', () => {
      const targets = _(sampleData).filter(s => _.get(s, 'params.type') === 'pie').drop(5).take(5).value();
      return DB2Test.findAll({
        where: {
          params: { type: 'pie' }
        },
        offset: 5,
        limit: 5,
        raw: true
      }).then(slices => {
        expect(slices.map(pickNeed)).to.deep.equal(targets);
      });
    });

    it('should be find success(findAll or)', () => {
      const targets = _.filter(sampleData, s => {
        const type = _.get(s, 'params.type');
        return type === 'line' || type === 'pie';
      });
      return DB2Test.findAll({
        where: {
          $or: [{ 'params.type': 'line' }, { 'params.type': 'pie' }]
        },
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

    it('should be find success(findAll or array)', () => {
      const targets = _.filter(sampleData, s => {
        const type = _.get(s, 'params.extraSettings.refreshInterval');
        return type === 25 || type === 50;
      });
      return DB2Test.findAll({
        where: {
          'params.extraSettings.refreshInterval': {
            $or: [25, 50]
          }
        },
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

    it('should be find success(findAll and)', () => {
      const targets = _.filter(sampleData, s => {
        return _.get(s, 'params.type') === 'bar'
          && _.get(s, 'params.extraSettings.refreshInterval') === 20;
      });
      return DB2Test.findAll({
        where: {
          $and: {
            'params.type': 'bar',
            'params.extraSettings.refreshInterval': 20
          }
        },
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });

    it('should be find success(findAll not)', () => {
      const targets = _.filter(sampleData, s => {
        return !(_.get(s, 'params.type') === 'pie'
          && _.get(s, 'params.extraSettings.refreshInterval') === 25);
      });
      return DB2Test.findAll({
        where: {
          $not: {
            'params.type': 'pie',
            'params.extraSettings.refreshInterval': 25
          }
        },
        raw: true
      }).then(arr => {
        expect(targets).to.deep.equal(arr.map(pickNeed));
      });
    });
  });

  describe('findAndCountAll ', () => {
    it('findAndCountAll by pk', () => {
      return DB2Test.findAndCountAll({
        where: {
          id: 's1'
        }
      }).then(res => {
        console.log('findAndCountAll by pk ====>', res.count);
      });
    });

    it('findAndCountAll by bl', () => {
      return DB2Test.findAndCountAll({
        where: {
          is_private: true
        }
      }).then(res => {
        console.log('findAndCountAll by bl ====>', res.count);
      });
    });

    it('findAndCountAll by json', () => {
      return DB2Test.findAndCountAll({
        where: {
          params: { type: 'bar' }
        },
        raw: true
      }).then(res => {
        console.log('findAndCountAll by json ====>', res.count);
      });
    });
    // TODO gt lte like iLike in ne orderby limit or and not
  });

  describe('update test', () => {
    it('update by pk', () => {
      return DB2Test.update({
        price: 999.99
      }, {
        where: {
          id: 's1'
        }
      }).then(res => {
        console.log('update by pk', res);
      });
    });

    it('update by bl', () => {
      return DB2Test.update({
        is_private: false
      }, {
        where: {
          is_private: true
        }
      }).then(res => {
        console.log('update by bl', res);
      });
    });

    it('update by json', () => {
      return DB2Test.update({
        params: { type: 'bar999' }
      }, {
        where: {
          params: { type: 'bar' }
        },
        raw: true
      }).then(res => {
        console.log('update by json', res);
      });
    });
    // TODO gt lte like iLike in ne orderby limit or and not
  });


  describe('delete test', () => {
    it('delete by pk', () => {
      return DB2Test.destroy({
        where: {
          id: 's1'
        }
      }).then(res => {
        console.log('delete by pk ===>', res );
      });
    });

    it('delete by bl', () => {
      return DB2Test.destroy({
        where: {
          is_private: true
        }
      }).then(res => {
        console.log('delete by bl ===>', res );
      });
    });

    it('delete by json', () => {
      return DB2Test.destroy({
        where: {
          params: { type: 'bar999' }
        }
      }).then(res => {
        console.log('delete by json ===>', res );
      });
    });
    // TODO gt lte like iLike in ne orderby limit or and not
  });

});
