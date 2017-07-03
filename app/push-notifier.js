var _ = require('underscore');
var data = require('./data.js');
var push = require('./push.js');

var AVLANCHE_TYPE = 100000;
var FLOOD_TYPE = 200000;
var LANDSLIDE_TYPE = 300000;
var RATING_NOT_TYPE = 10000;
var MICRO_BLOG_NOT_TYPE = 20000;
var AVALANCHE_PROB_NOT_TYPE = 30000;

function highestForecastRating(forecast) {
  return _.reduce(_.values(forecast), function (memo, warning) {
    return warning.Rating > memo ? warning.Rating : memo;
  }, 0);
}

function compareHighestForecastRating(oldForecast, forecast) {
  var oldValue = highestForecastRating(oldForecast);
  var newValue = highestForecastRating(forecast);

  if (oldValue !== newValue) {
    return {
      type: RATING_NOT_TYPE,
      text: "Endring i varslingsnivå fra " + oldValue + " til " + newValue + "."
    }
  }
}

function newestMicroBlogPostDate(forecast) {
  return _.reduce(_.values(forecast), function (memo, warning) {
    if (warning.MicroBlogPostList && warning.MicroBlogPostList[0] && warning.MicroBlogPostList[0].DateTime) {
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

  if (newValue > oldValue) {
    return {
      type: MICRO_BLOG_NOT_TYPE,
      text: "Ny varslingsoppdatering."
    }
  }
}

function mostImportantAvalancheProblem(forecast) {
  if (forecast.day0 && forecast.day0.AvalancheProblems && forecast.day0.AvalancheProblems[0]) {
    return {
      problemTypeId: forecast.day0.AvalancheProblems[0].AvalancheProblemTypeId,
      causeId: forecast.day0.AvalancheProblems[0].AvalCauseId
    }
  }
}

function compareMostImportantAvalancheProblem(oldForecast, forecast) {
  var oldValue = mostImportantAvalancheProblem(oldForecast);
  var newValue = mostImportantAvalancheProblem(forecast);

  if (oldValue && newValue && (oldValue.problemTypeId !== newValue.problemTypeId || oldValue.causeId !== newValue.causeId)) {
    return {
      type: AVALANCHE_PROB_NOT_TYPE,
      text: "Endring i det viktigste snøskredproblemet."
    }
  }
}

function notifySubscribers(warningType, areaId, areaName, message) {
  if (!message) {
    return;
  }

  var notId = parseInt(areaId);
  notId += parseInt(message.type);

  if ('avalanche' === warningType) {
    warningType = "Snøskred";
    notId += parseInt(AVLANCHE_TYPE);
  } else if ('flood' === warningType) {
    warningType = "Flom";
    notId += parseInt(FLOOD_TYPE);
  } else if ('landslide' === warningType) {
    warningType = "Jordskred";
    notId += parseInt(LANDSLIDE_TYPE);
  }

  return data.fetchSubscriptions(areaId)
    .then(function (subscribers) {
      return push.sendPush(subscribers, {
        title: areaName + " - " + warningType,
        message: message.text,
        payload: {
          areaId: areaId
        },
        ios: {
          priority: 10
        },
        android: {
          data: {
            notId: notId
          }
        }
      });
    });
}

function compareAndNotifyBranch(warningType, oldForecastBranch, forecastBranch, compareFunction) {
  var promises = [];
  _.each(_.keys(oldForecastBranch), function (areaIdKey) {
    var message = compareFunction(oldForecastBranch[areaIdKey].Forecast, forecastBranch[areaIdKey].Forecast);
    var promise = notifySubscribers(warningType, oldForecastBranch[areaIdKey].Id, oldForecastBranch[areaIdKey].Name, message);
    if (promise) {
      promises.push(promise);
    }
  });
  return promises;
}

function compareAndNotifyTree(warningType, oldForecastTree, forecastTree, compareFunction) {
  var promises = [];
  _.each(_.keys(oldForecastTree), function (areaTypeKey) {
    if ("municipalities" === areaTypeKey) {
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
    var notifications = compareAndNotifyTree(warningType, oldForecastTree, forecastTree, compareHighestForecastRating);

    if ('avalanche' !== warningType) {
      notifications = notifications.concat(compareAndNotifyTree(warningType, oldForecastTree, forecastTree, compareMicroBlogPosts));
    } else {
      notifications = notifications.concat(compareAndNotifyTree(warningType, oldForecastTree, forecastTree, compareMostImportantAvalancheProblem));
    }

    return Promise.all(notifications);
  }
};