const { getWeekdaysOpen } = require('../utils/date');
const _ = require('lodash');

const lightGreen = '98FB98';
const lightRed = 'ff9999';

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

module.exports = function(workbook, data, useColors = false, config = {}) {

  const colorHighlight = config.colorHighlight || {
    "highDaysOpened": 5,
  };

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
  var sheet = workbook.createSheet('Pull Request Stats', index + 3, data.length + 1);

  // Fill some data
  sheet.set(COL.PR, 1, 'PR');
  sheet.set(COL.STATE, 1, 'State');
  sheet.set(COL.CREATED, 1, 'Opened');
  sheet.set(COL.AUTHOR, 1, 'Author');
  sheet.set(COL.TIME_OPEN, 1, 'Weekdays Opened');
  sheet.set(COL.MERGED, 1, 'Merged');
  sheet.set(COL.LABELS, 1, 'Do Not Merge Weekdays');
  sheet.set(COL.TITLE, 1, 'Title');
  sheet.set(COL.COMMENTS, 1, 'Comments');
  // sheet.set(COL.REVIEW_COMMENTS, 1, 'Review Comments');
  sheet.set(COL.COMMITS, 1, 'Commits');
  sheet.set(COL.CHANGED_FILES, 1, 'Changed Files');
  sheet.set(COL.ADDITIONS, 1, 'Additions');
  sheet.set(COL.DELETIONS, 1, 'Deletions');

  sheet.width(COL.PR, 5);
  sheet.width(COL.STATE, 5);
  sheet.width(COL.CREATED, 10);
  sheet.width(COL.AUTHOR, 20);
  sheet.width(COL.TIME_OPEN, 20);
  sheet.width(COL.MERGED, 7);
  sheet.width(COL.LABELS, 20);
  sheet.width(COL.TITLE, 45);
  sheet.width(COL.COMMENTS, 10);
  // sheet.width(COL.REVIEW_COMMENTS, 10);
  sheet.width(COL.COMMITS, 10);
  sheet.width(COL.CHANGED_FILES, 12);
  sheet.width(COL.ADDITIONS, 10);
  sheet.width(COL.DELETIONS, 10);

  for (var i = 1; i < index; i++) {
    sheet.font(i, 1, {bold: true});
  }

  const colorRow = (row, color) => {
    if (useColors) {
      for (var i = 1; i < index; i++) {
        sheet.fill(i, row, {type:'solid', fgColor: color})
      }
    }
  }

  // if (useColors) {
  //   sheet.width(index + 3, 20);
  //   sheet.set(index + 2, 1, 'Legend');
  //   sheet.font(index + 2, 1, {bold: true});
  //
  //   sheet.set(index + 3, 2, 'Open PR');
  //
  //   sheet.set(index + 3, 3, 'Closed not merged PR');
  //
  //   sheet.set(index + 3, 4, 'Merged PR');
  // }

  let row = 2;
  data.map(item => {
    // if (item.issue.state === 'open') {
    //   colorRow(row, lightGreen);
    // }
    // if (item.issue.state === 'closed' && item.pull.merged === false) {
    //   colorRow(row, lightRed);
    // }
    if (item) {
      let doNotMergeWeekdays = getLabelText(formatEvents(item.events));
      if (item.events) {
        sheet.set(COL.LABELS, row, doNotMergeWeekdays);
      }
      if (item.issue) {
        const weekDaysOpened = getWeekdaysOpen(item.issue.created_at, item.issue.closed_at);
        sheet.set(COL.PR, row, item.issue.number);
        sheet.set(COL.STATE, row, item.issue.state);
        sheet.set(COL.TITLE, row, item.issue.title);
        sheet.set(COL.CREATED, row, moment(item.issue.created_at).format('MM/DD/YYYY'));
        sheet.set(COL.AUTHOR, row, item.issue.user.login);
        sheet.set(COL.TIME_OPEN, row, weekDaysOpened);
        if (weekDaysOpened - doNotMergeWeekdays >= colorHighlight.highDaysOpened) {
          colorRow(row, lightRed);
        }
      }
      if (item.pull) {
        sheet.set(COL.MERGED, row, item.pull.merged);
        sheet.set(COL.COMMENTS, row, item.pull.comments + item.pull.review_comments);
        sheet.set(COL.COMMITS, row, item.pull.commits);
        sheet.set(COL.CHANGED_FILES, row, item.pull.changed_files);
        sheet.set(COL.ADDITIONS, row, item.pull.additions);
        sheet.set(COL.DELETIONS, row, item.pull.deletions);
      }
      // sheet.set(COL.REVIEW_COMMENTS, row, item.review_comments);
      row += 1;
    }
  });

}
