// Dependencies
var GitStats = require("../lib");
var jsonfile = require('jsonfile');

// Create the GitStats instance
var g1 = new GitStats();
g1.initConfig();
// g1.getIssues({state: 'all', since: '2017-01-10T00:00:00Z', per_page: 100}, function (err, data) {
//   const file = './data.json'
//
//   jsonfile.writeFile(file, data, function (err) {
//     console.error(err)
//   })
//   // g1.createWorkbook(data);
// });

const file = './data.json'
jsonfile.readFile(file, function(err, data) {
  g1.createWorkbook(data);
})

// g1.createWorkbook({}, function (err, data) {
//     console.log(err || data);
// });
