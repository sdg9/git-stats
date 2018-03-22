Create .git-stats-config.js in your project directory

Configure it to point to the repository you care about

```javascript
module.exports = {
  "username": "myGithub username", // if using basic auth (optional)
  "password": "my github password", // if using basic auth (optional)
  "scheme": "basic", // if using basic auth (optional)
  "org": "my org/user",
  "repo": "my repo"
  "oldestPR": 7000,
  // only process PRs updated after a specified date
  "updatedDate": "2017-01-27",
  // highlights generated report if numbers are low
  "colorHighlight": {
    "lowPRs": 1,
    "lowComments": 5,
    "lowApprovals": 3,
    "lowChangesRequested": 0,
    "highPRs": 5,
    "highComments": 25,
    "highChangesRequested": 5,
    "highApprovals": 10,
    "highDaysOpened": 3,
  },
  "userMapping": {
    // here you can map a github id to person's name for reporting
    "sdg9": 'Steven',
    "anotherId": 'Bob',
  }
};
```

Run `yarn install`
Edit oldestPR to how far back you wish to go
Run `node example/index -f -l`
Run `node example/index.js -w`