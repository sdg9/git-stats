const _ = require('lodash');

module.exports.getLabelText = (events) => {
  let labelText = '';
  events && events.map(event => {
    if (event.label === 'DO NOT MERGE') {
      labelText = event.weekdaysApplied;
    }
  });
  return labelText;
}

module.exports.formatEvents = (events) => {
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
