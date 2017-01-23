var fetcher = require('./api-fetcher.js');
var data = require('./data.js');
var transformer = require('./forecast-transformer.js');

function importForecasts(warningType, lang) {
  if (!lang) {
    lang = 'no';
  }

  console.log(new Date(), 'Import: ' + warningType + ' forecasts - ' + lang);

  return fetcher.fetchJson(warningType, lang)
    .then(function(json) {
      if (warningType === 'avalanche') {
        return json;
      } else {
        return json.CountyList;
      }
    })
    .then(function(json) {
      console.log(new Date(), 'Json fetched');
      return data.saveForecast(warningType, transformer.transformToForecast(json)).then(function() {
        return json;
      });
    })
    .then(function(json) {
      console.log(new Date(), 'Import Complete: ' + warningType + ' forecasts - ' + lang);
    })
    .catch(function(error) {
      console.error(new Date(), 'Import error: ', error);
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
  importAllForecasts: function() {
    return Promise.resolve().then(function() {
      return importAvalancheForecasts();
    }).then(function() {
      return importFloodForecasts();
    }).then(function() {
      return importLandslideForecasts();
    }).then(function() {
      console.log(new Date(), "Imported all forecasts");
      return "Imported all forecasts";
    });
  }
};
