var ccxt = require('ccxt');
var _ = require('lodash');
var moment = require('moment');

const util = require('../core/util');
const Errors = require('../core/error');
const log = require('../core/log');

const BATCH_SIZE = 100;

var Trader = function(config) {
  _.bindAll(this);

  this.post_only = true;
  this.use_sandbox = false;
  this.name = 'Cryptopia';
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

  this.public = new ccxt.cryptopia();
  this.private = new ccxt.cryptopia({
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
      `[cryptopia] (${funcName}) returned an irrecoverable error: ${
        error.message
      }`
    );
    return new Errors.AbortError('[cryptopia] ' + error.message);
  }

  log.debug(
    `[cryptopia] (${funcName}) returned an error, retrying: ${error.message}`
  );
  return new Errors.RetryError('[cryptopia] ' + error.message);
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
  /*
  var result = function(err, data) {
    if (err) return callback(err);

    var portfolio = data.map(function(account) {
      return {
        name: account.currency.toUpperCase(),
        amount: parseFloat(account.available),
      };
    });
    callback(undefined, portfolio);
  };

  let handler = cb =>
    this.gdax.getAccounts(this.handleResponse('getPortfolio', cb));
  util.retryCustom(retryForever, _.bind(handler, this), _.bind(result, this));
  */
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
  /*
  var result = function(err, data) {
    if (err) return callback(err);
    callback(undefined, { bid: +data.bid, ask: +data.ask });
  };

  let handler = cb =>
    this.gdax_public.getProductTicker(this.handleResponse('getTicker', cb));
  util.retryCustom(retryForever, _.bind(handler, this), _.bind(result, this));
  */

  this.public.fetchTicker(this.pair).then(ticker => {
    console.log("Ticker", ticker);
    callback(null, { bid: ticker.bid, ask: ticker.ask })
  })
  .catch(err => callback(err, null));

};

Trader.prototype.getFee = function(callback) {
  /*
  //https://www.gdax.com/fees
  const fee = this.asset == 'BTC' ? 0.0025 : 0.003;

  //There is no maker fee, not sure if we need taker fee here
  //If post only is enabled, gdax only does maker trades which are free
  callback(undefined, this.post_only ? 0 : fee);
  */
  return  callback(null, 0.0002);
};

Trader.prototype.buy = function(amount, price, callback) {
  /*
  var buyParams = {
    price: this.getMaxDecimalsNumber(price, this.currency == 'BTC' ? 5 : 2),
    size: this.getMaxDecimalsNumber(amount),
    product_id: this.pair,
    post_only: this.post_only,
  };

  var result = (err, data) => {
    if (err) return callback(err);
    callback(undefined, data.id);
  };

  let handler = cb => this.gdax.buy(buyParams, this.handleResponse('buy', cb));
  util.retryCustom(retryCritical, _.bind(handler, this), _.bind(result, this));
  */
};

Trader.prototype.sell = function(amount, price, callback) {
  /*
  var sellParams = {
    price: this.getMaxDecimalsNumber(price, this.currency == 'BTC' ? 5 : 2),
    size: this.getMaxDecimalsNumber(amount),
    product_id: this.pair,
    post_only: this.post_only,
  };

  var result = function(err, data) {
    if (err) return callback(err);
    callback(undefined, data.id);
  };

  let handler = cb =>
    this.gdax.sell(sellParams, this.handleResponse('buy', cb));
  util.retryCustom(retryCritical, _.bind(handler, this), _.bind(result, this));
  */
};

Trader.prototype.checkOrder = function(order, callback) {
  /*
  var result = function(err, data) {
    if (err) return callback(err);

    var status = data.status;
    if (status == 'done') {
      return callback(undefined, true);
    } else if (status == 'rejected') {
      return callback(undefined, false);
    } else if (status == 'pending') {
      return callback(undefined, false);
    }
    callback(undefined, false);
  };

  let handler = cb =>
    this.gdax.getOrder(order, this.handleResponse('checkOrder', cb));
  util.retryCustom(retryCritical, _.bind(handler, this), _.bind(result, this));
  */
};

Trader.prototype.getOrder = function(order, callback) {
  /*
  var result = function(err, data) {
    if (err) return callback(err);

    var price = parseFloat(data.price);
    var amount = parseFloat(data.filled_size);
    var date = moment(data.done_at);

    callback(undefined, { price, amount, date });
  };

  let handler = cb =>
    this.gdax.getOrder(order, this.handleResponse('getOrder', cb));
  util.retryCustom(retryForever, _.bind(handler, this), _.bind(result, this));
  */
};

Trader.prototype.cancelOrder = function(order, callback) {
  /*
  var result = function(err, data) {
    // todo, verify result..
    callback();
  };

  let handler = cb =>
    this.gdax.cancelOrder(order, this.handleResponse('cancelOrder', cb));
  util.retryCustom(retryForever, _.bind(handler, this), _.bind(result, this));
  */
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
    name: 'Cryptopia',
    slug: 'cryptopia',
    currencies: ['BTC'],
    assets: ['ETN', 'LINDA', 'PRL', 'WSX'],
    markets: [
      { pair: ['BTC', 'ETN'], minimalOrder: { amount: 0.00000001, unit: 'asset' } },
      { pair: ['BTC', 'LINDA'], minimalOrder: { amount: 0.00000001, unit: 'asset' } },
      { pair: ['BTC', 'PRL'], minimalOrder: { amount: 0.00000001, unit: 'asset' } },
      { pair: ['BTC', 'WSX'], minimalOrder: { amount: 0.00000001, unit: 'asset' } },
    ],
    requires: ['key', 'secret'],
    tid: 'date',
    tradable: true,
    fetchTimespan: 60,
    providesHistory: "date",
  };
};

module.exports = Trader;
