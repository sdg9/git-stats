var request = require('request');
var Abs = require("abs");
var Typpy = require("typpy");
var Ul = require("ul");
var Deffy = require("deffy");

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
    var data = {}
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

    var self = this;

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
    var auth = null;
    if (this.config.username && this.config.password && this.config.scheme === 'basic') {
      var username = this.config.username;
      var password = this.config.password;
      auth = "Basic " + new Buffer(username + ":" + password).toString("base64");
    }
    var headers = {
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

    var url = "https://api.github.com/repos/" + this.config.org + "/" + this.config.repo + "/pulls";
    var headers = this.buildHeaders();
    request.get( {
      url : url,
      headers: headers,
    }, function(error, response, body) {
      console.log('body : ', body);
    } );

    return this;
};

module.exports = GitStats;
