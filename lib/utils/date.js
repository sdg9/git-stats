const moment = require("moment");
require("moment-weekday-calc");

module.exports.getWeekdaysOpen = function (openedAt, closedAt) {
  return moment().isoWeekdayCalc({
    rangeStart: moment(openedAt),
    rangeEnd: closedAt != null ? moment(closedAt) : moment(),
    weekdays: [1,2,3,4,5],
  });
}
