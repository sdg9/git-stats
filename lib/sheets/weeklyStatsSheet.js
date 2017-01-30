const _ = require('lodash');
const lightGreen = '98FB98';
const lightRed = 'ff9999';

module.exports = function(workbook, data, useColors = false, config = {}) {
  // const userMapping = config.userMapping;
  const userMapping = _.transform(config.userMapping, function (result, val, key) {
    result[key.toLowerCase()] = val;
  });
  const colorHighlight = config.colorHighlight || {
    lowPRs: 0,
    lowComments: 0,
    highPRs: 5,
    highComments: 25,
  };
  let index = 1;
  const COL = {
    AUTHOR: index++,
    PR_COUNT: index++,
    APPROVALS: index++,
    CHANGES_REQUESTED: index++,
    COMMENTS: index++,
  }

  let authors = {};

  const addMissingData = () => {
    return {
      submitted_pull_request: 0,
      approve: 0,
      changes_requested: 0,
      commented: 0,
    }
  }
  const addIfMissing = author => {
    if (!(author in authors)) {
      authors[author] = {
        name: userMapping[author] || author,
        total: addMissingData(author)
      }
    };
  }

  let weeks = [];

  data.map(item => {
    if (item) {
      const author = item.issue.user.login.toLowerCase();
      addIfMissing(author);
      const startOfWeek = moment(item.issue.created_at).startOf('week').isoWeekday(1).format('YYYY/MM/DD');
      if (!weeks.includes(startOfWeek)) {
        weeks.push(startOfWeek);
      }
      if (!(startOfWeek in authors[author])) {
        authors[author][startOfWeek] = addMissingData();
      }
      authors[author].total.submitted_pull_request += 1;
      authors[author][startOfWeek].submitted_pull_request += 1;

      item.reviews && item.reviews.map(review => {
        const reviewer = review.user.login.toLowerCase();
        addIfMissing(reviewer);

        const startOfWeek = moment(review.submitted_at).startOf('week').isoWeekday(1).format('YYYY/MM/DD');
        // console.log('Start of week: ', startOfWeek);
        if (!weeks.includes(startOfWeek)) {
          weeks.push(startOfWeek);
        }

        if (!(startOfWeek in authors[reviewer])) {
          authors[reviewer][startOfWeek] = addMissingData();
        }

        if (review.state === 'APPROVED') {
          authors[reviewer].total.approve += 1;
          authors[reviewer][startOfWeek].approve += 1;
        } else if (review.state === 'CHANGES_REQUESTED') {
          authors[reviewer].total.changes_requested += 1;
          authors[reviewer][startOfWeek].changes_requested += 1;
        } else if (review.state === 'COMMENTED') {
          authors[reviewer].total.commented += 1;
          authors[reviewer][startOfWeek].commented += 1;
        }
      })
    }
  });

  const sortedWeeksMostRecent = weeks.sort().reverse();

  const maxCols = index * (weeks.length + 1);
  var sheet = workbook.createSheet('User Weekly Stats', maxCols, data.length + 1);

  sheet.set(COL.AUTHOR, 1, 'Total');
  sheet.font(1, 1, {bold: true});

  // Fill some data
  sheet.set(COL.AUTHOR, 2, 'Author');
  sheet.set(COL.PR_COUNT, 2, 'PRs Submitted');
  sheet.set(COL.APPROVALS, 2, 'Approvals Given');
  sheet.set(COL.CHANGES_REQUESTED, 2, 'Changes Requested');
  sheet.set(COL.COMMENTS, 2, 'Review Comments Left');
  sheet.width(COL.AUTHOR, 20);
  sheet.width(COL.PR_COUNT, 15);
  sheet.width(COL.APPROVALS, 15);
  sheet.width(COL.CHANGES_REQUESTED, 20);
  sheet.width(COL.COMMENTS, 20);
  for (var i = 1; i < index; i++) {
    sheet.font(i, 2, {bold: true});
  }

  // sort objectfunction keys(obj)
  const keys = (obj) => {
    var keys = [];
    for(var key in obj)
    {
      if(obj.hasOwnProperty(key))
      {
        keys.push(key);
      }
    }
    return keys;
  }

  const colorCell = (col, row, color) => {
    useColors && sheet.fill(col, row, {type:'solid', fgColor: color})
  }

  let row = 3;
  for (let key of keys(authors).sort()) {
    let author = authors[key];
    // sheet.set(COL.AUTHOR, row, author.name);
    // sheet.set(COL.PR_COUNT, row, author.total.submitted_pull_request);
    // sheet.set(COL.APPROVALS, row, author.total.approve);
    // sheet.set(COL.CHANGES_REQUESTED, row, author.total.changes_requested);
    // sheet.set(COL.COMMENTS, row, author.total.commented);
    //
    let weekIteration = 0;
    for (let date of sortedWeeksMostRecent) {
      let submitted_pull_request = 0;
      let approve = 0;
      let changes_requested = 0;
      let commented = 0;
      if (date in author) {
        submitted_pull_request = author[date].submitted_pull_request || 0;
        approve = author[date].approve || 0;
        changes_requested = author[date].changes_requested || 0;
        commented = author[date].commented || 0;
      }

      const step = index * weekIteration;
      //Redundant to put here but convenient
      sheet.set(COL.AUTHOR + step, 1, 'Week of ' + moment(date, 'YYYY/MM/DD').format('MM/DD/YYYY'));
      sheet.font(COL.AUTHOR + step, 1, {bold: true});
      sheet.set(COL.AUTHOR + step, 2, 'Author');
      sheet.set(COL.PR_COUNT + step, 2, 'PRs Submitted');
      sheet.set(COL.APPROVALS + step, 2, 'Approvals Given');
      sheet.set(COL.CHANGES_REQUESTED + step, 2, 'Changes Requested');
      sheet.set(COL.COMMENTS + step, 2, 'Review Comments Left');
      sheet.width(COL.AUTHOR + step, 20);
      sheet.width(COL.PR_COUNT + step, 15);
      sheet.width(COL.APPROVALS + step, 15);
      sheet.width(COL.CHANGES_REQUESTED + step, 20);
      sheet.width(COL.COMMENTS + step, 20);

      sheet.set(COL.AUTHOR + step, row, author.name);
      sheet.set(COL.PR_COUNT + step, row, submitted_pull_request);
      if (submitted_pull_request <= colorHighlight.lowPRs) {
        colorCell(COL.PR_COUNT + step, row, lightRed);
      } else if (submitted_pull_request >= colorHighlight.highPRs) {
        colorCell(COL.PR_COUNT + step, row, lightGreen);
      }

      if (approve <= colorHighlight.lowApprovals) {
        colorCell(COL.APPROVALS + step, row, lightRed);
      } else if (approve >= colorHighlight.highApprovals) {
        colorCell(COL.APPROVALS + step, row, lightGreen);
      }

      if (changes_requested <= colorHighlight.lowChangesRequested) {
        colorCell(COL.CHANGES_REQUESTED + step, row, lightRed);
      } else if (changes_requested >= colorHighlight.highChangesRequested) {
        colorCell(COL.CHANGES_REQUESTED + step, row, lightGreen);
      }

      if (commented <= colorHighlight.lowComments) {
        colorCell(COL.COMMENTS + step, row, lightRed);
      } else if (commented >= colorHighlight.highComments) {
        colorCell(COL.COMMENTS + step, row, lightGreen);
      }
      // if (approve + changes_requested + commented <= colorHighlight.lowComments) {
      //   sheet.fill(COL.APPROVALS + step, row, {type:'solid', fgColor: lightRed})
      //   sheet.fill(COL.CHANGES_REQUESTED + step, row, {type:'solid', fgColor: lightRed})
      //   sheet.fill(COL.COMMENTS + step, row, {type:'solid', fgColor: lightRed})
      // } else if (approve + changes_requested + commented >= colorHighlight.highComments) {
      //   sheet.fill(COL.APPROVALS + step, row, {type:'solid', fgColor: lightGreen})
      //   sheet.fill(COL.CHANGES_REQUESTED + step, row, {type:'solid', fgColor: lightGreen})
      //   sheet.fill(COL.COMMENTS + step, row, {type:'solid', fgColor: lightGreen})
      // }
      sheet.set(COL.APPROVALS + step, row, approve);
      sheet.set(COL.CHANGES_REQUESTED + step, row, changes_requested);
      sheet.set(COL.COMMENTS + step, row, commented);
      weekIteration += 1;
    }

    row += 1;
  }
}
