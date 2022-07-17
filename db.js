const mongoose = require('mongoose');
const { Schema } = mongoose;

var db;
const connect = async () => {
  try {
    db = await mongoose.connect(process.env.DB, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('DB connected');
  } catch (err) {
    console.log('Failed to connect to DB', err);
  }

  return db;
};

const defaultDate = () => Date.now();

const replySchema = new Schema({
  text: String,
  created_on: { type: Date, default: defaultDate },
  bumped_on: { type: Date, default: defaultDate },
  reported: {
    type: Boolean,
    default: false,
  },
  delete_password: String,
});

const threadSchema = new Schema({
  text: String,
  created_on: { type: Date, default: defaultDate },
  bumped_on: { type: Date, default: defaultDate },
  reported: {
    type: Boolean,
    default: false,
  },
  delete_password: String,
  replies: [replySchema],
});

const boardSchema = new Schema({ name: String, threads: [threadSchema] });

const Reply = mongoose.model('Reply', replySchema);
const Thread = mongoose.model('Thread', threadSchema);
const Board = mongoose.model('Board', boardSchema);

module.exports = { connect, db, Reply, Thread, Board };
