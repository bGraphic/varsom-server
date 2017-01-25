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

function newestMicroBlogPostDate(forecast) {
  return _.reduce(_.values(forecast), function (memo, warning) {
    if(warning.MicroBlogPostList && warning.MicroBlogPostList[0] && warning.MicroBlogPostList[0].DateTime) {
      var date = new Date(warning.MicroBlogPostList[0].DateTime);
      return date > memo ? date : memo;
    } else {
      return memo;
    }
  }, new Date('2000-01-01T00:00:00'));
}

function compareMicroBlogPosts(oldForecast, forecast) {
  var oldValue = newestMicroBlogPostDate(oldForecast);
  var newValue = newestMicroBlogPostDate(forecast);

  if(newValue > oldValue) {
    return "Ny varslingsoppdatering."
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
  return promises;
}

module.exports = {
  highestRatingChanged: function (warningType, oldForecastTree, forecastTree) {
    var highestForecsatRatingNotifications = compareAndNotifyTree(warningType, oldForecastTree, forecastTree, compareHighestForecastRating);
    var microBlogPostNotification = compareAndNotifyTree(warningType, oldForecastTree, forecastTree, compareMicroBlogPosts);
    return Promise.all([].concat(highestForecsatRatingNotifications, microBlogPostNotification));
  }
};