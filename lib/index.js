const request = require('request');
const Abs = require("abs");
const Typpy = require("typpy");
const Ul = require("ul");
const Deffy = require("deffy");
const moment = require("moment");
require("moment-weekday-calc");
const _ = require('lodash');
const async = require('async');
const excelbuilder = require('msexcel-builder');
const buildUserStatSheet = require('./sheets/userStatsSheet');
const buildPullRequestStatSheet = require('./sheets/pullRequestsSheet');
var parse = require('parse-link-header');

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
      headers.Accept = 'application/vnd.github.black-cat-preview+json';
    }

    return headers;
}

GitStats.prototype.httpGet = function (url, callback) {
  const headers = this.buildHeaders();
  request.get({
    url : url,
    headers: headers,
  }, callback);
}


GitStats.prototype.createWorkbook = function (data, callback) {
  // Create a new workbook file in current working-path
  var workbook = excelbuilder.createWorkbook('./', 'git-report' + moment().format('YYYY.MM.DD-HH.mm.ss') + '.xlsx')

  // Create a new worksheet with 10 columns and 12 rows
  buildPullRequestStatSheet(workbook, data);
  buildUserStatSheet(workbook, data);

  // Save it
  workbook.save(function(err){
    if (err)
    throw err;
    else
    console.log('congratulations, your workbook created');
  });
};

GitStats.prototype.fetchMore = function(url, data = [], callback) {
  console.log('  Fetching ' + url);
  this.httpGet(url, (error, response, body) => {
    if (!error && response.statusCode == 200) {
      let jsonBody = JSON.parse(body);
      const jsonData = _.concat(data, jsonBody);

      if (hasTargetPR(this.config.oldestPR, jsonData)) {
        callback(jsonData);
      } else if ('link' in response.headers) {
        var parsedLinkHeaders = parse(response.headers.link);
        if ('next' in parsedLinkHeaders) {
          this.fetchMore(parsedLinkHeaders.next.url, jsonData, callback);
        } else {
          callback(jsonData);
        }
      } else {
        callback(jsonData);
      }
    } else {
      console.error('Unable to fetch data from ' + url);
      process.exit();
    }
  });
}

function hasTargetPR(targetPR, data) {
  console.log('Stopping search for more data, found PR ' + targetPR);
  return targetPR && _.findIndex(data, (o) => o.number <= targetPR);
}

GitStats.prototype.getIssues = function (options, callback) {
    const self = this;
    if (typeof options === "function") {
        callback = options;
        options = undefined;
    }

    let url = "https://api.github.com/repos/" + this.config.org + "/" + this.config.repo + "/issues";
    const headers = this.buildHeaders();
    let issues = [];
    request.get( {
      qs: options || {},
      url : url,
      headers: headers,
    }, function(error, response, body) {

      if (!error && response.statusCode == 200) {
        let jsonData = JSON.parse(body);

        if (hasTargetPR(this.config.oldestPR, jsonData)) {
          const pullRequests = _.filter(jsonData, (o) => o.pull_request);
          console.log('Processing meta-data');
          self.processIssueMetaData(pullRequests, callback);
        } else if ('link' in response.headers) {
          var parsedLinkHeaders = parse(response.headers.link);
          const data = self.fetchMore(parsedLinkHeaders.next.url, jsonData, (data) => {
            console.log('Processing meta-data');
            const pullRequests = _.filter(data, (o) => o.pull_request);
            self.processIssueMetaData(pullRequests, callback);
          });
        }
      } else {
        console.error('Error fetching data: ', body);
      }
    } );

    return this;
};

GitStats.prototype.processIssueMetaData = function(pullRequests, callback) {
  var self = this;
  let index = 1;
  async.map(pullRequests, (item, callback) => {
    let retVal = {
      issue: item
    };
    console.log('Processing PR ' + index + ' of ' + pullRequests.length);
    index += 1;
    self.httpGet(item.events_url, (error, response, body) => {
      if (!error && response.statusCode == 200) {
        retVal.events = JSON.parse(body);
      } else {
        console.error('Error fetching ' + item.events_url, body);
      }
      self.httpGet(item.pull_request.url, (error, response, body) => {
        if (!error && response.statusCode == 200) {
          retVal.pull = JSON.parse(body);
        } else {
          console.error('Error fetching ' + item.pull_request.url, body);
        }
        self.httpGet(item.pull_request.url + '/reviews', (error, response, body) => {
          if (!error && response.statusCode == 200) {
            retVal.reviews = JSON.parse(body);
          } else {
            console.error('Error fetching ' + item.pull_request.url  + '/reviews', body);
          }
          callback(error, retVal);
        });

      });
    });
  }, callback);

}

module.exports = GitStats;
