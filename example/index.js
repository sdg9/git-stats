// Dependencies
var GitStats = require("../lib");

// Create the GitStats instance
var g1 = new GitStats();
g1.initConfig();
// g1.getPullRequests({}, function (err, data) {
//     console.log(err || data);
// });
g1.getIssues({}, function (err, data) {
    console.log(err || data);
});
