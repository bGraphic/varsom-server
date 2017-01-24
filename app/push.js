var request = require("request");

var ionicKeys = {
  token: process.env.IONIC_PUSH_TOKEN,
  profile: process.env.IONIC_PUSH_PROFILE
};

function sendPush(deviceTokens, notification) {
  var options = {
    method: 'POST',
    url: 'https://api.ionic.io/push/notifications',
    headers: {
      'Authorization': 'Bearer ' + ionicKeys.token,
      'Content-Type': 'application/json'
    },
    json: {
      tokens: deviceTokens,
      profile: ionicKeys.profile,
      notification: notification
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


module.exports = {
  sendPush: sendPush
};