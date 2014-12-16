# saucelabs-runner

run test cases in saucelabs.



## guide

set username and access key from saucelabs to process.env.SAUCE_USERNAME and process.env.SAUCE_ACCESS_KEY.


### example

```javascript
run({
  browsers: [
    {
      browserName: 'chrome',
      url:'http://x.com/runner.html' //defaults to 'http://localhost:' + process.env.npm_package_config_port + '/tests/runner.html'
    },
    {
      browserName: 'firefox'
    }
  ]
}).fail(function () {
    console.log('connect to saucelabs error!')
  });
```
