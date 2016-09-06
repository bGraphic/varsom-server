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

var databaseUrl = process.env.FIREBASE_DATABASE_URL;

var firebase = require("firebase");
firebase.initializeApp({
  serviceAccount: serviceAccount,
  databaseURL: databaseUrl
});

var db = firebase.database();

function saveForecast(warningType, json) {
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

function saveAreas(warningType, json) {
  if (warningType === "avalanche") {
    json.regions = json.parents;
  } else {
    json.counties = json.parents;
    json.municipalities = json.children;
  }

  delete json.parents;
  delete json.children;

  var ref = db.ref("areas");
  return ref.update(json);
}

function fetchApiUrl(warningType, lang) {
  var apiRef = db.ref("api/" + warningType);
  var apiUrl = null;

  return apiRef.once("value", function(data) {
    apiUrl = data.val();

    if (apiUrl && lang === 'en') {
      apiUrl = apiUrl.replace('/1/', '/2/');
    }
  }).then(function() {
    if (apiUrl) {
      return apiUrl;
    } else {
      return Promise.reject("Missing api url: " + warningType);
    }
  });
}

module.exports = {
  fetchApiUrl: fetchApiUrl,
  saveForecast: saveForecast,
  saveAreas: saveAreas
};
