const express = require("express");
const app = express();
const cors = require("cors");
const dotenv = require("dotenv");
dotenv.config();
const port = 5000;
app.use(cors());
app.use(express.json());
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = process.env.MONGO_URI;
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const db = client.db("hireloopDB");
    const jobCollection=db.collection('jobs')
    app.post("/new/jobs",async(req,res)=>{
        const data=req.body;
        const result=await jobCollection.insertOne(data)
        res.send(result)
    })
    app.get("/api/jobs",async(req,res)=>{
        const query={}
        if(req.query.companyId){
            query.companyId=req.query.companyId
        }
        if(req.query.status){
            query.status=req.query.status
        }
        const result= await jobCollection.find(query).toArray()
        res.send(result)
    })
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!",
    );
  } finally {
    // await client.close()
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Hello world");
});

app.listen(port, () => {
  console.log(`Server running on ${port}`);
});
