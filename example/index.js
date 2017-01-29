// Dependencies
var GitStats = require("../lib");
var jsonfile = require('jsonfile');

var args = process.argv.slice(2);

const file = './data.json'

function logHelp() {
  console.log("Usage: node example [options]");
  console.log('  -f --fetch       Fetch server data to local json file');
  console.log('  -w --workbook    Build (excel) workbook based on data');
  console.log('  -l --log         Log data');
}

function getData(per_page = 100) {
  var g1 = new GitStats();
  g1.initConfig();
  g1.getIssues({state: 'all', per_page}, function (err, data) {

    jsonfile.writeFile(file, data, function (err) {
      console.error(err)
    })
  });
}

function makeSpreadsheet() {
  var g1 = new GitStats();
  jsonfile.readFile(file, function(err, data) {
    g1.createWorkbook(data);
  })
}

function logData() {
  jsonfile.readFile(file, function(err, data) {
    console.log('data: ', data);
    console.log(data);
  })
}

if (args.length === 0) {
  console.log('Missing args, please tell me what to do.')
  logHelp();
  process.exit();
}
args.map(arg => {
  if (arg === '--help' || arg === '--?') {
    logHelp();
    process.exit()
  } else if (arg === '-fs' || arg === '--fetchsmall') {
    getData(5);
  } else if (arg === '-f' || arg === '--fetch') {
    getData();
  } else if (arg === '-w' || arg === '--workbook') {
    makeSpreadsheet();
  } else if (arg === '-l' || arg === '--log') {
    logData();
  }
})
