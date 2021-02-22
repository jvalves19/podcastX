const functions = require("firebase-functions");
const admin = require('firebase-admin');
const app = require('express')();

admin.initializeApp();

const config = {
    apiKey: "AIzaSyA7qd4vEFeKYFX0tlMJXJ5VbdsNaQSqTDY",
    authDomain: "podcastx-tcc.firebaseapp.com",
    databaseURL: "https://podcastx-tcc-default-rtdb.firebaseio.com",
    projectId: "podcastx-tcc",
    storageBucket: "podcastx-tcc.appspot.com",
    messagingSenderId: "723057718838"
};

const firebase = require('firebase');
const { decode } = require("firebase-functions/lib/providers/https");
firebase.initializeApp(config);

const db = admin.firestore();

app.get('/screams', (req, res) => {
    db
    .collection('screams')
    .orderBy('createdAt', 'asc')
    .get()
    .then((data) => {
        let screams = [];
        data.forEach((doc) => {
            screams.push({
                screamId: doc.id,
                body: doc.data().body,
                userHandle: doc.data().userHandle,
                createdAt: doc.data().createdAt
            });
        });

        return res.json(screams);
    })
    .catch((err) => console.error(err));
});


const FBAuth = (req, res, next) => {
    let idToken;
    if(req.headers.authorization && req.headers.authorization.startsWith('Bearer ')){
        idToken = req.header.authorization.split('Bearer ')[1];
    }   else {
        console.error('Token não encontrado');
        return res.status(400).json({ error: 'Não Autorizado' });  
    }

    admin.auth().verifyIdToken(idToken)
        .then(decodedToken => {
            req.user = decodedToken;
            console.log(decodedToken);
            return db.collection('users')
                .where('userId', '==', req.user.uid)
                .limit(1)
                .get();  
        })
        .then(data => {
            req.user.handle = data.docs[0].data().handle;
            return next();
        })
        .catch(err => {
            console.error('Erro durante verificação de Token', err);
            return res.status(403).json(err);
        })
}

app.post('/scream', FBAuth, (req, res) => {
    const newScream = {
        body: req.body.body,
        userHandle: req.user.handle,
        createdAt: new Date().toISOString()
    };

    db
        .collection('screams')
        .add(newScream)
        .then(doc => {
            res.json({ message: `Documento ${doc.id} criado com Sucesso` });
        })
        .catch(err => {
            res.status(500).json({ error: 'Algo de Errado não está certo' });
            console.error(err);
        });
});

//Rota de Signup
app.post('/signup', (req, res) => {
    const newUser = {
        email: req.body.email,
        password: req.body.password,
        confirmPassword: req.body.confirmPassword,
        handle: req.body.handle
    };

    let token, userId;
    db
        .doc(`/users/${newUser.handle}`).get()
        .then((doc) => {
            if(doc.exists){
                return res.status(400).json({ handle: 'Este Id já está sendo usado' });
            }   else{
                return firebase
                    .auth()
                    .createUserWithEmailAndPassword(newUser.email, newUser.password);
            }
        })
        .then((data) => {
            userId = data.user.uid;
            return data.user.getIdToken();
        })
        .then((idToken) => {
            token = idToken;
            const userCredentials = {
                handle: newUser.handle,
                email: newUser.email,
                createdAt: new Date().toISOString(),
                userId
            };
            return db.doc(`/users/${newUser.handle}`).set(userCredentials);
        })
        .then(() => {
            return res.status(201).json({ token });
        })
        .catch((err) => {
            console.error(err);
            if(err.code === 'auth/email-already-in-use'){
                return res.status(400).json({ email: 'Email já está sendo usado' });
            }   else{
                return res.status(500).json({ error: err.code });
            }            
        });
});

//Rota de Login
app.post('/login', (req, res) => {
    const user = {
        email: req.body.email,
        password: req.body. password
    };

    let errors = {};

    if(isEmpty(user.email)) errors.email = 'Campo está vazio';
    if(isEmpty(user.password)) errors.password = 'Campo está vazio';

    if(Object.keys(errors).length > 0) return res.status(400).json(errors);

    firebase.auth().signInWithEmailAndPassword(user.email, user.password)
        .then(data => {
            return data.user.getIdToken();
        })
        .then(token => {
            return res.json({ token });
        })
        .catch(err => {
            console.log(err);
            if(err.code === 'auth/wrong-password') {
                return res.status(403).json({ general: 'Credenciais Incorretas'});
            }   else return res.status(500).json({ error: err.code });
        });
});


//  https://baseurl.com/api/
exports.api = functions.https.onRequest(app);