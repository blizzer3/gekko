// helpers
var _ = require('lodash');
var log = require('../core/log.js');

// let's create our own method
var method = {};

// prepare everything our method needs
method.init = function() {
  log.debug("PPO-RSITSI Settings", this.settings);
  this.name = 'PPO-RSITSI';

  this.trend = {
    direction: 'none',
    duration: 0,
    persisted: false,
    adviced: false
  };

  this.requiredHistory = this.tradingAdvisor.historySize;

  // define the indicators we need
  this.addIndicator('tsi', 'TSI', this.settings.TSI);
  this.addIndicator('ppo', 'PPO', this.settings.PPO);
  this.addIndicator('rsi', 'RSI', this.settings.RSI);

  this.RSIhistory = [];
}

// for debugging purposes log the last
// calculated parameters.
method.log = function(candle) {
  /*
  var digits = 8;
  var tsi = this.indicators.tsi;
  var rsi = this.indicators.rsi;
  var ppo = this.indicators.ppo;
  log.debug('calculated Ultimate Oscillator properties for candle:');
  log.debug('\t', 'tsi:', tsi.tsi.toFixed(digits));
  log.debug('\t', 'rsi:', rsi.result.toFixed(digits));
  log.debug('\t', 'ppo:', ppo.result.ppo.toFixed(digits));
  log.debug('\t', 'price:', candle.close.toFixed(digits));
  */
}

// what happens on every new candle?
method.update = function(candle) {
	this.rsi = this.indicators.rsi.result;

	this.RSIhistory.push(this.rsi);

	if(_.size(this.RSIhistory) > this.interval)
		// remove oldest RSI value
		this.RSIhistory.shift();

	this.lowestRSI = _.min(this.RSIhistory);
	this.highestRSI = _.max(this.RSIhistory);
	this.stochRSI = ((this.rsi - this.lowestRSI) / (this.highestRSI - this.lowestRSI)) * 100;
}

method.check = function() {
  var tsi = this.indicators.tsi;
  var ppo = this.indicators.ppo;

  var tsiVal = tsi.tsi;
  var ppoVal = ppo.PPOhist;

  if(ppoVal > this.settings.PPO.up && (this.stochRSI > this.settings.RSI.high || tsiVal > this.settings.TSI.high)) {



    // new trend detected
    if(this.trend.direction !== 'high')
      this.trend = {
        duration: 0,
        persisted: false,
        direction: 'high',
        adviced: false
      };

    this.trend.duration++;

    // log.debug('In high since', this.trend.duration, 'candle(s)');

    if(this.trend.duration >= this.settings.persistence)
      this.trend.persisted = true;

    if(this.trend.persisted && !this.trend.adviced) {
      this.trend.adviced = true;
      log.debug("Advising Short");
      log.debug("PPO", ppoVal, ">", this.settings.PPO.up);
      log.debug("RSI", this.stochRSI, ">", this.settings.RSI.high);
      log.debug("TSI", tsiVal, ">", this.settings.TSI.high);
      log.debug(this.stochRSI > this.settings.RSI.high ? "RSI Passed" : "RSI Failed");
      log.debug(tsiVal > this.settings.TSI.high ? "TSI Passed" : "TSI Failed");

      this.advice('short');
    } else
      this.advice();

  } else if(ppoVal < this.settings.PPO.down && (this.stochRSI < this.settings.RSI.low || tsiVal < this.settings.TSI.low)) {

    // new trend detected
    if(this.trend.direction !== 'low')
      this.trend = {
        duration: 0,
        persisted: false,
        direction: 'low',
        adviced: false
      };

    this.trend.duration++;

    // log.debug('In low since', this.trend.duration, 'candle(s)');

    if(this.trend.duration >= this.settings.persistence)
      this.trend.persisted = true;

    if(this.trend.persisted && !this.trend.adviced) {
      this.trend.adviced = true;
      log.debug("Advising Long");
      log.debug("PPO", ppoVal, "<", this.settings.PPO.down);
      log.debug("RSI", this.stochRSI, "<", this.settings.RSI.low);
      log.debug("TSI", tsiVal, "<", this.settings.TSI.low);
      log.debug(this.stochRSI < this.settings.RSI.low ? "RSI Passed" : "RSI Failed");
      log.debug(tsiVal < this.settings.TSI.low ? "TSI Passed" : "TSI Failed");
      this.advice('long');
    } else
      this.advice();

  } else {

    //log.debug('In no trend');

    this.advice();
  }
}

module.exports = method;
