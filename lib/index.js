const request = require('request');
const Abs = require("abs");
const Typpy = require("typpy");
const Ul = require("ul");
const Deffy = require("deffy");
const moment = require("moment");
require("moment-weekday-calc");
const _ = require('lodash');
const async = require('async');
// const XLSX = require('xlsx');
const excelbuilder = require('msexcel-builder');

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

function formatEvents(events) {
  // console.log('  Total Events: ', events.length);
  const labelRelated = _.filter(events, (o) => o.event === 'labeled' || o.event === 'unlabeled');
  // console.log('  Label Events: ', labelRelated.length);
  let labelObj = {};
  labelRelated.map(item => {
    labelObj[item.label.name] = labelObj[item.label.name] || {};
    if (item.event === 'labeled') {
      labelObj[item.label.name].labeled = item.created_at;
    } else if (item.event === 'unlabeled') {
      labelObj[item.label.name].unlabeled = item.created_at;
    }
  });
  let retVal = [];
  _.forEach(labelObj, (value, key) => {
    if (value.labeled && !value.unlabeled) {
      const openedTime = moment(value.labeled);
      const now = moment();
      const duration = moment.duration(now.diff(openedTime));
      const days = duration.asDays();
      retVal.push({
        label: key,
        weekdaysApplied: moment().isoWeekdayCalc({
          rangeStart: openedTime,
          rangeEnd: now,
          weekdays: [1,2,3,4,5],
        }),
        status: 'labeled'
      });
    } else {
      const openedTime = moment(value.labeled);
      const closedTime = moment(value.unlabeled);
      const duration = moment.duration(closedTime.diff(openedTime));
      const days = duration.asDays();
      retVal.push({
        label: key,
        weekdaysApplied: moment().isoWeekdayCalc({
          rangeStart: openedTime,
          rangeEnd: closedTime,
          weekdays: [1,2,3,4,5],
        }),
        status: 'unlabeled'
      });
    }
  });
  return retVal;
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
function buildUserStatSheet(workbook, data) {
  let index = 1;
  const COL = {
    AUTHOR: index++,
    PR_COUNT: index++,
    APPROVALS: index++,
    CHANGES_REQUESTED: index++,
    COMMENTS: index++,
  }

  var sheet = workbook.createSheet('User Stats', index, data.length + 1);

  // Fill some data
  sheet.set(COL.AUTHOR, 1, 'Author');
  sheet.set(COL.PR_COUNT, 1, 'PRs Submitted');
  sheet.set(COL.APPROVALS, 1, 'Approvals Given');
  sheet.set(COL.CHANGES_REQUESTED, 1, 'Changes Requested');
  sheet.set(COL.COMMENTS, 1, 'Review Comments Left');
  sheet.width(COL.AUTHOR, 20);
  sheet.width(COL.PR_COUNT, 15);
  sheet.width(COL.APPROVALS, 15);
  sheet.width(COL.CHANGES_REQUESTED, 20);
  sheet.width(COL.COMMENTS, 20);
  for (var i = 1; i < index; i++) {
    sheet.font(i, 1, {bold: true});
  }

  let authors = {};

  const addIfMissing = author => {
    if (!(author in authors)) {
      authors[author] = {
        name: author,
        submitted_pull_request: 0,
        approve: 0,
        changes_requested: 0,
        commented: 0,
      };
    }
  }

  data.map(item => {
    const author = item.issue.user.login;
    addIfMissing(author);
    authors[author].submitted_pull_request += 1;

    item.reviews && item.reviews.map(review => {
      const reviewer = review.user.login;
      addIfMissing(reviewer);

      if (review.state === 'APPROVED') {
        authors[reviewer].approve += 1;
      } else if (review.state === 'CHANGES_REQUESTED') {
        authors[reviewer].changes_requested += 1;
      } else if (review.state === 'COMMENTED') {
        authors[reviewer].commented += 1;
      }

    })
  });

  let row = 2;
  for (let key in authors) {
    let author = authors[key];
    sheet.set(COL.AUTHOR, row, author.name);
    sheet.set(COL.PR_COUNT, row, author.submitted_pull_request);
    sheet.set(COL.APPROVALS, row, author.approve);
    sheet.set(COL.CHANGES_REQUESTED, row, author.changes_requested);
    sheet.set(COL.COMMENTS, row, author.commented);
    row += 1;
  }
}

function buildPullRequestStatSheet(workbook, data) {
  let index = 1;
  const COL = {
    PR: index++,
    STATE: index++,
    TITLE: index++,
    CREATED: index++,
    AUTHOR: index++,
    TIME_OPEN: index++,
    MERGED: index++,
    LABELS: index++,
    COMMENTS: index++,
    // REVIEW_COMMENTS: index++,
    COMMITS: index++,
    CHANGED_FILES: index++,
    ADDITIONS: index++,
    DELETIONS: index++,
  }
  var sheet1 = workbook.createSheet('Pull Request Stats', index, data.length + 1);

  // Fill some data
  sheet1.set(COL.PR, 1, 'PR');
  sheet1.set(COL.STATE, 1, 'State');
  sheet1.set(COL.CREATED, 1, 'Opened');
  sheet1.set(COL.AUTHOR, 1, 'Author');
  sheet1.set(COL.TIME_OPEN, 1, 'Weekdays Opened');
  sheet1.set(COL.MERGED, 1, 'Merged');
  sheet1.set(COL.LABELS, 1, 'Do Not Merge Weekdays');
  sheet1.set(COL.TITLE, 1, 'Title');
  sheet1.set(COL.COMMENTS, 1, 'Comments');
  // sheet1.set(COL.REVIEW_COMMENTS, 1, 'Review Comments');
  sheet1.set(COL.COMMITS, 1, 'Commits');
  sheet1.set(COL.CHANGED_FILES, 1, 'Changed Files');
  sheet1.set(COL.ADDITIONS, 1, 'Additions');
  sheet1.set(COL.DELETIONS, 1, 'Deletions');

  sheet1.width(COL.PR, 5);
  sheet1.width(COL.STATE, 5);
  sheet1.width(COL.CREATED, 10);
  sheet1.width(COL.AUTHOR, 20);
  sheet1.width(COL.TIME_OPEN, 20);
  sheet1.width(COL.MERGED, 7);
  sheet1.width(COL.LABELS, 20);
  sheet1.width(COL.TITLE, 45);
  sheet1.width(COL.COMMENTS, 10);
  // sheet1.width(COL.REVIEW_COMMENTS, 10);
  sheet1.width(COL.COMMITS, 10);
  sheet1.width(COL.CHANGED_FILES, 12);
  sheet1.width(COL.ADDITIONS, 10);
  sheet1.width(COL.DELETIONS, 10);

  for (var i = 1; i < index; i++) {
    sheet1.font(i, 1, {bold: true});
  }

  let row = 2;
  data.map(item => {

    sheet1.set(COL.PR, row, item.issue.number);
    sheet1.set(COL.STATE, row, item.issue.state);
    sheet1.set(COL.TITLE, row, item.issue.title);
    sheet1.set(COL.CREATED, row, moment(item.issue.created_at).format('MM/DD/YYYY'));
    sheet1.set(COL.AUTHOR, row, item.issue.user.login);
    sheet1.set(COL.TIME_OPEN, row, getWeekdaysOpen(item.issue.created_at, item.issue.closed_at));
    sheet1.set(COL.MERGED, row, item.pull.merged);
    sheet1.set(COL.LABELS, row, getLabelText(formatEvents(item.events)));
    sheet1.set(COL.COMMENTS, row, item.pull.comments + item.pull.review_comments);
    // sheet1.set(COL.REVIEW_COMMENTS, row, item.review_comments);
    sheet1.set(COL.COMMITS, row, item.pull.commits);
    sheet1.set(COL.CHANGED_FILES, row, item.pull.changed_files);
    sheet1.set(COL.ADDITIONS, row, item.pull.additions);
    sheet1.set(COL.DELETIONS, row, item.pull.deletions);
    row += 1;
  });

}

function getLabelText(events) {
  let labelText = '';
  events && events.map(event => {
    if (event.label === 'DO NOT MERGE') {
      labelText = event.weekdaysApplied;
    }
  });
  return labelText;
}

function getWeekdaysOpen(openedAt, closedAt) {
  return moment().isoWeekdayCalc({
    rangeStart: moment(openedAt),
    rangeEnd: closedAt != null ? moment(closedAt) : moment(),
    weekdays: [1,2,3,4,5],
  });
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
        const jsonBody = JSON.parse(body);
        const pullRequests = _.filter(jsonBody, (o) => o.pull_request);
        async.map(pullRequests, (item, callback) => {
          let retVal = {
            issue: item
          };
          self.httpGet(item.events_url, (error, response, body) => {
            if (!error && response.statusCode == 200) {
              retVal.events = JSON.parse(body);
            }
            self.httpGet(item.pull_request.url, (error, response, body) => {
              if (!error && response.statusCode == 200) {
                retVal.pull = JSON.parse(body);
              }
              self.httpGet(item.pull_request.url + '/reviews', (error, response, body) => {
                if (!error && response.statusCode == 200) {
                  retVal.reviews = JSON.parse(body);
                }
                callback(error, retVal);
              });

            });
          });
        }, callback);
      }
    } );


    return this;
};


module.exports = GitStats;
