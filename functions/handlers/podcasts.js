const { db, admin } = require('../util/admin');

const config = require("../util/config");
const { uuid } = require("uuidv4");

exports.createPodcast = (req, res) => {

  const newPodcast = {
    podcastUrl: req.body.podcastUrl,
    podcastName: req.body.podcastName,
    userEmail: req.user.email,
    userHandle: req.user.handle,
    userImage: req.user.imageUrl,
    likeCount: 0,
    createdAt: new Date().toISOString(),
  };

  db.collection('podcasts')
    .add(newPodcast)
    .then((doc) => {
      const resPodcast = newPodcast;
      resPodcast.podcastId = doc.id;
      res.json(resPodcast);
    })
    .catch((err) => {
        res.status(500).json({ error: 'Algo de Errado Aconteceu' });
        console.error(err);
    });
};

exports.getAllPodcasts = (req, res) => {
  db.collection('podcasts')
    .orderBy('createdAt', 'desc')
    .get()
    .then((data) => {
        let podcasts = [];
        data.forEach((doc) => {
          podcasts.push({
              podcastId: doc.id,
              podcastUrl: doc.data().podcastUrl,
              podcastName: doc.data().podcastName,
              userEmail: doc.data().userEmail,
              userHandle: doc.data().userHandle,
              userImage: doc.data().userImage,
              likeCount: doc.data().likeCount,
              createdAt: doc.data().createdAt,
          });
        });
        return res.json(podcasts);
    })
    .catch((err) => {
        console.error(err);
        res.status(500).json({ error: err.code });
    });
};

exports.getPodcast = (req, res) => {
  let podcastData = {};

  db.doc(`/podcasts/${req.params.podcastId}`)
    .get()
    .then((doc) => {
      if (!doc.exists) {
          return res.status(404).json({ error: 'Podcast não foi Encontrado' });
      }

      podcastData = doc.data();
      podcastData.podcastId = doc.id;
      return db
        .orderBy('createdAt', 'desc')
        .where('podcastId', '==', req.params.podcastId)
        .get();
    })
    .then((data) => {
      return res.json(podcastData);
    })
    .catch((err) => {
      console.error(err);
      res.status(500).json({ error: err.code });
    });
};

exports.likePodcast = (req, res) => {
  const likeDocument = db
  .collection('likes')
  .where('userHandle', '==', req.user.handle)
  .where('podcastId', '==', req.params.podcastId)
  .limit(1);

const podcastDocument = db.doc(`/podcasts/${req.params.podcastId}`);

let podcastData;

podcastDocument
  .get()
  .then((doc) => {
    if (doc.exists) {
      podcastData = doc.data();
      podcastData.podcastId = doc.id;
      return likeDocument.get();
    } else {
      return res.status(404).json({ error: 'Podcast não foi Encontrado' });
    }
  })
  .then((data) => {
    if (data.empty) {
      return db
        .collection('likes')
        .add({
          podcastId: req.params.podcastId,
          userHandle: req.user.handle
        })
        .then(() => {
          podcastData.likeCount++;
          return podcastDocument.update({ likeCount: podcastData.likeCount });
        })
        .then(() => {
          return res.json(podcastData);
        });
    } else {
      return res.status(400).json({ error: 'Podcast já foi curtido por você' });
    }
  })
  .catch((err) => {
    console.error(err);
    res.status(500).json({ error: err.code });
  });
};

exports.unlikePodcast = (req, res) => {
  const likeDocument = db
  .collection('likes')
  .where('userHandle', '==', req.user.handle)
  .where('podcastId', '==', req.params.podcastId)
  .limit(1);

const podcastDocument = db.doc(`/podcasts/${req.params.podcastId}`);

let podcastData;

podcastDocument
  .get()
  .then((doc) => {
  if (doc.exists) {
      podcastData = doc.data();
      podcastData.podcastId = doc.id;
      return likeDocument.get();
  } else {
      return res.status(404).json({ error: 'Podcast não foi Encontrado' });
  }
  })
  .then((data) => {
  if (data.empty) {
      return res.status(400).json({ error: 'Você descurtiu este Podcast' });
  } else {
      return db
      .doc(`/likes/${data.docs[0].id}`)
      .delete()
      .then(() => {
          podcastData.likeCount--;
          return podcastDocument.update({ likeCount: podcastData.likeCount });
      })
      .then(() => {
          res.json(podcastData);
      });
  }
  })
  .catch((err) => {
    console.error(err);
    res.status(500).json({ error: err.code });
  });
};

exports.deletePodcast = (req, res) => {
  const document = db.doc(`/podcasts/${req.params.podcastId}`);
  document
    .get()
    .then((doc) => {
    if (!doc.exists) {
        return res.status(404).json({ error: 'Podcast não foi Encontrado' });
    }
    if (doc.data().userHandle !== req.user.handle) {
        return res.status(403).json({ error: 'NÃO AUTORIZADO' });
    } else {
        return document.delete();
    }
    })
    .then(() => {
      res.json({ message: 'Podcast deletado com Sucesso' });
    })
    .catch((err) => {
      console.error(err);
      return res.status(500).json({ error: err.code });
    });
};