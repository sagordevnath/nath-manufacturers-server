const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

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
      const paymentCollection = client.db('computer-manufacturers').collection('payments');
      // const reviewCollection = client.db('computer-manufacturers').collection('reviews');

      const verifyAdmin = async (req, res, next) => {
        const requester = req.decoded.email;
        const requesterAccount = await userCollection.findOne({ email: requester });
        if (requesterAccount.role === 'admin') {
          next();
        }
        else {
          res.status(403).send({ message: 'forbidden' });
        }
      }

      app.post('/create-payment-intent', verifyJWT, async(req, res) =>{
        const order = req.body;
        const price = order.price;
        const amount = price*100;
        const paymentIntent = await stripe.paymentIntents.create({
          amount : amount,
          currency: 'usd',
          payment_method_types:['card']
        });
        res.send({clientSecret: paymentIntent.client_secret})
      });

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

      app.post('/product', async (req, res) => {
        const product = req.body;
        const result = await productCollection.insertOne(product);
        return res.send({ success: true, result });
      });

      app.delete('/product/:id', verifyJWT, async (req, res) => {
        const id = req.params.id;
        const query = {_id: ObjectId(id)};
        const result = await productCollection.deleteOne(query);
        res.send(result);
      });

      app.get('/user', async(req, res) => {
        const users = await userCollection.find().toArray();
        res.send(users);
    });  
    
    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === 'admin';
      res.send({ admin: isAdmin })
    })

    app.put('/user/admin/:email', verifyJWT, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: 'admin' },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

      app.put('/user/:email', async (req, res) => {
        const email = req.params.email;
        const userInfo = req.body;
        const filter = { email: email };
        const options = { upsert: true };
        const updateDoc = {
          $set: userInfo,
        };
        const result = await userCollection.updateOne(filter, updateDoc, options);
        const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
        res.send({ result, token});
      });

      app.get('/allOrder', async(req, res) => {
        const orders = await orderCollection.find().toArray();
        res.send(orders);
    }); 

      app.post('/order', async (req, res) => {
      const order = req.body;
      const result = await orderCollection.insertOne(order);
      console.log('sending email');
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

    app.get('/order/:id', verifyJWT, async(req, res) =>{
      const id = req.params.id;
      const query = {_id: ObjectId(id)};
      const order = await orderCollection.findOne(query);
      res.send(order);
    })

    app.patch('/order/:id', verifyJWT, async(req, res) =>{
      const id  = req.params.id;
      const payment = req.body;
      const filter = {_id: ObjectId(id)};
      const updatedDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId
        }
      }

      const result = await paymentCollection.insertOne(payment);
      const updatedOrder = await orderCollection.updateOne(filter, updatedDoc);
      res.send(updatedOrder);
    })

    app.get('/review', async(req, res) => {
      const reviews = await reviewCollection.find().sort({$natural: -1}).toArray();
      res.send(reviews);
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