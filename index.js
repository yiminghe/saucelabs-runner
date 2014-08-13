var Q = require('q');
var SauceTunnel = require('sauce-tunnel');
var TestRunner = require('./lib/TestRunner');

var username = process.env.SAUCE_USERNAME;
var key = process.env.SAUCE_ACCESS_KEY;
var tunneled = true;
var identifier = process.env.TRAVIS_JOB_ID || Math.floor((new Date()).getTime() / 1000 - 1230768000).toString();
var build = process.env.TRAVIS_JOB_ID || ('local:' + (new Date()));

function reportProgress(notification) {
    switch (notification.type) {
        case 'tunnelOpen':
            console.log('=> Starting Tunnel to Sauce Labs');
            break;
        case 'tunnelOpened':
            console.log('Connected to Saucelabs');
            break;
        case 'tunnelClose':
            console.log('=> Stopping Tunnel to Sauce Labs');
            break;
        case 'tunnelEvent':
            console.log(notification.text);
            break;
        case 'jobStarted':
            console.log('\n', notification.startedJobs, '/', notification.numberOfJobs, 'tests started');
            break;
        case 'jobCompleted':
            console.log('\nTested %s', notification.url);
            console.log('Platform: %s', notification.platform);
            if (notification.tunnelId && unsupportedPort(notification.url)) {
                console.log('Warning: This url might use a port that is not proxied by Sauce Connect.');
            }
            console.log('Passed: %s', notification.passed);
            console.log('Url %s', notification.jobUrl);
            break;
        case 'testCompleted':
            console.log('All tests completed with status %s', notification.passed);
            break;
        case 'retrying':
            console.log('Timed out, retrying');
            break;
        default:
            console.log('Unexpected notification type');
    }
}

function createTunnel() {
    reportProgress({
        type: 'tunnelOpen'
    });

    var tunnel = new SauceTunnel(username, key, identifier, true, ['-P', '0']);

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

    return tunnel;
}

function runTask(tests, framework, callback) {
    var tunnel;
    Q.fcall(function () {
        var deferred;
        if (tunneled) {
            deferred = Q.defer();
            tunnel = createTunnel();
            tunnel.start(function (succeeded) {
                if (!succeeded) {
                    deferred.reject('Could not create tunnel to Sauce Labs');
                } else {
                    reportProgress({
                        type: 'tunnelOpened'
                    });
                    deferred.resolve();
                }
            });
            return deferred.promise;
        }
    }).then(function () {
        var allTests = [];
        tests.forEach(function (test) {
            allTests.push((function (test) {
                for (var i in defaults) {
                    if (!(i in test)) {
                        test[i] = defaults[i];
                    }
                }
                return function () {
                    var testRunner = new TestRunner(test, framework, reportProgress);
                    return testRunner.runTests();
                };
            })(test));
        });
        var initial = allTests[0];
        allTests.shift();
        // Sequences to prevent high concurrency
        return allTests.reduce(function (soFar, f) {
            return soFar.then(f);
        }, initial());
    }).fin(function () {
        var deferred;
        if (tunnel) {
            deferred = Q.defer();
            reportProgress({
                type: 'tunnelClose'
            });
            tunnel.stop(function () {
                deferred.resolve();
            });
            return deferred.promise;
        }
    }).then(function (passed) {
            callback(passed);
        },
        function (error) {
            console.log(error.toString());
            callback(false);
        }).done();
}

function unsupportedPort(url) {
    // Not all ports are proxied by Sauce Connect. List of supported ports is
    // available at https://saucelabs.com/docs/connect#localhost
    var portRegExp = /:(\d+)\//;
    var matches = portRegExp.exec(url);
    var port = matches ? parseInt(matches[1], 10) : null;
    var supportedPorts = [
        80, 443, 888, 2000, 2001, 2020, 2109, 2222, 2310, 3000, 3001, 3030,
        3210, 3333, 4000, 4001, 4040, 4321, 4502, 4503, 4567, 5000, 5001, 5050, 5555, 5432, 6000,
        6001, 6060, 6666, 6543, 7000, 7070, 7774, 7777, 8000, 8001, 8003, 8031, 8080, 8081, 8765,
        8888, 9000, 9001, 9080, 9090, 9876, 9877, 9999, 49221, 55001
    ];
    if (port) {
        return supportedPorts.indexOf(port) === -1;
    }
    return false;
}

var defaults = {
    username: username,
    key: key,
    tunneled: tunneled,
    identifier: identifier,
    build: build,
    pollInterval: 1000 * 2,
    testname: '',
    browsers: [
        {
            browserName: 'iphone',
            platform: 'OS X 10.9',
            version: '7.1',
            deviceName: 'iPhone',
            'device-orientation': 'portrait'
        },
        {
            browserName: 'ipad',
            platform: 'OS X 10.9',
            version: '7.1',
            deviceName: 'iPad',
            'device-orientation': 'portrait'
        },

        {
            browserName: 'android',
            platform: 'Linux',
            version: '4.3',
            deviceName: 'Android',
            'device-orientation': 'portrait'
        },
        {
            browserName: 'chrome',
            platform: 'Windows 8.1'
        },
        {
            browserName: 'safari',
            platform: 'OS X 10.9'
        },
        {
            browserName: 'firefox',
            platform: 'Windows 8.1'
        },
        {
            browserName: 'internet explorer',
            platform: 'Windows 8.1',
            version: '11'
        },
        {
            browserName: 'internet explorer',
            platform: 'Windows 8',
            version: '10'
        },
        {
            browserName: 'internet explorer',
            platform: 'Windows 7',
            version: '9'
        },
        {
            browserName: 'internet explorer',
            platform: 'Windows 7',
            version: '8'
        },
        {
            browserName: 'internet explorer',
            platform: 'Windows XP',
            version: '7'
        },
        {
            browserName: 'internet explorer',
            platform: 'Windows XP',
            version: '6'
        }
    ],
    tunnelArgs: [],
    sauceConfig: {},
    maxRetries: 0
};

module.exports = function (tests, framework, done) {
    runTask(tests, framework, done || function () {
    });
};
