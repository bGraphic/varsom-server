var request = require('request');
var data = require('./data');

function fetchDataFromApiUrl(apiUrl) {
  var options = {
    url: apiUrl,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  return new Promise(function(resolve, reject) {
    request(options, function(error, response, body) {
      if (!error && response.statusCode === 200) {
        resolve(body);
      } else if (error) {
        reject(error);
      } else if (response.statusCode) {
        reject("Response code " + response.statusCode + " (" + apiUrl + ")");
      } else {
        reject("Something wrong with apiUrl " + apiUrl);
      }
    });
  });
}

function fetchJson(warningType, lang) {
  return Promise.resolve().then(function() {
    return data.fetchApiUrl(warningType, lang);
  }).then(function(url) {
    return fetchDataFromApiUrl(url);
  }).then(function(data) {
    return JSON.parse(data);
  }).then(function(json) {
    return json;
  });
}

module.exports = {
  fetchJson: fetchJson
};
