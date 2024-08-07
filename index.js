
const express = require('express')
const cors = require('cors');
const { MongoClient, ObjectId } = require('mongodb');
const path = require('path')
const fetch = require('node-fetch');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express()

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200 // limit each IP to 200 requests per windowMs
});


app.use(limiter);
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const port = process.env.PORT
const mondoDbUrl = process.env.MONGODB_CONN

app.get('/notam', (req, res) => {

    //Get notam data
    fetch("https://www.ais.fi/bulletins/efinen.htm", { headers: { "Content-Type": "text/html" } }).then((data) => {

        data.text().then((text) => {
            res.send(text);
        });
    }).catch((err) => {
        console.log(err);
        res.sendStatus(500);
    });

});

app.get('/persons', (req, res) => {

    // Create a new MongoClient
    const client = new MongoClient(mondoDbUrl);

    // Connect to the MongoDB server
    client.connect().then((client) => {

        var dateNow = new Date();
        dateNow.setDate(dateNow.getDate()-1);

        client.db("Hto").collection("Persons").find({ready_time: { $gte: dateNow }}).toArray().then((results) => {
            client.close();
            res.send(JSON.stringify(results));
        });

    }).catch(() => {
        res.sendStatus(500);
    });

});

app.post('/persons', (req, res) => {

    // Create a new MongoClient
    const client = new MongoClient(mondoDbUrl);

    // Connect to the MongoDB server
    client.connect().then((client) => {

        delete req.body._id;

        req.body.ready_time = new Date(req.body.ready_time);

        client.db("Hto").collection("Persons").insertOne(req.body).then(() => {
            client.close();
            res.sendStatus(200);
        });

    }).catch(() => {
        res.sendStatus(500);
    });

});

app.put('/persons', (req, res) => {

    if (!validateId(req.body._id)) {
        res.sendStatus(500);
        return;
    }

    // Create a new MongoClient
    const client = new MongoClient(mondoDbUrl);

    // Connect to the MongoDB server
    client.connect().then((client) => {

        try {
            const id = new ObjectId(String(req.body._id));
            delete req.body._id;

            client.db("Hto").collection("Persons").updateOne(
                {
                    "_id": id
                },
                {
                    $set: req.body
                }
            ).then(() => {
                client.close();
                res.sendStatus(200);
            });
        }
        catch {
            res.send(500);
        }
    });

});

app.delete('/persons', (req, res) => {

    if (!validateId(req.body._id)) {
        res.sendStatus(500);
        return;
    }

    // Create a new MongoClient
    const client = new MongoClient(mondoDbUrl);

    // Connect to the MongoDB server
    client.connect().then((client) => {

        try {
            const id = new ObjectId(String(req.body._id));
            delete req.body._id;

            client.db("Hto").collection("Persons").deleteOne(
                {
                    "_id": id
                }
            ).then(() => {
                client.close();
                res.sendStatus(200);
            });
        }
        catch {
            res.sendStatus(500);
        }

    });

});

app.post('/skywin', (req, res) => {

    let emailObj = {
        email: req.body.email
    }

    fetch("https://skywin.klu.fi/", { method: "POST", body: JSON.stringify(emailObj), headers: { "Content-Type": "application/json" } }).then(() => {

        res.sendStatus(200);

    }).catch((err) => {
        console.log(err);
        res.sendStatus(500);
    });

});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

function validateId(id) {
    const pattern = /^[0-9a-fA-F]{24}$/;
    return pattern.test(id);
}

