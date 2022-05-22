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



async function run() {
    try {
      await client.connect();
      const productCollection = client.db('computer-manufacturers').collection('products');

      app.get('/product', async(req, res) => {
          const products = await productCollection.find().toArray();
          res.send(products);
      })
     
    } finally {
      
    }
  }
  run().catch(console.dir);
  
  app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
  })