var _ = require('underscore');
var data = require('./data.js');
var push = require('./push.js');

function highestForecastRating(forecast) {
  return _.reduce(_.values(forecast), function (memo, warning) {
    return warning.Rating > memo ? warning.Rating : memo;
  }, 0);
}

function compareHighestForecastRating(oldForecast, forecast) {
  var oldValue = highestForecastRating(oldForecast);
  var newValue = highestForecastRating(forecast);

  if(oldValue !== newValue) {
    return "Høyeste varslingsnivå endret fra " + oldValue + " til " + newValue + " for de neste 3 dagene."
  }
}

function notifySubscribers(warningType, areaId, areaName, message) {
  if(!message) {
    return;
  }

  if ('avalanche' === warningType) {
    warningType = "snøskred";
  } else if ('flood' === warningType) {
    warningType = "flom";
  } else if ('landslide' === warningType) {
    warningType = "jordskred";
  }

  return data.fetchSubscriptions(areaId)
    .then(function (subscribers) {
      return push.sendPush(subscribers, {
        ios: {
          title: "Oppdatering",
          message: areaName + " - " + warningType + ": " + message,
          payload: {
            areaId: areaId
          },
          priority: 10
        }
      });
    });
}

function compareAndNotifyBranch(warningType, oldForecastBranch, forecastBranch, compareFunction) {
  var promises = [];
  _.each(_.keys(oldForecastBranch), function (areaIdKey) {
    var message = compareFunction(oldForecastBranch[areaIdKey].Forecast, forecastBranch[areaIdKey].Forecast);
    var promise = notifySubscribers(warningType, oldForecastBranch[areaIdKey].Id, oldForecastBranch[areaIdKey].Name, message);
    if(promise) {
      promises.push(promise);
    }
  });
  return promises;
}

function compareAndNotifyTree(warningType, oldForecastTree, forecastTree, compareFunction) {
  var promises = [];
  _.each(_.keys(oldForecastTree), function (areaTypeKey) {
    if("municipalities" === areaTypeKey) {
      _.each(_.keys(oldForecastTree[areaTypeKey]), function (countyIdKey) {
        var oldBranch = oldForecastTree[areaTypeKey][countyIdKey];
        var branch = forecastTree[areaTypeKey][countyIdKey];
        var branchPromises = compareAndNotifyBranch(warningType, oldBranch, branch, compareFunction);
        promises = promises.concat(branchPromises);
      });
    } else {
      var branchPromises = compareAndNotifyBranch(warningType, oldForecastTree[areaTypeKey], forecastTree[areaTypeKey], compareFunction);
      promises = promises.concat(branchPromises);
    }
  });
  return Promise.all(promises);
}

module.exports = {
  highestRatingChanged: function (warningType, oldForecastTree, forecastTree) {
    return compareAndNotifyTree(warningType, oldForecastTree, forecastTree, compareHighestForecastRating)
  }
};