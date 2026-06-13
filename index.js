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
    const applicationCollection = db.collection("applications");
    const planCollection = db.collection("plans");
    const subscriptionColl = db.collection("subscription");
    const user = db.collection("user");
    app.get("/recruiter", async (req, res) => {
      const result = await user.find().toArray();
      res.send(result);
    });
    app.get("/companies", async (req, res) => {
      const result = await companyCollection.find().toArray();
      res.send(result);
    });

    // main page api
    app.get("/api/jobs", async (req, res) => {
      const { search, category, jobType, country } = req.query;
      let query = {};
      if (search) {
        query.title = { $regex: search, $options: "i" }; // Case-insensitive search
      }
      if (category) query.category = category;
      if (jobType) query.jobType = jobType;
      if (country) query.country = { $regex: country, $options: "i" };
      const jobs = await jobCollection.find(query).toArray();
      res.json(jobs);
    });

    app.get("/jobs/:id", async (req, res) => {
      const { id } = req.params;
      const query = { _id: new ObjectId(id) };
      const result = await jobCollection.findOne(query);
      res.json(result);
    });
    app.post("/api/apply", async (req, res) => {
      const data = req.body;
      const newApply = {
        ...data,
        appliedAt: new Date(),
      };
      const result = await applicationCollection.insertOne(newApply);
      res.json(result);
    });
    app.get("/api/applications", async (req, res) => {
      const applicantId = req.query.applicantId;
      const result = await applicationCollection
        .find({ applicantId })
        .toArray();
      res.json(result);
    });

    // plans
    app.get("/api/plan", async (req, res) => {
      const query = {};
      if (req.query.planId) {
        query.planId = req.query.planId;
      }
      const plan = await planCollection.findOne(query);
      res.json(plan);
    });
    app.post("/new/subscription", async (req, res) => {
      const data = req.body;
      const subscriptionData = {
        ...data,
        createdAt: new Date(),
      };
      const result = await subscriptionColl.insertOne(subscriptionData);

      const filter = {
        email: data.email,
      };
      const updateUser = await user.updateOne(filter, {
        $set: { plan: data.planId },
      });
      res.send(updateUser);
    });

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
      if (query.companyId) {
        const result = await jobCollection.find(query).toArray();
        res.send(result);
      } else {
        res.json(null);
      }
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
      const company = await companyCollection.findOne(query);
      res.json(company);
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
