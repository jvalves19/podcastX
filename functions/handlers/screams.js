const { db } = require('../util/admin');

exports.getAllScreams = (req, res) => {
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
}

exports.postOneScream = (req, res) => {
    if(req.body.body.trim() === ''){
        return res.status(400).json({ body: 'Campo não pode estar vazio' });
    }

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
}