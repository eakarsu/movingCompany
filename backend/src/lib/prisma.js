const { PrismaClient } = require('@prisma/client');

const globalKey = '__movingCompanyPrisma';

if (!global[globalKey]) {
  global[globalKey] = new PrismaClient();
}

module.exports = global[globalKey];
