const request = require('request');
const Abs = require("abs");
const Typpy = require("typpy");
const Ul = require("ul");
const Deffy = require("deffy");
const moment = require("moment");
require("moment-weekday-calc");
const _ = require('lodash');
const XLSX = require('xlsx');

// const holidays = []
const CONFIG_PATH = Abs("~/.git-stats-config.js")
// Defaults
GitStats.CONFIG_PATH = CONFIG_PATH
GitStats.DEFAULT_CONFIG = { };

/**
 * GitStats
 *
 * @name GitStats
 * @function
 * @param {String} dataPath Path to the data file.
 * @return {GitStats} The `GitStats` instance.
 */
function GitStats(dataPath) {
    // this.path = Abs(Deffy(dataPath, DEFAULT_STORE));
    this.config = {};
}

/**
 * getConfig
 * Fetches the configuration object from file (`~/.git-stats-config.js`).
 *
 * @name getConfig
 * @function
 * @param {Function} callback The callback function.
 * @return {Object|Undefined} If no callback is provided, the configuration object will be returned.
 */
GitStats.prototype.getConfig = function (callback) {
    let data = {}
      , err = null
      ;

    try {
        data = require(CONFIG_PATH);
    } catch (err) {
        if (err.code === "MODULE_NOT_FOUND") {
            err = null;
            data = {};
        }
    }

    if (callback) {
        return callback(err, data);
    } else {
        if (err) {
            throw err;
        }
    }

    return data;
};

/**
 * initConfig
 * Inits the configuration field (`this.config`).
 *
 * @name initConfig
 * @function
 * @param {Object|String} input The path to a custom git-stats configuration file or the configuration object.
 * @param {Function} callback The callback function.
 */
GitStats.prototype.initConfig = function (input, callback) {

    const self = this;

    if (Typpy(input, Function)) {
        callback = input;
        input = null;
    }

    input = input || CONFIG_PATH;

    // Handle object input
    if (Typpy(input, Object)) {
        this.config = Ul.deepMerge(input, GitStats.DEFAULT_CONFIG);
        callback && callback(null, this.config);
        return this.config;
    }

    if (callback) {
        this.getConfig(function (err, data) {
            if (err) { return callback(err); }
            self.initConfig(data, callback);
        });
    } else {
        this.initConfig(this.getConfig());
    }
};

GitStats.prototype.buildHeaders = function () {
    let auth = null;
    if (this.config.username && this.config.password && this.config.scheme === 'basic') {
      const username = this.config.username;
      const password = this.config.password;
      auth = "Basic " + new Buffer(username + ":" + password).toString("base64");
    }
    const headers = {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/55.0.2883.87 Safari/537.36"
    }
    if (auth) {
      headers.Authorization = auth;
    }

    return headers;
}
/**
 * getPullRequests
 * Creates the ANSI contributions calendar.
 *
 * @name ansiCalendar
 * @function
 * @param {Object} options The object passed to the `calendar` method.
 * @param {Function} callback The callback function.
 * @return {GitStats} The `GitStats` instance.
 */
GitStats.prototype.getPullRequests = function (options, callback) {

    if (typeof options === "function") {
        callback = options;
        options = undefined;
    }

    const url = "https://api.github.com/repos/" + this.config.org + "/" + this.config.repo + "/pulls";
    const headers = this.buildHeaders();
    request.get( {
      url : url,
      headers: headers,
    }, function(error, response, body) {
      // console.log('body : ', body);
      if (!error && response.statusCode == 200) {
        const info = JSON.parse(body);
        console.log(info.length + " Open PRs");
        console.log("===========");
        info.map(item => {
          console.log(item.user.login + " - " + item.title);
          console.log("  Opened: " + item.created_at)
          const openedTime = moment(item.created_at);
          const now = moment();
          const duration = moment.duration(now.diff(openedTime));
          const days = duration.asDays();
          console.log("  Opened for: " + days);
          console.log("  Opened workdays" + moment().isoWeekdayCalc({
            rangeStart: openedTime,
            rangeEnd: now,
            weekdays: [1,2,3,4,5],
          }))

        });
      }
      // console.log('Open PRs: ', body.length)
    } );

    return this;
};

