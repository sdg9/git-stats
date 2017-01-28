Create .git-stats-config.js at your home directory (~/)

Configure it to point to the environment you care about

```javascript
module.exports = {
  "username": "myGithub username", // if using basic auth (optional)
  "password": "my github password", // if using basic auth (optional)
  "scheme": "basic", // if using basic auth (optional)
  "org": "my org/user",
  "repo": "my repo"
};
```
