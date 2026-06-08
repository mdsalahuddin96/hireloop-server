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
    const jobCollection = db.collection("jobs");
    const companyCollection = db.collection("companys");
    const user=db.collection("user")
    app.get("/recruiter",async(req,res)=>{
      const result=await user.find().toArray()
      res.send(result)
    })
    app.get("/companies",async(req,res)=>{
      const result=await companyCollection.find().toArray()
      res.send(result)
    })
    // main page api
    app.get("/api/alljobs",async(req,res)=>{
      const jobs=await jobCollection.find().toArray()
      res.send(jobs)
    })
    // company related api
    app.post("/new/jobs", async (req, res) => {
      const data = req.body;
      const newJob = {
        ...data,
        createdAt: new Date(),
      };
      const result = await jobCollection.insertOne(newJob);
      res.send(result);
    });
    app.get("/api/company/jobs", async (req, res) => {
      const query = {};
      if (req.query.companyId) {
        query.companyId = req.query.companyId;
      }
      if (req.query.status) {
        query.status = req.query.status;
      }
      const result = await jobCollection.find(query).toArray();
      res.send(result);
    });
    app.post("/new/company", async (req, res) => {
      const data = req.body;
      const newCompany = {
        ...data,
        createdAt: new Date(),
      };
      const result = await companyCollection.insertOne(newCompany);
      res.send(result);
    });
    app.get("/api/my/companies", async (req, res) => {
      const query = {};
      if (req.query.recruiterId) {
        query.recruiterId = req.query.recruiterId;
      }
      const result = await companyCollection.findOne(query);
      console.log(result);
      res.send(result);
    });
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
