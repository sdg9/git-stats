const { getWeekdaysOpen } = require('../utils/date');
const _ = require('lodash');

function getLabelText(events) {
  let labelText = '';
  events && events.map(event => {
    if (event.label === 'DO NOT MERGE') {
      labelText = event.weekdaysApplied;
    }
  });
  return labelText;
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

module.exports = function(workbook, data) {

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
    if (item) {
      if (item.issue) {
        sheet1.set(COL.PR, row, item.issue.number);
        sheet1.set(COL.STATE, row, item.issue.state);
        sheet1.set(COL.TITLE, row, item.issue.title);
        sheet1.set(COL.CREATED, row, moment(item.issue.created_at).format('MM/DD/YYYY'));
        sheet1.set(COL.AUTHOR, row, item.issue.user.login);
        sheet1.set(COL.TIME_OPEN, row, getWeekdaysOpen(item.issue.created_at, item.issue.closed_at));
      }
      if (item.pull) {
        sheet1.set(COL.MERGED, row, item.pull.merged);
        sheet1.set(COL.COMMENTS, row, item.pull.comments + item.pull.review_comments);
        sheet1.set(COL.COMMITS, row, item.pull.commits);
        sheet1.set(COL.CHANGED_FILES, row, item.pull.changed_files);
        sheet1.set(COL.ADDITIONS, row, item.pull.additions);
        sheet1.set(COL.DELETIONS, row, item.pull.deletions);
      }
      if (item.events) {
        sheet1.set(COL.LABELS, row, getLabelText(formatEvents(item.events)));
      }
      // sheet1.set(COL.REVIEW_COMMENTS, row, item.review_comments);
      row += 1;
    }
  });

}
