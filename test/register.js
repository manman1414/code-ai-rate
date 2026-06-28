/** 让 ts-node 使用测试专用 tsconfig */
const path = require('path');

process.env.TS_NODE_PROJECT = path.resolve(__dirname, '..', 'tsconfig.test.json');
require('ts-node/register');
