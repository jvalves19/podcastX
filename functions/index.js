const functions = require('firebase-functions');
const app = require('express')();
const FBAuth = require('./util/fbAuth');

const cors = require('cors');
app.use(cors());

const { db } = require('./util/admin');

//Users
const {
    signup,
    login,
    uploadImage,
    addUserDetails,
    getAuthenticatedUser,
    getUserDetails,
    markNotificationsRead,
} = require('./handlers/users');

//Podcasts
const {
    createPodcast,
    getAllPodcasts,
    getPodcast,
    likePodcast,
    unlikePodcast,
    deletePodcast
} = require('./handlers/podcasts');

// Rotas de Podcasts
app.post('/podcast', FBAuth, createPodcast),
app.get('/podcasts', getAllPodcasts);
app.get('/podcast/:podcastId', getPodcast);
app.delete('/podcast/:podcastId', FBAuth, deletePodcast);
app.get('/podcast/:podcastId/like', FBAuth, likePodcast);
app.get('/podcast/:podcastId/unlike', FBAuth, unlikePodcast);

// Rotas de Usuários
app.post('/signup', signup);
app.post('/login', login);
app.post('/user/image', FBAuth, uploadImage);
app.post('/user', FBAuth, addUserDetails);
app.get('/user', FBAuth, getAuthenticatedUser);
app.get('/user/:handle', getUserDetails);
app.post('/notifications', FBAuth, markNotificationsRead);

//  https://baseurl.com/api/
exports.api = functions.https.onRequest(app);

exports.createNotificationOnLike = functions.firestore.document('likes/{id}')
.onCreate((snapshot) => {
    return db
        .doc(`/podcasts/${snapshot.data().podcastId}`)
        .get()
        .then((doc) => {
        if (
            doc.exists &&
            doc.data().userHandle !== snapshot.data().userHandle
        ) {
            return db.doc(`/notifications/${snapshot.id}`).set({
                createdAt: new Date().toISOString(),
                recipient: doc.data().userHandle,
                sender: snapshot.data().userHandle,
                type: 'like',
                read: false,
                podcastId: doc.id
            });
        }
        })
        .catch((err) => console.error(err));
});

exports.deleteNotificationOnUnlike = functions.firestore.document('likes/{id}')
.onDelete((snapshot) => {
    return db
    .doc(`/notifications/${snapshot.id}`)
    .delete()
    .catch((err) => {
        console.error(err);
        return;
    });
});

exports.onUserImageChange = functions.firestore.document('/users/{userId}')
.onUpdate((change) => {
    console.log(change.before.data());
    console.log(change.after.data());
    if (change.before.data().imageUrl !== change.after.data().imageUrl) {
        console.log('Imagem Alterada');
        const batch = db.batch();
        return db
        .collection('podcasts')
        .where('userHandle', '==', change.before.data().handle)
        .get()
        .then((data) => {
            data.forEach((doc) => {
            const podcast = db.doc(`/podcasts/${doc.id}`);
            batch.update(podcast, { userImage: change.after.data().imageUrl });
            });
            return batch.commit();
        });
    } else return true;
});

exports.onPodcastDelete = functions.firestore.document('/podcasts/{podcastId}')
.onDelete((snapshot, context) => {
    const podcastId = context.params.podcastId;
    const batch = db.batch();
    return db
        .collection('comments')
        .where('podcastId', '==', podcastId)
        .get()
        .then((data) => {
        data.forEach((doc) => {
            batch.delete(db.doc(`/comments/${doc.id}`));
        });
        return db
            .collection('likes')
            .where('podcastId', '==', podcastId)
            .get();
        })
        .then((data) => {
        data.forEach((doc) => {
            batch.delete(db.doc(`/likes/${doc.id}`));
        });
        return db
            .collection('notifications')
            .where('podcastId', '==', podcastId)
            .get();
        })
        .then((data) => {
            data.forEach((doc) => {
                batch.delete(db.doc(`/notifications/${doc.id}`));
            });
            return batch.commit();
        })
        .catch((err) => console.error(err));
});