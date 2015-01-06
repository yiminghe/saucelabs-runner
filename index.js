/**
 * wrap wd and sauce-tunnel to test mocha runner across browsers
 * @author yiminghe@gmail.com
 */

var Promise = require('modulex-promise');
var wd = require('wd');
var debug = require('debug')('saucelabs-runner');
var utils = require('modulex-util');
// only 1.x works for me!?
var SauceTunnel = require('sauce-tunnel');
var path = require('path');
var username = process.env.SAUCE_USERNAME;
var key = process.env.SAUCE_ACCESS_KEY;
var testname = require(path.join(process.cwd(), 'package.json')).name;
var identifier = process.env.TRAVIS_JOB_ID || Math.floor((new Date()).getTime() / 1000 - 1230768000).toString();
var build = process.env.TRAVIS_JOB_ID || ('dev:' + (new Date()));
var DEFAULT_RUNNER = 'http://localhost:' + process.env.npm_package_config_port + '/tests/runner.html';
var child_process = require('child_process');
var async = require('async');

function reportProgress(notification) {
  switch (notification.type) {
    case 'tunnelOpen':
      debug('=> Starting Tunnel to Sauce Labs');
      break;
    case 'tunnelOpened':
      debug('Connected to Saucelabs');
      break;
    case 'tunnelClose':
      debug('=> Stopping Tunnel to Sauce Labs');
      break;
    case 'tunnelEvent':
      debug(notification.text);
      break;
    case 'jobStarted':
      debug('\n', notification.startedJobs, '/', notification.numberOfJobs, 'tests started');
      break;
    case 'jobCompleted':
      debug('\nTested %s', notification.url);
      debug('Platform: %s', notification.platform);
      if (notification.tunnelId && unsupportedPort(notification.url)) {
        debug('Warning: This url might use a port that is not proxied by Sauce Connect.');
      }
      debug('Passed: %s', notification.passed);
      debug('Url %s', notification.jobUrl);
      break;
    case 'testCompleted':
      debug('All tests completed with status %s', notification.passed);
      break;
    case 'retrying':
      debug('Timed out, retrying');
      break;
    default:
      debug('Unexpected notification type');
  }
}

function createTunnel(config) {
  return new Promise(function (resolve, reject) {
    reportProgress({
      type: 'tunnelOpen'
    });

    var tunnel = new SauceTunnel(config.username || username, config.key || key, config.identifier || identifier, true, 500);

    process.on('exit', function () {
      tunnel.stop();
    });

    ['write', 'writeln', 'error', 'ok', 'debug'].forEach(function (method) {
      tunnel.on('log:' + method, function (text) {
        reportProgress({
          type: 'tunnelEvent',
          verbose: false,
          method: method,
          text: text
        });
      });
      tunnel.on('verbose:' + method, function (text) {
        reportProgress({
          type: 'tunnelEvent',
          verbose: true,
          method: method,
          text: text
        });
      });
    });

    tunnel.openTunnel(function (open) {
      debug('resolve tunnel: ' + open);
      if (open) {
        resolve(tunnel);
      } else {
        reject();
      }
    });
  });
}


function runTest(config, totalConfig) {
  debug('run single test: ');
  config = utils.merge({
    browserName: 'chrome',
    testname: totalConfig.testname || testname,
    url: totalConfig.url || DEFAULT_RUNNER,
    build: totalConfig.build || build,
    "tunnel-identifier": totalConfig.identifier || identifier
  }, config);
  // config.build += '_' + encodeURIComponent(config.browserName) + '_' + (config.version || '');
  var testConfig = JSON.stringify(config);
  debug(testConfig);
  var user = totalConfig.username || username;
  var myKey = totalConfig.key || key;
  var browser = wd.promiseChainRemote({
    user: user,
    pwd: myKey,
    protocol: 'http:',
    hostname: 'ondemand.saucelabs.com',
    port: '80',
    path: '/wd/hub'
  });
  return new Promise(function (resolve) {
    browser.init(config).get(config.url)
      .waitFor(wd.asserters.jsCondition('window.mochaRunner && window.mochaRunner.stats.end || document.documentElement.getAttribute("__saucelabs_runner_failures")'), totalConfig.timeout || 5e6, 1000)
      .eval('window.mochaRunner && window.mochaRunner.stats.failures || document.documentElement.getAttribute("__saucelabs_runner_failures") || 0')
      .then(function (failtures) {
        console.log(testConfig);
        console.log('failtures: ' + failtures);
        var sessionId = browser.getSessionId();
        return new Promise(function (resolve) {
          var url = 'curl -X PUT -s -d \'{"passed": ' + (failtures ? 'false' : 'true') + '}\' -u ' + user + ':' + myKey + ' https://saucelabs.com/rest/v1/' + user + '/jobs/' + sessionId;
          //debug('url: ' + url);
          child_process.exec(url, function (error, stdout, stderr) {
            debug(testConfig);
            //debug('url: ' + url);
            debug('exec stdout: ' + stdout);
            debug('exec stderr: ' + stderr);
            if (error !== null) {
              debug('exec error: ' + error);
            }
            resolve();
          });
        });
      })
      .finally(function () {
        debug(testConfig);
        debug('browser.quit');
        browser.quit();
      }).done(function () {
        console.log(testConfig);
        console.log('ok');
        resolve();
      }, function (e) {
        console.log(testConfig);
        console.log('fail');
        console.log(e);
        resolve();
      });
  });
}

function run(config) {
  return new Promise(function (resolve, reject) {
    createTunnel(config).then(function () {
      var browsers = config.browsers;
      var runs = browsers.map(function (b) {
        return function (done) {
          runTest(b, config).then(function () {
            done()
          });
        };
      });
      // series test
      async.series(runs, function () {
        console.log('all tests over');
        resolve();
      });
    }).fail(function () {
      reject();
    });
  });
}

module.exports = run;
