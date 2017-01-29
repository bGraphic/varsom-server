var Parse = require('parse/node');
var _ = require('underscore');
var request = require("request");

var data = require('../app/data');

var ionicKeys = {
  token: process.env.IONIC_PUSH_TOKEN
};

var parseKeys = {
  app: process.env.PARSE_APP_ID,
  master: process.env.PARSE_MASTER_KEY,
  javascript: process.env.PARSE_JAVASCRIPT_KEY
};

Parse.initialize(parseKeys.app, parseKeys.javascript, parseKeys.master);
Parse.Cloud.useMasterKey();

var promises = [];

function registerDeviceToken(deviceToken) {
  if(!deviceToken) {
    return;
  }

  var options = {
    method: 'POST',
    url: 'https://api.ionic.io/push/tokens',
    headers: {
      'Authorization': 'Bearer ' + ionicKeys.token,
      'Content-Type': 'application/json'
    },
    json: {
      token: deviceToken
    }
  };

  return new Promise(function (resolve, reject) {
    request(options, function (error, response, body) {
      if (!error && response.statusCode === 201) {
        resolve(body.data);
      } else if (error) {
        reject(error);
      } else if (body.error) {
        reject(body.error);
      } else {
        reject(body);
      }
    });
  });
}

function importFavorite(installation) {
  var deviceToken = installation.get('deviceToken');
  var channels = installation.get('channels');

  channels = _.filter(channels, function (channel) {
    if(channel.includes('AvalancheRegion-')) {
      var regionId = parseInt(channel.replace("AvalancheRegion-", ""));
      return regionId >= 3000;
    } else {
      return true;
    }
  });

  channels = _.map(channels, function (channel) {
    channel = channel.replace("AvalancheRegion-", "");
    channel = channel.replace("County-", "");
    channel = channel.replace("Municipality-", "");
    return channel;
  });

  console.log(deviceToken);
  if(deviceToken) {
    promises.push(
      registerDeviceToken(deviceToken)
        .then(function (result) {
          console.log("Registered deviceToken", JSON.stringify(result));
        })
    );

    promises.push(data.saveParseChannels(deviceToken, channels)
      .then(function () {
        console.log("Saved parse channels for ", deviceToken);
      }));
  }
}

function importFavorites() {
  var query = new Parse.Query(Parse.Installation);
  return query.each(importFavorite).then(function () {
    console.log("Looped through all installation");
    return Promise.all(promises);
  });
}


importFavorites()
  .then(function () {
    console.log("All done");
  })
  .catch(function(error) {
    console.log("Error: ", JSON.stringify(error))
  });
