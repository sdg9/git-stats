const request = require('request');
const Abs = require("abs");
const Typpy = require("typpy");
const Ul = require("ul");
const Deffy = require("deffy");
const moment = require("moment");
require("moment-weekday-calc");
const _ = require('lodash');
const async = require('async');
// const excelbuilder = require('msexcel-builder');
const excelbuilder = require('msexcel-builder-colorfix');
const buildUserStatSheet = require('./sheets/userStatsSheet');
const buildWeeklyStatsSheet = require('./sheets/weeklyStatsSheet');
const buildPullRequestStatSheet = require('./sheets/pullRequestsSheet');
const parse = require('parse-link-header');
const RateLimiter = require('limiter').RateLimiter;
let limiter = new RateLimiter(1, 200);
const fs = require('fs');
const jsonfile = require('jsonfile');

// Defaults
GitStats.DEFAULT_CONFIG = { };
GitStats.DATA_DIR = './data/';
GitStats.DATA_FILE_NAME_DATE_FORMAT = 'YYYY.MM.DD-HH.mm.ss';

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
        data = require("../.git-stats-config")
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
GitStats.prototype.initConfig = function () {
    this.config = this.getConfig();
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
  var self = this;
  const headers = this.buildHeaders();

  // Rate limit all get requests (1 every 200ms)
  limiter.removeTokens(1, function() {
    self.isVerbose && console.log('  Fetching: ' + url);
    request.get({
      url : url,
      headers: headers,
      proxy: self.config.proxyURL || '',
    }, callback);
  });
}

function createDirIfNotExist(dir) {
  if (!fs.existsSync(dir)){
    fs.mkdirSync(dir);
  }
}

GitStats.prototype.createWorkbook = function (data, callback) {
  var self = this;

  createDirIfNotExist('./workbook');
  // Create a new workbook file in current working-path

  const fileName = this.config.org + '-' + this.config.repo;
  var workbook = excelbuilder.createWorkbook('./workbook', fileName + moment().format(GitStats.DATA_FILE_NAME_DATE_FORMAT) + '.xlsx')

  // Create a new worksheet with 10 columns and 12 rows
  buildPullRequestStatSheet(workbook, data, this.useColors, this.config);
  buildWeeklyStatsSheet(workbook, data, this.useColors, this.config);
  buildUserStatSheet(workbook, data, this.useColors, this.config);


  // Save it
  workbook.save(function(err){
    if (err)
    throw err;
    else
    console.log('congratulations, your workbook created');
  });
};

