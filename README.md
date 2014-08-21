# saucelabs-runner

run test cases in saucelabs.


credit to [https://github.com/axemclion/grunt-saucelabs](https://github.com/axemclion/grunt-saucelabs)


## guide

set username and access key from saucelabs to process.env.SAUCE_USERNAME and process.env.SAUCE_ACCESS_KEY.


### example

```javascript
var saucelabsRunner = require('saucelabs-runner');
saucelabsRunner([{
    testname:'', // name
    urls: 'http://localhost/test.html' // test runner
}],
// test framework, support mocha or jasmine
'mocha');
```
