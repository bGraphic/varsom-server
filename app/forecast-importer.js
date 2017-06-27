var fetcher = require('./api-fetcher.js');
var data = require('./data.js');
var transformer = require('./forecast-transformer.js');
var notifier = require('./push-notifier.js');
var _ = require('underscore');

function importForecasts(warningType, lang) {
  if (!lang) {
    lang = 'no';
  }

  console.log(new Date() + ' Import: ' + warningType + ' forecasts - ' + lang);

  var oldForecastTree = null;

  return Promise.resolve()
    .then(function () {
      return data.fetchForecastTree(warningType);
    })
    .then(function (forecast) {
      oldForecastTree = forecast;
      return fetcher.fetchJson(warningType, lang);
    })
    .then(function (json) {
      if (warningType === 'avalanche') {
        return json;
      } else {
        return json.CountyList;
      }
    })
    .then(function (json) {
      console.log(new Date() + ' Json fetched');
      return data.saveForecastTree(warningType, transformer.transformToForecast(json));
    })
    .then(function () {
      console.log(new Date() + ' Json saved');
      return data.fetchForecastTree(warningType);
    })
    .then(function (forecastTree) {
      return notifier.highestRatingChanged(warningType, oldForecastTree, forecastTree);
    })
    .then(function (notifications) {
      var log = "none";

      if (notifications.length > 0) {
        log = _.reduce(notifications, function (memo, notification) {
          return memo + "\n" + notification.app_id + " / " + notification.state + " / " + notification.config.tokens.length + " device tokens / " + JSON.stringify(notification.config.notification);
        }, '');
      }

      console.log(new Date() + ' Notifications: ' + log);

    })
    .then(function () {
      console.log(new Date() + ' Import Complete: ' + warningType + ' forecasts - ' + lang);
    })
    .catch(function (error) {
      console.error(new Date() + ' Import error: ', error);
    });
}

function importAvalancheForecasts() {
  return importForecasts('avalanche', 'no');
}

function importFloodForecasts() {
  return importForecasts('flood', 'no');
}

function importLandslideForecasts() {
  return importForecasts('landslide', 'no');
}

module.exports = {
  importAvalancheForecasts: importAvalancheForecasts,
  importFloodForecasts: importFloodForecasts,
  importLandslideForecasts: importLandslideForecasts,
  importAllForecasts: function () {
    return Promise.resolve().then(function () {
      return importAvalancheForecasts();
    }).then(function () {
      return importFloodForecasts();
    }).then(function () {
      return importLandslideForecasts();
    }).then(function () {
      console.log(new Date(), "Imported all forecasts");
      return "Imported all forecasts";
    });
  }
};