GitStats.prototype.fetchMore = function(url, data = [], callback) {
  var self = this;
  this.httpGet(url, (error, response, body) => {
    if (!error && response.statusCode == 200) {
      let jsonBody = JSON.parse(body);
      const jsonData = _.concat(data, jsonBody);

      if (hasTargetPR(self.config.oldestPR, jsonData)) {
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
  const retVal = targetPR && _.findIndex(data, (o) => o.number <= targetPR);
  if (retVal) {
    console.log('Stopping search for more data, found PR ' + targetPR);
  }
  return retVal;
}

function getActualDir(org, repo) {
  return GitStats.DATA_DIR + org + '-' + repo + '/';
}

function saveToFile(data, org, repo) {
  const actualDir = getActualDir(org, repo);
  createDirIfNotExist(actualDir);
  const file = actualDir + moment().format(GitStats.DATA_FILE_NAME_DATE_FORMAT) + '.json'
  jsonfile.writeFile(file, data, function (err) {
    console.error(err)
  })
}

GitStats.prototype.getIssues = function (options, callback) {
  const self = this;
  if (typeof options === "function") {
    callback = options;
    options = undefined;
  }

  const filterPR = (data) => {
    self.isVerbose && console.log('  initial issue list size: ', data.length);
    let retVal = _.filter(data, (o) => o.pull_request);
    self.isVerbose && console.log('  pulls onlly size: ', retVal.length)
    if (self.config.updatedDate) {
      let updatedDate = moment(self.config.updatedDate, 'YYYY-MM-DD');
      retVal = _.filter(retVal, (o) => moment(o.updated_at) >= updatedDate);
      self.isVerbose && console.log('  updatedDate date > ' + self.config.updatedDate + ' size: ', retVal.length)
    }
    return retVal;
  }

  let url = "https://api.github.com/repos/" + this.config.org + "/" + this.config.repo + "/issues";
  const headers = this.buildHeaders();
  let issues = [];
  request.get( {
    qs: options || {},
    url : url,
    headers: headers,
    proxy: self.config.proxyURL || '',
  }, function(error, response, body) {

    if (!error && response.statusCode == 200) {
      let jsonData = JSON.parse(body);

      if (hasTargetPR(self.config.oldestPR, jsonData)) {
        const pullRequests = filterPR(jsonData);
        console.log('Processing meta-data');
        self.processIssueMetaData(pullRequests, callback);
      } else if ('link' in response.headers) {
        var parsedLinkHeaders = parse(response.headers.link);
        const data = self.fetchMore(parsedLinkHeaders.next.url, jsonData, (data) => {
          console.log('Processing meta-data');
          const pullRequests = filterPR(jsonData);
          self.processIssueMetaData(pullRequests, callback);
        });
      }
    } else {
      console.error('Error fetching ' + url, body);
    }
  } );

  return this;
};

function readFilesAsOne(dirname, callback) {
  let allData = {};
  let dates = [];

  fs.readdir(dirname, function(err, filenames) {
    if (err) {
      onError(err);
      return;
    }
    let jsonFileCount = 0;
    filenames.forEach(function(filename) {
      if (filename.indexOf('.json') > -1){
        jsonFileCount += 1;
      }
    });
    filenames.forEach(function(filename) {
      fs.readFile(dirname + filename, 'utf-8', function(err, content) {
        if (err) {
          onError(err);
          return;
        }

        if (filename.indexOf('.json') > -1){
          const fileNoExtension = removeExtension(filename);
          const momentTime = moment(fileNoExtension, GitStats.DATA_FILE_NAME_DATE_FORMAT).valueOf();
          allData[momentTime] = JSON.parse(content);
          dates.push(momentTime);

          let dataArrayOfArrays = [];
          const allFilesRead = dates.length === jsonFileCount;
          if (allFilesRead) {
            // Create array of arrays
            // Reverse them so most recent (latest data) will take precedence when merging
            dates.sort().reverse().forEach((date) => {
              dataArrayOfArrays.push(allData[date]);
            });

            // pushing iteratee argument of unionBy to array so it's last argument applied
            // using apply since my input is an array of arrays rather than manually defining each array
            dataArrayOfArrays.push((o) => o.issue.number);
            let combinedData = _.unionBy.apply(_, dataArrayOfArrays);
            callback(combinedData);
          }
        }
      });
    });
  });
}

function removeExtension(input) {
  return input.replace(/\.[^/.]+$/, "");
}

GitStats.prototype.getMergedJson = function(callback) {
  let self = this;
  const actualDir = getActualDir(this.config.org, this.config.repo);
  readFilesAsOne(actualDir, callback);
}

GitStats.prototype.processIssueMetaData = function(pullRequests, callback) {
  // process.exit();
  var self = this;
  let index = 1;
  async.map(pullRequests, (item, callback) => {
    let retVal = {
      issue: item
    };
    // self.isVerbose && console.log('Processing PR ' + index + ' of ' + pullRequests.length);
    index += 1;
    self.httpGet(item.events_url, (error, response, body) => {
      self.isVerbose && console.log('  PR #: ' + item.number);
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
  }, (err, data) => {
    saveToFile(data, self.config.org, self.config.repo);
    callback(err, data);
  });

}

module.exports = GitStats;
