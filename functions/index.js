const functions = require("firebase-functions");

const app = require('express')();

const FBAuth = require('./util/fbAuth');

const { getAllScreams, postOneScream } = require('./handlers/screams');
const { signup, login, uploadImage, addUserDetails, getAuthenticatedUser } = require('./handlers/users');

//Rotas de Screams
app.get('/screams', getAllScreams);
app.post('/scream', FBAuth, postOneScream);

//Rotas de Login/Signup
app.post('/signup', signup);
app.post('/login', login);

//Rotas de Usuários
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);

//  https://baseurl.com/api/
exports.api = functions.https.onRequest(app);