GitStats.prototype.getURL = function (url, callback) {
  const headers = this.buildHeaders();
  request.get( {
    url : url,
    headers: headers,
  }, callback
);
}

function logEvents(events) {
  console.log('  Total Events: ', events.length);
  const labelRelated = _.filter(events, (o) => o.event === 'labeled' || o.event === 'unlabeled');
  console.log('  Label Events: ', labelRelated.length);
  let labelObj = {};
  labelRelated.map(item => {
    labelObj[item.label.name] = labelObj[item.label.name] || {};
    if (item.event === 'labeled') {
      labelObj[item.label.name].labeled = item.created_at;
    } else if (item.event === 'unlabeled') {
      labelObj[item.label.name].unlabeled = item.created_at;
    }
  });
  _.forEach(labelObj, (value, key) => {
    if (value.labeled && !value.unlabeled) {
      const openedTime = moment(value.labeled);
      const now = moment();
      const duration = moment.duration(now.diff(openedTime));
      const days = duration.asDays();
      console.log("  " + key + " label applied for " + moment().isoWeekdayCalc({
        rangeStart: openedTime,
        rangeEnd: now,
        weekdays: [1,2,3,4,5],
      }) + " weekdays.")
    } else {
      const openedTime = moment(value.labeled);
      const closedTime = moment(value.unlabeled);
      const duration = moment.duration(closedTime.diff(openedTime));
      const days = duration.asDays();
      console.log("  " + key + " label applied for " + moment().isoWeekdayCalc({
        rangeStart: openedTime,
        rangeEnd: closedTime,
        weekdays: [1,2,3,4,5],
      }) + " weekdays (now removed).")
    }
  });
}

GitStats.prototype.getIssues = function (options, callback) {

    const self = this;
    if (typeof options === "function") {
        callback = options;
        options = undefined;
    }

    const url = "https://api.github.com/repos/" + this.config.org + "/" + this.config.repo + "/issues";
    const headers = this.buildHeaders();
    request.get( {
      url : url,
      headers: headers,
    }, function(error, response, body) {
      // console.log('body : ', body);
      if (!error && response.statusCode == 200) {
        const jsonBody = JSON.parse(body);

        const pullRequests = _.filter(jsonBody, (o) => o.pull_request);

        const info = pullRequests;

        console.log(info.length + " Pull Requests");
        console.log("===========");
        info.map(item => {
          console.log(item.title);
          console.log("  Status: " + item.state);
          console.log("  Opened: " + moment(item.created_at).format('LLLL'));
          console.log("  By: " + item.user.login);
          console.log("  Comments: " + item.comments)
          const openedTime = moment(item.created_at);
          const now = moment();
          const duration = moment.duration(now.diff(openedTime));
          const days = duration.asDays();
          // console.log("  Actual days open: " + days);
          console.log("  Weekdays open: " + moment().isoWeekdayCalc({
            rangeStart: openedTime,
            rangeEnd: now,
            weekdays: [1,2,3,4,5],
          }))
          if (item.labels && item.labels.length > 0) {
            console.log("  Labels: " + _.flatMap(item.labels, (o) => o.name));
            // if (_.findIndex(item.labels, (o) => o.name === 'DO NOT MERGE') > -1) {
              self.getURL(item.events_url, (error, response, body) => {
                if (!error && response.statusCode == 200) {
                  const eventJsonBody = JSON.parse(body);
                  logEvents(eventJsonBody);
                }
              });
            // }
            // TODO get do not merge duration
          }

        });
      }
      // console.log('Open PRs: ', body.length)
    } );

    return this;
};

module.exports = GitStats;
