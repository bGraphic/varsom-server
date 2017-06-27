var _ = require('underscore');

function extractName(areaJson) {
  return areaJson.Name;
}

function extractId(areaJson) {
  if (parseInt(areaJson.Id, 10) < 10) {
    return "0" + parseInt(areaJson.Id, 10);
  } else {
    return areaJson.Id;
  }
}

function extractWarningLevel(warningJson) {
  if (warningJson.hasOwnProperty('DangerLevel')) {
    return warningJson.DangerLevel;
  } else if (warningJson.hasOwnProperty('ActivityLevel')) {
    return warningJson.ActivityLevel;
  } else if (warningJson.hasOwnProperty('Rating')) {
    return warningJson.Rating;
  }
}

function extractTypeId(areaJson) {
  if (areaJson.hasOwnProperty('TypeId')) {
    return areaJson.TypeId;
  }
}

function cleanWarning(warningJson) {
  // Deleting unused and/or unnecessary fields
  warningJson.Rating = extractWarningLevel(warningJson);

  // Avalanche
  delete warningJson.DangerLevel;
  delete warningJson.UtmEast;
  delete warningJson.UtmNorth;
  delete warningJson.UtmZone;
  delete warningJson.LangKey;
  delete warningJson.RegId;
  delete warningJson.RegionId;
  delete warningJson.RegionName;
  delete warningJson.RegionTypeId;
  delete warningJson.RegionTypeName;
  delete warningJson.MunicipalityName;

  // Flood, Landlside
  delete warningJson.ActivityLevel;
  delete warningJson.MunicipalityCsvString;
  delete warningJson.MunicipalityList;
  delete warningJson.CountyList;
  delete warningJson.StationList;
  delete warningJson.Id;
  delete warningJson.MasterId;
  delete warningJson.EventId;
  delete warningJson.Version;

  if (warningJson.AvalancheProblems) {
    warningJson.AvalancheProblems = _.sortBy(warningJson.AvalancheProblems, 'AvalancheProblemId');
  }

  if (warningJson.MicroBlogPostList) {
    warningJson.MicroBlogPostList = _.sortBy(warningJson.AvalancheProblems, 'DateTime');
    warningJson.MicroBlogPostList.reverse();
  }

  return warningJson;
}

function cleanForecast(forecastJson) {
  var cleanedForecastJson = {};
  _.each(forecastJson, function (warningJson, key) {
    cleanedForecastJson["day" + key] = cleanWarning(warningJson);
  });

  return cleanedForecastJson;
}

function extractForecast(areaJson) {
  if (areaJson.hasOwnProperty('AvalancheWarningList')) {
    return areaJson.AvalancheWarningList;
  } else if (areaJson.hasOwnProperty('WarningList')) {
    return areaJson.WarningList;
  } else {
    return [];
  }
}

function extractChildAreasJson(areaJson) {
  if (areaJson.hasOwnProperty('MunicipalityList')) {
    return areaJson.MunicipalityList;
  }
}

function createHighestLevelForecast(forecasts) {
  var highestForecast = [];
  _.each(forecasts, function (forecast) {
    _.each(forecast, function (warning, i) {
      if (!highestForecast[i] || (extractWarningLevel(highestForecast[i]) < extractWarningLevel(warning))) {
        highestForecast[i] = warning;
      }
    });
  });
  return highestForecast;
}

function transformToForecast(areasJson) {
  if (!areasJson || areasJson.length === 0) {
    return [];
  }

  var areas = [];

  _.each(areasJson, function (areaJson) {
    var area = {
      Id: extractId(areaJson),
      Name: extractName(areaJson),
      Forecast: cleanForecast(extractForecast(areaJson)),
      Children: transformToForecast(extractChildAreasJson(areaJson))
    };

    if (extractTypeId(areaJson)) {
      area.TypeId = extractTypeId(areaJson);
    }

    if (area.Children.length > 0) {
      area.Forecast = createHighestLevelForecast(_.pluck(area.Children, 'Forecast'));
    }

    areas.push(area);
  });

  return areas;
}

function transformToAreas(areasJson) {
  if (!areasJson || areasJson.length === 0) {
    return [];
  }

  var areas = [];

  _.each(areasJson, function (areaJson) {
    var area = {
      Id: extractId(areaJson),
      Name: extractName(areaJson),
      Children: transformToAreas(extractChildAreasJson(areaJson))
    };

    areas.push(area);
  });

  return areas;
}

function denormalize(areasJson) {
  var parents = {};
  var children = {};

  _.each(areasJson, function (areaJson) {
    parents["id" + areaJson.Id] = areaJson;
    children["id" + areaJson.Id] = {};

    _.each(areaJson.Children, function (childArea) {
      children["id" + areaJson.Id]["id" + childArea.Id] = childArea;
    });

    delete parents["id" + areaJson.Id].Children;
  });

  return {
    parents: parents,
    children: children
  };
}

module.exports = {
  transformToForecast: function (json) {
    return denormalize(transformToForecast(json));
  }
};
