'use strict';

const chai = require('chai'),
  expect = chai.expect,
  Support = require('../unit/support'),
  Sequelize = Support.Sequelize;

describe('Client side filter', () => {
  let sequelize, DB2Test;
  beforeEach(() => {
    sequelize = Support.createSequelizeInstance();
    DB2Test = sequelize.define('DB2Test', {
      id: {
        type: Sequelize.STRING(32),
        primaryKey: true
      },
      name: Sequelize.STRING
      // params: {
      //   type: Sequelize.JSON,
      //   defaultValue: {}
      // },
    });
    return DB2Test.sync({ force: true });
  });
  afterEach(() => {

  });
  it('should be ?', () => {
    // sequelize.query('SHOW client_min_messages')
    //   .then(result => {
    //     expect(result[0].client_min_messages).to.equal('error');
    //   });

    expect(1+1).to.equal(2);
  });
});
