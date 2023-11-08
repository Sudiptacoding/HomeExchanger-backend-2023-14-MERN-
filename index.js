const express = require('express')
require('dotenv').config()
var cors = require('cors')
var cookieParser = require('cookie-parser')
var jwt = require('jsonwebtoken');

const app = express()

app.use(cookieParser())
app.use(cors({
    origin: ['http://localhost:5173'],
    credentials: true
}))
app.use(express.json())

const port = process.env.PORT || 3000

const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sm8afkk.mongodb.net/?retryWrites=true&w=majority`
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

// meddle wear
const verify = async (req, res, next) => {
    const token = req.cookies?.token
    if (!token) {
        return res.status(401).send({ message: "unAuthorize access" })
    }
    jwt.verify(token, 'secret', function (err, decoded) {
        if (err) {
            return res.status(401).send({ message: "unAuthorize access" })
        }
        req.user = decoded;
        next()
    });

}

app.post('/jwt', (req, res) => {
    try {
        const token = jwt.sign(req.body, 'secret', { expiresIn: '1h' });
        res
            .cookie('token', token, {
                httpOnly: true,
                secure: false,
                sameSite: false,
            })
            .send(token)
    } catch (error) {
        console.log(error)
    }
})

app.get('/cookedelet', (req, res) => {
    res.clearCookie('token', { maxAge: 0 }).send({ sucess: true })
})
async function run() {
    try {
        const database = client.db("assignment11");
        const allServices = database.collection("allservices");
        const bookService = database.collection("bookinglist");

        // add services
        app.post('/addservice', verify, async (req, res) => {
            const result = await allServices.insertOne(req.body);
            res.send(result)
        })

        // book services
        app.post('/booking', verify, async (req, res) => {
            const result = await bookService.insertOne(req.body);
            res.send(result)
        })

        // Only catagory lode
        app.get('/services', async (req, res) => {
            const allData = await allServices.find().toArray()
            const uniqueCategories = [...new Set(allData.map(item => item.category))];
            let array = []
            for (const item of uniqueCategories) {
                const findValue = allData.find(cata => cata?.category === item)
                array.push(findValue)
            }
            res.send(array)
        })

        // All services
        app.get('/allservices', async (req, res) => {
            const result = await allServices.find().toArray();
            res.send(result)
        })

        // all service for search
        app.get('/allservicesSearch', async (req, res) => {
            const result = await allServices.find().toArray();
            res.send(result)
        })

        // my bookings
        app.get('/mybookings', verify, async (req, res) => {
            const email = req.query.email
            const token = req.user
            if (token.email !== email) {
                return res.status(403).send({ message: "Not access" })
            }
            const result = await bookService.find({ buyUserEmail: email }).toArray();
            res.send(result)
        })

        // my services
        app.get('/myservices', verify, async (req, res) => {
            const email = req.query.email
            const token = req.user
            if (token.email !== email) {
                return res.status(403).send({ message: "Not access" })
            }
            const result = await allServices.find({ userEmail: email }).toArray();
            res.send(result)
        })

        // Get single item
        app.get('/singleservices/:id', verify, async (req, res) => {
            const result = await allServices.findOne({ _id: new ObjectId(req.params.id) });
            res.send(result)
        })

        //  single item delete
        app.delete('/singleservicesdelete/:id', verify, async (req, res) => {
            const result = await allServices.deleteOne({ _id: new ObjectId(req.params.id) });
            res.send(result)
        })

        // Booking delet
        app.delete('/booking/:id', verify, async (req, res) => {
            const result = await bookService.deleteOne({ _id: new ObjectId(req.params.id) });
            res.send(result)
        })

        // Upded status
        app.patch('/status/', verify, async (req, res) => {
            const id = req.query.id;
            const { stats } = req.body;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    status: stats
                },
            };
            const result = await bookService.updateOne(filter, updateDoc, options);
            res.send(result)
        })

        //  single service details
        app.get('/servicesdetails/:id', verify, async (req, res) => {
            const result = await allServices.findOne({ _id: new ObjectId(req.params.id) })
            res.send(result)
        })

        //  single service details
        app.get('/allsimilerservices', async (req, res) => {
            const result = await allServices.find({ userEmail: req.query.email }).toArray();
            res.send(result)
        })

        //  painding work
        app.get('/paindingwork', verify, async (req, res) => {
            const result = await bookService.find({ userEmail: req.query.email }).toArray()
            res.send(result)
        })

        // upded product
        app.post('/updedservice/:id', verify, async (req, res) => {
            const body = req.body;
            const filter = { _id: new ObjectId(req.params.id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    ...body
                },
            };
            const result = await allServices.updateOne(filter, updateDoc, options);
            res.send(result)
        })





        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
    }
}
run().catch(console.dir);



app.get('/', verify, (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})