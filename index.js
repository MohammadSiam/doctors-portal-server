const express = require('express')
const app = express()
const cors = require('cors')
require('dotenv').config()
const { MongoClient } = require('mongodb');
const admin = require("firebase-admin");

const port = process.env.PORT || 5000

//const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

const serviceAccount = require('./doctors-portal-firebase-adminsdk.json')
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

app.use(cors());
app.use(express.json());
// doctors-portal-firebase-adminsdk.json




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.oktkt.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function verifyToken(req, res, next) {
    if (req.headers?.authorization?.startsWith('Bearer ')) {
        const token = req.headers.authorization.split(' ')[1];

        try {
            const decodedUser = await admin.auth().verifyIdToken(token);
            req.decodedEmail = decodedUser.email;
        }
        catch {

        }

    }
    next();
}

async function run() {
    try {
        await client.connect();

        const database = client.db("doctors-Portal");
        const appointmentCollection = database.collection("appointments");
        const usersCollection = database.collection("users");





        app.get('/appointments', verifyToken, async (req, res) => {
            const email = req.query.email;
            const date = new Date(req.query.date).toLocaleDateString();
            const query = { email: email, date: date }
            const cursor = appointmentCollection.find(query)
            const appointments = await cursor.toArray();
            res.json(appointments)
        })

        app.post('/appointments', async (req, res) => {
            const appointment = req.body;
            const result = await appointmentCollection.insertOne(appointment)
            console.log(appointment);
            res.json(result)
        })

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            let isAdmin = false;
            if (user?.role === 'admin') {
                isAdmin = true;
            }
            res.json({ admin: isAdmin });
        })

        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user)
            console.log(result);
            res.json(result)
        })

        app.put('/users', async (req, res) => {
            const user = req.body;
            const filter = { email: user.email }
            const options = { upsert: true };
            const updateDoc = { $set: user }
            const result = await usersCollection.updateOne(filter, updateDoc, options);
            res.json(result);
        })

        app.put('/users/admin', verifyToken, async (req, res) => {
            const user = req.body;
            const requster = req.decodedemail
            if (requster) {
                const requestedAccounnt = await usersCollection.findOne({ email: requester })
                if (requestedAccounnt.role === 'addmin') {
                    const filter = { email: user.email };
                    const updateDoc = { $set: { role: 'admin' } }
                    const result = await usersCollection.updateOne(filter, updateDoc)
                    res.json(result)
                }
            }
            else {
                res.send(403).json({ message: 'You dont have access to make admin' })
            }




        })

    } finally {
        //await client.close();
    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})