const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const mongoose = require("mongoose");

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("connect db"))
  .catch(err => console.log(err));

const userSchema = new mongoose.Schema({
  username: {
    required: true,
    type: String
  }
}, { timestamps: false, versionKey: false });

const User = mongoose.model("User", userSchema);

const exerciseSchema = new mongoose.Schema({
  user_id: {
    required: true,
    type: String
  },
  description: {
    required: true,
    type: String
  },
  duration: {
    required: true,
    type: Number
  },
  date: {
    required: true,
    type: Date
  },
}, { timestamps: false, versionKey: false });

const Exercise = mongoose.model("Exercise", exerciseSchema);

app.post("/api/users", (req, res) => {
  const { username } = req.body;

  const user = new User({
    username: username
  });

  user.save()
    .then(result => {
      return res.json(result);
    }).catch(e => {
      return res.json(e);
    });
});

app.get("/api/users", (req, res) => {
  User.find()
    .then(result => {
      return res.json(result);
    }).catch(e => {
      return res.json(e);
    });
});

app.post("/api/users/:_id/exercises", async (req, res) => {
  const id = req.params._id;
  const { description, duration, date } = req.body;

  const user = await User.findById(id);
  if (!user) {
    return res.json({
      error: "user not found"
    });
  }

  try {
    const newExercise = new Exercise({
      user_id: id,
      date: date ?? new Date(),
      description: description,
      duration: duration
    });

    const exercise = await newExercise.save();
    return res.json({
      _id: exercise._id,
      username: user.username,
      date: new Date(exercise.date).toDateString(),
      duration: exercise.duration,
      description: exercise.description
    });
  } catch (e) {
    console.log(e);
    return res.send("Error in proccess");
  }
});

app.get("/api/users/:_id/logs", async (req, res) => {
  const { from, limit, to } = req.query;
  const id = req.params._id;
  const user = await User.findById(id);
  if (!user) {
    return res.send("User not found");
  }

  let pipeLine = {};
  if (from) pipeLine["$gte"] = new Date(from);
  if (to) pipeLine["$lte"] = new Date(to);

  let filterPipe = {
    user_id: id
  };

  if (from || to) filterPipe.date = pipeLine;

  const exercises = await Exercise.find(filterPipe).limit(parseInt(limit) ?? 250);
  const logs = exercises.map(e => ({
    description: e.description,
    duration: e.duration,
    date: e.date.toDateString()
  }));

  return res.json({
    username: user.username,
    count: exercises.length,
    _id: user._id,
    log: logs
  });
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});
