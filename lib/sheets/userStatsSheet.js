const _ = require('lodash');
const lightGreen = '98FB98';
const lightRed = 'ff9999';
const { getWeekdaysOpen } = require('../utils/date');
const { getLabelText, formatEvents } = require('../utils/parsing');

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
    PR_MERGED: index++,
    PR_CLOSED_NO_MERGE: index++,
    PR_AVERAGE_DURATION_OPEN: index++,
    PR_CLOSED_NO_MERGE_RATIO: index++,
    APPROVALS: index++,
    APPROVALS_BUT_OTHERS_REQUEST_CHANGES: index++,
    CHANGES_REQUESTED: index++,
    COMMENTS: index++,
  }

  let authors = {};

  const addMissingData = () => {
    return {
      submitted_pull_request: 0,
      merged_pull_request: 0,
      closed_no_merge: 0,
      approve: 0,
      approve_but_others_request_changes: 0,
      changes_requested: 0,
      commented: 0,
      total_pull_request_days_open: 0,
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

      const weekDaysOpened = getWeekdaysOpen(item.issue.created_at, item.issue.closed_at);
      // let doNotMergeWeekdays = getLabelText(formatEvents(item.events)) || 0;
      // const doNotMergeWeekDaysOpen = weekDaysOpened - doNotMergeWeekdays;

      authors[author].total.submitted_pull_request += 1;
      if (item.issue.state === 'closed' && item.pull.merged) {
        authors[author].total.merged_pull_request += 1;
        authors[author].total.total_pull_request_days_open += weekDaysOpened;
      } else if (item.issue.state === 'closed' && item.pull.merged === false) {
        authors[author].total.closed_no_merge += 1;
      }

      let approvedPriorToRequestChanges = [];
      item.reviews && item.reviews.map(review => {

        const reviewer = review.user.login.toLowerCase();
        addIfMissing(reviewer);

        // const startOfWeek = moment(review.submitted_at).startOf('week').isoWeekday(1).format('YYYY/MM/DD');
        // // console.log('Start of week: ', startOfWeek);
        // if (!weeks.includes(startOfWeek)) {
        //   weeks.push(startOfWeek);
        // }
        //
        // if (!(startOfWeek in authors[reviewer])) {
        //   authors[reviewer][startOfWeek] = addMissingData();
        // }
        //
        if (review.state === 'APPROVED') {
          authors[reviewer].total.approve += 1;
          approvedPriorToRequestChanges.push(reviewer);
          // authors[reviewer][startOfWeek].approve += 1;
        } else if (review.state === 'CHANGES_REQUESTED') {
          authors[reviewer].total.changes_requested += 1;
          approvedPriorToRequestChanges.forEach(preApprovedReviewer => {
            authors[reviewer].total.approve_but_others_request_changes += 1;
          })
          approvedPriorToRequestChanges = [];
          // authors[reviewer][startOfWeek].changes_requested += 1;
        } else if (review.state === 'COMMENTED') {
          authors[reviewer].total.commented += 1;
          // authors[reviewer][startOfWeek].commented += 1;
        }
      })
    }
  });

  const sortedWeeksMostRecent = weeks.sort().reverse();

  const maxCols = index * (weeks.length + 1);
  var sheet = workbook.createSheet('Developer Total Stats', maxCols, data.length + 1);

  sheet.set(COL.AUTHOR, 1, 'Total');
  sheet.font(1, 1, {bold: true});

  // Fill some data
  sheet.set(COL.AUTHOR, 2, 'Developer');
  sheet.set(COL.PR_COUNT, 2, 'PRs Submitted');
  sheet.set(COL.PR_MERGED, 2, 'PRs Merged');
  sheet.set(COL.PR_CLOSED_NO_MERGE, 2, 'PRs Closed w/out Merge');
  sheet.set(COL.PR_AVERAGE_DURATION_OPEN, 2, 'PR Days Open Avg.');
  sheet.set(COL.PR_CLOSED_NO_MERGE_RATIO, 2, 'Closed Not Merged PR Ratio.');
  sheet.set(COL.APPROVALS, 2, 'Approvals Given');
  sheet.set(COL.APPROVALS_BUT_OTHERS_REQUEST_CHANGES, 2, 'Approvals Given Where Other Requested Changes');
  sheet.set(COL.CHANGES_REQUESTED, 2, 'Changes Requested');
  sheet.set(COL.COMMENTS, 2, 'Review Comments Left');
  sheet.width(COL.AUTHOR, 20);
  sheet.width(COL.PR_COUNT, 12);
  sheet.width(COL.PR_MERGED, 12);
  sheet.width(COL.PR_CLOSED_NO_MERGE, 20);
  sheet.width(COL.PR_AVERAGE_DURATION_OPEN, 16);
  sheet.width(COL.PR_CLOSED_NO_MERGE_RATIO, 23);
  sheet.width(COL.APPROVALS, 15);
  sheet.width(COL.APPROVALS_BUT_OTHERS_REQUEST_CHANGES, 15);
  sheet.width(COL.CHANGES_REQUESTED, 20);
  sheet.width(COL.COMMENTS, 20);
  for (var i = 1; i < maxCols; i++) {
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

  let row = 3;
  for (let key of keys(authors).sort()) {
    let author = authors[key];
    const averageDaysPROpen = author.total.total_pull_request_days_open / author.total.merged_pull_request;
    const closedNoMerge = author.total.closed_no_merge / author.total.submitted_pull_request;
    sheet.set(COL.AUTHOR, row, author.name);
    sheet.set(COL.PR_COUNT, row, author.total.submitted_pull_request);
    sheet.set(COL.PR_MERGED, row, author.total.merged_pull_request);
    sheet.set(COL.PR_CLOSED_NO_MERGE, row, author.total.closed_no_merge);
    sheet.set(COL.PR_AVERAGE_DURATION_OPEN, row, Math.round(averageDaysPROpen * 100) / 100);
    sheet.set(COL.PR_CLOSED_NO_MERGE_RATIO, row, Math.round(closedNoMerge * 100) / 100);
    sheet.set(COL.APPROVALS, row, author.total.approve);
    sheet.set(COL.APPROVALS_BUT_OTHERS_REQUEST_CHANGES, row, author.total.approve_but_others_request_changes);
    sheet.set(COL.CHANGES_REQUESTED, row, author.total.changes_requested);
    sheet.set(COL.COMMENTS, row, author.total.commented);

    row += 1;
  }
}
