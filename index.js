const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.o5nys.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).send({ message: 'UnAuthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
      if (err) {
        return res.status(403).send({ message: 'Forbidden access' })
      }
      req.decoded = decoded;
      console.log('decoded', decoded)
      next();
    });
  }


async function run() {
    try {
      await client.connect();
      const productCollection = client.db('computer-manufacturers').collection('products');
      const userCollection = client.db('computer-manufacturers').collection('users');      
      const orderCollection = client.db('computer-manufacturers').collection('orders');
      const reviewCollection = client.db('computer-manufacturers').collection('reviews');

      app.get('/product', async(req, res) => {
          const products = await productCollection.find().toArray();
          res.send(products);
      });

      app.get('/product/:id', async(req, res) =>{
        const id = req.params.id;
        const query = {_id: ObjectId(id)};
        const product = await productCollection.findOne(query);
        res.send(product);
      });

    

      app.put('/user/:email', async (req, res) => {
        const email = req.params.email;
        const user = req.body;
        const filter = { email: email };
        const options = { upsert: true };
        const updateDoc = {
          $set: user,
        };
        const result = await userCollection.updateOne(filter, updateDoc, options);
        const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
        res.send({ result, token});
      });

      app.post('/order', async (req, res) => {
      const order = req.body;
      // const query = { treatment: booking.treatment, date: booking.date, patient: booking.patient }
      // const exists = await orderCollection.findOne(query);
      // if (exists) {
      //   return res.send({ success: false, booking: exists })
      // }
      const result = await orderCollection.insertOne(order);
      console.log('sending email');
      // sendAppointmentEmail(booking);
      return res.send({ success: true, result });
    });

    app.get('/order', verifyJWT, async (req, res) => {
      const userEmail = req.query.userEmail;
      console.log(userEmail);
      const decodedEmail = req.decoded.email;
      if (userEmail == decodedEmail) {
        const query = { userEmail: userEmail };
        const order = await orderCollection.find(query).toArray();
        return res.send(order);
      }
      else {
        return res.status(403).send({ message: 'forbidden access' });
      }
    });

    app.delete('/order/:id', verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const result = await orderCollection.deleteOne(query);
      res.send(result);
    });

    app.get('/review', async(req, res) => {
      const review = await reviewCollection.find().toArray();
      res.send(review);
  });

  app.post('/review', async (req, res) => {
    const review = req.body;    
    const result = await reviewCollection.insertOne(review);
    return res.send({ success: true, result });
  });
     
    } finally {
      
    }
  }
  run().catch(console.dir);
  
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })