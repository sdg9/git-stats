const moment = require("moment");
require("moment-weekday-calc");

// Only gives full days, not hour breakdown
module.exports.getWeekdaysOpenOld = function (openedAt, closedAt) {
  return moment().isoWeekdayCalc({
    rangeStart: moment(openedAt),
    rangeEnd: closedAt != null ? moment(closedAt) : moment(),
    weekdays: [1,2,3,4,5],
  });
}

function getWeekendDays(openedAt, closedAt) {
  return moment().isoWeekdayCalc({
    rangeStart: moment(openedAt),
    rangeEnd: closedAt != null ? moment(closedAt) : moment(),
    weekdays: [6,7],
  });
}

function getPreciseDays(openedAt, closedAt) {
  const closedMoment = closedAt != null ? moment(closedAt) : moment();
  return closedMoment.diff(moment(openedAt)) / (24 * 60 * 60 * 1000);
}

module.exports.getWeekdaysOpen = function (openedAt, closedAt, precision = 2) {
  const retVal = getPreciseDays(openedAt, closedAt) - getWeekendDays(openedAt, closedAt);
  // const retVal = getPreciseDays(openedAt, closedAt);
  // console.log('Input: ' + openedAt + ' ' + closedAt + ' Duration: ' + retVal);
  if (retVal < 0) {
    return 0;
  } else {
    const num = Math.pow(10, precision);
    return Math.round(retVal * num) / num;
    // return retVal;
  }
}
