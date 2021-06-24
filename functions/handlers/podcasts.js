const { db, admin } = require('../util/admin');

const config = require("../util/config");
const { uuid } = require("uuidv4");

function uploadPodcast () {
  const BusBoy = require('busboy');
  const path = require("path");
  const os = require("os");
  const fs = require("fs");
  
  const busboy = new BusBoy({ body: req.body });
  
  let podcastToBeUploaded = {};
  let podcastFileName;
  let generatedToken = uuid();
  
  busboy.on('file', (fieldname, file, filename, encoding, mimetype) => {
    if(mimetype !== 'audio/mpeg' && mimetype !=='audio/mp3'){
      return res.status(400).json({ error: "Tipo de Arquivo não Permitido" });
    }
  
    const audioExtension = filename.split('.')[filename.split(".").length - 1];
  
    podcastFileName = `${Math.round(
      Math.random() * 1000000000000
    ).toString()}.${audioExtension}`;
  
    const filepath = path.join(os.tmpdir(), podcastFileName);
    podcastToBeUploaded = { filepath, mimetype };
    file.pipe(fs.createWriteStream(filepath));
  });

  busboy.on('finish', () => {
    admin
      .storage()
      .bucket()
      .upload(podcastToBeUploaded.filepath, {
        resumable: false,
        metadata: {
          metadata: {
            contentType: podcastToBeUploaded.mimetype,
            firebaseStorageDownloadTokens: generatedToken,
          },
        },
      })
      .then(() => {
        // Append token to url
        const podcastUrl = `https://firebasestorage.googleapis.com/v0/b/${config.storageBucket}/o/${podcastFileName}?alt=media&token=${generatedToken}`;
        return db.doc(`/podcasts/${req.body.body}`).update({ podcastUrl });
      })
      .then(() => {
        return res.json({ message: "Podcast postado com Sucesso" });
      })
      .catch((err) => {
        console.error(err);
        return res.status(500).json({ error: "Algo de Errado Aconteceu" });
      });
  });
  
  busboy.end(req.rawBody);
};

exports.createPodcast = (req, res) => {

  const newPodcast = {
    podcastUrl: req.body.podcastUrl,
    podcastName: req.body.podcastName,
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

};

exports.unlikePodcast = (req, res) => {

};

exports.deletePodcast = (req, res) => {

};