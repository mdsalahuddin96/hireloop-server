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
    const userCollection = db.collection("user");
    const sessionCollection = db.collection("session");

    // Token verification related
    const verifyToken = async (req, res, next) => {
      const authHeaders = req.headers?.authorization;
      const token = authHeaders.split(" ")[1];
      if (!authHeaders) {
        res.status(401).send({ message: "Unauthorized access" });
      }
      if (!token) {
        res.status(401).send({ message: "Unauthorized access" });
      }
      const session = await sessionCollection.findOne({
        token: token,
      });
      const userId = session?.userId;
      const user = await userCollection.findOne({ _id: userId });
      req.user = user;
      next();
    };

    // must be use after verifyToken
    const verifyAdmin = async (req, res, next) => {
      const user = req.user;
      if (!user.role === "admin") {
        return res.status(403).send({ message: "Forbidden user" });
      }
      next();
    };

    const verifySeeker = async (req, res, next) => {
      const user = req.user;
      if (!user.role === "seeker") {
        return res.status(403).send({ message: "Forbidden user" });
      }
      next();
    };
    // main page api
    app.get("/recruiter", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });
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
    app.get("/api/applications", verifyToken,verifySeeker, async (req, res) => {
      const applicantId = req.query.applicantId;
      if(req.user._id.toString()!==applicantId){
        return res.status(403).send({message:"Forbidden Access"})
      }
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
      const updateUser = await userCollection.updateOne(filter, {
        $set: { plan: data.planId },
      });
      res.send(updateUser);
    });

    // company related api
    app.get("/api/companies", verifyToken, verifyAdmin, async (req, res) => {
      const cursor = companyCollection.aggregate([
        {
          $lookup: {
            from: "jobs",
            let: {
              cId: { $toString: "$_id" },
            },
            pipeline: [
              {
                $match: {
                  $expr: {
                    $eq: ["$companyId", "$$cId"],
                  },
                },
              },
            ],
            as: "jobs",
          },
        },
        {
          $addFields: {
            jobCount: {
              $size: "$jobs",
            },
          },
        },
        {
          $project: {
            jobs: 0,
          },
        },
      ]);
      const companies = await cursor.toArray();
      res.send(companies);
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

    app.patch("/api/updateCompany/:id", async (req, res) => {
      const { id } = req.params;
      const data = await req.body;
      const filter = {
        _id: new ObjectId(id),
      };
      const updateData = {
        $set: data,
      };
      const result = await companyCollection.updateOne(filter, updateData);
      res.json(result);
    });

    app.get("/api/my/companies", async (req, res) => {
      const query = {};
      if (req.query.recruiterId) {
        query.recruiterId = req.query.recruiterId;
      }
      const company = await companyCollection.findOne(query);
      res.json(company);
    });
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
