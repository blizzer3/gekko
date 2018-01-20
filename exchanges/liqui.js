var ccxt = require('ccxt');
var _ = require('lodash');
var moment = require('moment');

const util = require('../core/util');
const Errors = require('../core/error');
const log = require('../core/log');

var Trader = function(config) {
  _.bindAll(this);

  this.post_only = true;
  this.use_sandbox = false;
  this.name = 'Liqui';
  this.scanback = false;
  this.scanbackTid = 0;
  this.scanbackResults = [];
  this.asset = config.asset;
  this.currency = config.currency;

  if (_.isObject(config)) {
    this.key = config.key;
    this.secret = config.secret;

    this.pair = [config.asset, config.currency].join('-').toUpperCase();
    this.post_only =
      typeof config.post_only !== 'undefined' ? config.post_only : true;
  }

  this.public = new ccxt.liqui();
  this.private = new ccxt.liqui({
    key: this.key,
    secret: this.secret,
  });
};

var retryCritical = {
  retries: 10,
  factor: 1.2,
  minTimeout: 10 * 1000,
  maxTimeout: 60 * 1000,
};

var retryForever = {
  forever: true,
  factor: 1.2,
  minTimeout: 10 * 1000,
  maxTimeout: 300 * 1000,
};

// Probably we need to update these string
var recoverableErrors = new RegExp(
  /(SOCKETTIMEDOUT|TIMEDOUT|CONNRESET|CONNREFUSED|NOTFOUND|Rate limit exceeded|Response code 5)/
);

Trader.prototype.processError = function(funcName, error) {
  if (!error) return undefined;

  if (!error.message.match(recoverableErrors)) {
    log.error(
      `[bleutrade] (${funcName}) returned an irrecoverable error: ${
        error.message
      }`
    );
    return new Errors.AbortError('[bleutrade] ' + error.message);
  }

  log.debug(
    `[bleutrade] (${funcName}) returned an error, retrying: ${error.message}`
  );
  return new Errors.RetryError('[cryptbleutradeopia] ' + error.message);
};

Trader.prototype.handleResponse = function(funcName, callback) {
  return (error, response, body) => {
    if (body && !_.isEmpty(body.message)) error = new Error(body.message);
    else if (
      response &&
      response.statusCode < 200 &&
      response.statusCode >= 300
    )
      error = new Error(`Response code ${response.statusCode}`);

    return callback(this.processError(funcName, error), body);
  };
};

Trader.prototype.getPortfolio = function(callback) {

  this.private.getBalance()
    .then(balances => this.mapBalances)
    .then(balances => callback(null, balances))
    .catch(err => callback(err, null));
};

Trader.prototype.mapBalances = function (balances) {
  return Object.keys(balances).map((balance) => {
    return {
      name: balance,
      amount: balances[balance].total
    }
  })
}

Trader.prototype.getTicker = function(callback) {
  console.log("getTicker", this);

  this.public.fetchTicker(this.pair).then(ticker => {
    console.log("Ticker", ticker);
    callback(null, { bid: ticker.bid, ask: ticker.ask })
  })
  .catch(err => callback(err, null));

};

Trader.prototype.getFee = function(callback) {

  return  callback(null, 0.00025);
};

Trader.prototype.buy = function(amount, price, callback) {

};

Trader.prototype.sell = function(amount, price, callback) {

};

Trader.prototype.checkOrder = function(order, callback) {

};

Trader.prototype.getOrder = function(order, callback) {

};

Trader.prototype.cancelOrder = function(order, callback) {

};

Trader.prototype.transformPair = function () {
  return this.pair.replace("-", "/");
};

Trader.prototype.getTrades = function(since, callback, descending) {

  this.public.fetchTrades(this.transformPair())
    .then(trades => {
      return trades.map((trade) => {
        return {
          date: trade.timestamp / 1000,
          price: trade.price,
          amount: trade.amount,
          tid: trade.timestamp + trade.price + trade.amount,
        }
      });
    })
    .then(trades => {
      callback(null, descending ? trades : trades.reverse())
    })
    .catch(err => {
      callback(err, null);
    });
};

Trader.getCapabilities = function() {
  return {
    name: 'Liqui',
    slug: 'liqui',
    currencies: ['BTC'],
    assets: ['TRX'],
    markets: [
      { pair: ['BTC', 'TRX'], minimalOrder: { amount: 0.00000001, unit: 'asset' } },
    ],
    requires: ['key', 'secret'],
    tid: 'date',
    tradable: true,
    fetchTimespan: 60,
    providesHistory: "date",
  };
};

module.exports = Trader;
