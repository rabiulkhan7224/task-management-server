import express from "express";
import { MongoClient, ObjectId, ServerApiVersion } from "mongodb";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();
const app = express();
app.use(express.json());
app.use(cors());
const PORT = process.env.PORT || 5000;


// const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = `mongodb+srv://${process.env.MONGO_DB}:${process.env.MONGO_PASS}@cluster0.ur2yo.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        const database = client.db("taskManager");
        const tasksCollection = database.collection("tasks");


        // Get All Tasks
        app.get("/api/tasks", async (req, res) => {
            try {
                const tasks = await tasksCollection.find().sort({ order: 1 }).toArray();
                res.json(tasks);
            } catch (error) {
                console.error("Error fetching tasks:", error);
                res.status(500).json({ message: "Error fetching tasks", error });
            }
        });

        // Add Task
        app.post("/api/tasks", async (req, res) => {
            try {
                const { title, description, category } = req.body;
                const count = await tasksCollection.countDocuments();
                const newTask = {
                    title,
                    description,
                    category,
                    timestamp: new Date(),
                    order: count, // Maintain order
                };

                const result = await tasksCollection.insertOne(newTask);
                res.status(201).json({ ...newTask, _id: result.insertedId });
            } catch (error) {
                console.error("Error adding task:", error);
                res.status(500).json({ message: "Error adding task", error });
            }
        });




        app.put("/api/tasks/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const updatedTask = req.body;



                delete updatedTask._id;

                const result = await tasksCollection.updateOne(
                    { _id: new ObjectId(id) },
                    { $set: updatedTask },
                    { upsert: true }
                );


                res.json({ message: "Task updated", result });
            } catch (error) {
                res.status(500).json({ message: "Error updating task", error });
            }
        });

        // Delete Task
        app.delete("/api/tasks/:id", async (req, res) => {
            try {
                const { id } = req.params;
                const result = await tasksCollection.deleteOne({ _id: new ObjectId(id) });

                if (result.deletedCount === 0) {
                    return res.status(404).json({ message: "Task not found" });
                }

                res.json({ message: "Task deleted" });
            } catch (error) {
                console.error("Error deleting task:", error);
                res.status(500).json({ message: "Error deleting task", error });
            }
        });

        // Reorder Tasks (Drag & Drop)
        app.put("/api/tasks/reorder", async (req, res) => {
            try {
                const { tasks } = req.body;

                if (!tasks || !Array.isArray(tasks)) {
                    return res.status(400).json({ message: "Invalid task data" });
                }

                const bulkOps = tasks.map((task, index) => ({
                    updateOne: {
                        filter: { _id: new ObjectId(task._id) },
                        update: { $set: { order: index, category: task.category } },
                    },
                }));

                await tasksCollection.bulkWrite(bulkOps);
                res.json({ message: "Tasks reordered successfully" });
            } catch (error) {
                console.error("Error reordering tasks:", error);
                res.status(500).json({ message: "Error reordering tasks", error });
            }
        });



        // Send a ping to confirm a successful connection
        // await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Server running taskpad')
})

app.listen(PORT, async () => {
    //   await client.connect();
    console.log(`Server running on port ${PORT}`);
});