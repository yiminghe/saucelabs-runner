# saucelabs-runner

wrap wd and sauce-tunnel to test mocha runner across browsers

## guide

set username and access key from saucelabs to process.env.SAUCE_USERNAME and process.env.SAUCE_ACCESS_KEY.

### example

#### gulpfile

https://github.com/react-component/calendar/blob/master/gulpfile.js

```js
gulp.task('saucelabs', function (done) {
  require('saucelabs-runner')({
    browsers: [{
      browserName: 'chrome'
    }, {
      browserName: 'firefox'
    }]
  }).fin(function () {
    done();
    setTimeout(function () {
      process.exit(0);
    }, 1000);
  });
});
```

#### package.json

https://github.com/react-component/calendar/blob/master/package.json

```js
{
  "config": {
    "port": 8001
  },
  "scripts": {
    "start": "node --harmony node_modules/.bin/rc-server",
    "saucelabs": "DEBUG=saucelabs-runner gulp saucelabs"
  }
}
```

#### run

```
npm start
npm run saucelabs
```

### refer

https://saucelabs.com/platforms

https://docs.saucelabs.com/ci-integrations/travis-ci/
