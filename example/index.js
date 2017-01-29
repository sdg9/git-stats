// Dependencies
var GitStats = require("../lib");
var jsonfile = require('jsonfile');

var args = process.argv.slice(2);

// const file = './data.json'

function logHelp() {
  console.log("Usage: node example [options]");
  console.log('  -f --fetch       Fetch server data to local json file');
  console.log('  -w --workbook    Build (excel) workbook based on data');
  console.log('  -l --log         Log data');
  console.log('  -c --colors      Use colors');
  console.log('  -m --merge       Merge JSON');
}

function getData(per_page = 100) {
  g1.initConfig();
  g1.getIssues({state: 'all', per_page}, function (err, data) {
    console.log('All done');

    // jsonfile.writeFile(file, data, function (err) {
    //   console.error(err)
    // })
  });
}

function makeSpreadsheet() {
  g1.initConfig();

  g1.getMergedJson((data) => {
    g1.createWorkbook(data);
  });

  // jsonfile.readFile(file, function(err, data) {
  //   g1.createWorkbook(data);
  // })
}

function mergeJson() {
  g1.initConfig();
  g1.getMergedJson((data) => {
    console.log('size: ', data.length);
  });
}

function logData() {
  // jsonfile.readFile(file, function(err, data) {
  g1.getMergedJson((data) => {
    console.log('data: ', data);
    console.log(data);
  })
}

var g1 = new GitStats();
if (args.length === 0) {
  console.log('Missing args, please tell me what to do.')
  logHelp();
  process.exit();
}
args.map(arg => {
  if (arg === '--help' || arg === '--?') {
    logHelp();
    process.exit()
  } else if (arg === '-c' || arg === '--colors') {
    g1.useColors = true;
  } else if (arg === '-v' || arg === '--verbose') {
    g1.isVerbose = true;
  } else if (arg === '-fs' || arg === '--fetchsmall') {
    getData(5);
  } else if (arg === '-f' || arg === '--fetch') {
    getData();
  } else if (arg === '-w' || arg === '--workbook') {
    makeSpreadsheet();
  } else if (arg === '-l' || arg === '--log') {
    logData();
  } else if (arg === '-m' || arg === '--merge') {
    mergeJson()
  }
})
