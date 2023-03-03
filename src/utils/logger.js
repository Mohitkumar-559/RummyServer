const fs = require('fs');
const logger = require("log4js");
require('dotenv').config()

exports.setupLogger = async () => {
  // console.log(process.env)
  const LOG_DIR = process.env.LOG_DIR || "./logs"
  logger.configure({
    appenders: {
      everything: {
        type: 'multiFile', base: 'logs/', property: 'gameId', extension: '.log',
        maxLogSize: 10485760, backups: 3, compress: true
      }
    },
    categories: {
      default: { appenders: ['everything'], level: process.env.LOG_LEVEL }
    }
  });
  initGlobalLogger();
}


exports.gameLog = (gameId, ...args) => {
  const userLogger = logger.getLogger('game');
  userLogger.addContext('gameId', gameId);
  const logs = args.map((val) => {
    let log = JSON.stringify(val);
    return log == '{}' ? val : log
  })
  userLogger.info('', ...logs);
}

Log = (gameId, ...args) => {
  gameId = 'sep-' + gameId
  const userLogger = logger.getLogger('game');
  userLogger.addContext('gameId', gameId);
  const logs = args.map((val) => {
    try {
      let log = JSON.stringify(val);
      return log == '{}' ? val : log
    } catch (err) {
      return val;
    }
  })
  userLogger.info('', ...logs);
}

exports.Log = Log

function initGlobalLogger() {
  process.on('uncaughtException', async (err) => {
    try {
      console.error('GLOBAL ERROR=>', err)
      Log('global-err', 'uncaughtException=>', err['stack'], '<=uncaughtException');
    } catch (err) {
      console.log(err);
    }
    process.exit(1);
  });

  process.on('unhandledRejection', async (reason, promise) => {
    try {
      console.error('GLOBAL ERROR=>', reason)
      Log('global-err', 'uncaughtRejection=>', reason['stack'], '<=uncaughtRejection');
    } catch (err) {
      console.log(err);
    }
    process.exit(1);
  });
}