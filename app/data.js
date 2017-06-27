var admin = require("firebase-admin");
var _ = require('underscore');

var serviceAccount = {
  type: "service_account",
  project_id: process.env.FIREBSE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://accounts.google.com/o/oauth2/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.FIREBASE_X509_CERT_URL
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL
});

var db = admin.database();

function saveForecastTree(warningType, json) {
  if (warningType === "avalanche") {
    json.regions = json.parents;
  } else {
    json.counties = json.parents;
    json.municipalities = json.children;
  }

  delete json.parents;
  delete json.children;

  var ref = db.ref("forecast/" + warningType);
  return ref.set(json);
}

function fetchForecastTree(warningType) {
  var ref = db.ref("forecast/" + warningType);

  return ref.once("value")
    .then(function (snapshot) {
      return snapshot.val();
    });
}

function fetchApiUrl(warningType, lang) {
  var apiRef = db.ref("api/" + warningType);

  return apiRef.once("value")
    .then(function (snapshot) {
      var apiUrl = snapshot.val();

      if (apiUrl && lang === 'en') {
        apiUrl = apiUrl.replace('/1/', '/2/');
      }

      if (apiUrl) {
        return apiUrl;
      } else {
        return Promise.reject("Missing api url: " + warningType);
      }
    });
}

function fetchSubscriptions(areaId) {
  var subscriptionsRef = db.ref("subscriptions/id" + areaId);

  return subscriptionsRef.once("value")
    .then(function (snapshot) {
      var subscriptions = snapshot.val();
      return _.keys(subscriptions);
    });
}

function saveParseChannels(deviceToken, parseFavorites) {
  if (!deviceToken) {
    return;
  }
  var ref = db.ref("/parse_channels/" + deviceToken);
  return ref.set(parseFavorites);
}

module.exports = {
  fetchApiUrl: fetchApiUrl,
  fetchForecastTree: fetchForecastTree,
  saveForecastTree: saveForecastTree,
  fetchSubscriptions: fetchSubscriptions,
  saveParseChannels: saveParseChannels
};
