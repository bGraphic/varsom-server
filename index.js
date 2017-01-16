var admin = require("firebase-admin");
var http = require('http');
var url = require('url');

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

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: process.env.FIREBASE_DATABASE_URL
});

http.createServer(function (req, res) {
    res.writeHead(200, {'Content-Type': 'application/json'});

    var queryObject = url.parse(req.url,true).query;
    var pushToken = queryObject.token;

    if(!pushToken || pushToken.trim().length === 0) {
        console.log("Invalid token");
        res.error = "Invalid token";
        res.end();
        return;
    }

    admin.auth().createCustomToken(pushToken)
        .then(function(customToken) {
            console.log("Custom token", customToken);
            res.end(JSON.stringify({ "customAuthToken": customToken }));
        })
        .catch(function(error) {
            console.log("Firebase error", error);
            res.error = error;
            res.end();
        });

}).listen(3001);
console.log('Server running at http://localhost:3001/');