module.exports = function(workbook, data, userMapping = {}) {
  let index = 1;
  const COL = {
    AUTHOR: index++,
    PR_COUNT: index++,
    APPROVALS: index++,
    CHANGES_REQUESTED: index++,
    COMMENTS: index++,
  }

  var sheet = workbook.createSheet('User Stats', index, data.length + 1);

  // Fill some data
  sheet.set(COL.AUTHOR, 1, 'Author');
  sheet.set(COL.PR_COUNT, 1, 'PRs Submitted');
  sheet.set(COL.APPROVALS, 1, 'Approvals Given');
  sheet.set(COL.CHANGES_REQUESTED, 1, 'Changes Requested');
  sheet.set(COL.COMMENTS, 1, 'Review Comments Left');
  sheet.width(COL.AUTHOR, 20);
  sheet.width(COL.PR_COUNT, 15);
  sheet.width(COL.APPROVALS, 15);
  sheet.width(COL.CHANGES_REQUESTED, 20);
  sheet.width(COL.COMMENTS, 20);
  for (var i = 1; i < index; i++) {
    sheet.font(i, 1, {bold: true});
  }

  let authors = {};

  const addIfMissing = author => {
    if (!(author in authors)) {
      authors[author] = {
        name: userMapping[author] || author,
        submitted_pull_request: 0,
        approve: 0,
        changes_requested: 0,
        commented: 0,
      };
    }
  }

  data.map(item => {
    if (item) {
      const author = item.issue.user.login;
      addIfMissing(author);
      authors[author].submitted_pull_request += 1;

      item.reviews && item.reviews.map(review => {
        const reviewer = review.user.login;
        addIfMissing(reviewer);

        if (review.state === 'APPROVED') {
          authors[reviewer].approve += 1;
        } else if (review.state === 'CHANGES_REQUESTED') {
          authors[reviewer].changes_requested += 1;
        } else if (review.state === 'COMMENTED') {
          authors[reviewer].commented += 1;
        }

      })
    }
  });

  let row = 2;
  for (let key in authors) {
    let author = authors[key];
    sheet.set(COL.AUTHOR, row, author.name);
    sheet.set(COL.PR_COUNT, row, author.submitted_pull_request);
    sheet.set(COL.APPROVALS, row, author.approve);
    sheet.set(COL.CHANGES_REQUESTED, row, author.changes_requested);
    sheet.set(COL.COMMENTS, row, author.commented);
    row += 1;
  }
}
