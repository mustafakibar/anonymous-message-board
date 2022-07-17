'use strict';

const { Board, Thread, Reply } = require('../db');
const bcrypt = require('bcrypt');

module.exports = (app) => {
  const hashPassword = async (password) => {
    return await bcrypt.hash(password, await bcrypt.genSalt(10));
  };

  const createThreadPayload = (thread) => ({
    _id: thread._id,
    text: thread.text,
    created_on: thread.created_on,
    bumped_on: thread.bumped_on,
  });

  const createReplyPayload = (reply) => ({
    _id: reply._id,
    text: reply.text,
    created_on: reply.created_on,
  });

  app
    .route('/api/threads/:board')
    .get(async (req, res) => {
      try {
        const { board } = req.params;

        const foundBoard = await Board.findOne({ name: board });
        const threads = foundBoard.threads
          .sort((t1, t2) => t2.bumped_on - t1.bumped_on)
          .slice(0, 10)
          .map((thread) => {
            const replies = thread.replies
              .sort((r1, r2) => r2.bumped_on - r1.bumped_on)
              .slice(0, 3)
              .map((reply) => createReplyPayload(reply));

            return {
              ...createThreadPayload(thread),
              replies,
              reply_count: replies.length,
            };
          });

        res.json(threads);
      } catch (err) {
        res.send(err.message);
      }
    })
    .post(async (req, res) => {
      try {
        const { board } = req.params;
        const { text, delete_password } = req.body;

        const date = Date.now();
        const thread = new Thread({
          text,
          created_on: date,
          bumped_on: date,
          delete_password: await hashPassword(delete_password),
        });

        await Board.findOneAndUpdate(
          { name: board },
          { $addToSet: { threads: thread } },
          { new: true, upsert: true, returnDocument: 'after' }
        );

        res.json(thread);
      } catch (err) {
        res.send(err.message);
      }
    })
    .put(async (req, res) => {
      try {
        const { board } = req.params;
        const { thread_id } = req.body;

        await Board.findOneAndUpdate(
          { name: board },
          { id: thread_id, $set: { reported: true } }
        );

        res.send('reported');
      } catch (err) {
        res.send(err.message);
      }
    })
    .delete(async (req, res) => {
      try {
        const { board } = req.params;
        const { thread_id, delete_password } = req.body;

        const foundBoard = await Board.findOne({
          name: board,
          'threads._id': thread_id,
        });
        if (!foundBoard || !foundBoard.threads) {
          return res.send('thread not found');
        }

        const isCorrectPassword = await bcrypt.compare(
          delete_password,
          foundBoard.threads.id(thread_id).delete_password
        );

        if (!isCorrectPassword) {
          return res.send('incorrect password');
        }

        const result = await Board.deleteOne(
          { name: board },
          { id: thread_id }
        );

        if (result.deletedCount === 0) {
          res.send('unable to delete thread');
        } else {
          res.send('success');
        }
      } catch (err) {
        res.send(err.message);
      }
    });

  app
    .route('/api/replies/:board')
    .get(async (req, res) => {
      try {
        const { board, thread_id } = {
          ...req.params,
          ...req.body,
          ...req.query,
        };

        const foundBoard = await Board.findOne({ name: board });
        if (!foundBoard || !foundBoard.threads) {
          return res.send('thread not found');
        }

        const thread = foundBoard.threads.id(thread_id);

        res.json({
          ...createThreadPayload(thread),
          replies: [
            ...thread.replies.map((reply) => createReplyPayload(reply)),
          ],
        });
      } catch (err) {
        console.error(err);
        res.send(err.message);
      }
    })
    .post(async (req, res) => {
      try {
        const { board } = req.params;
        const { text, thread_id, delete_password } = req.body;

        const foundBoard = await Board.findOne({ name: board });
        if (!foundBoard || !foundBoard.threads) {
          return res.send('thread not found');
        }

        const thread = foundBoard.threads.id(thread_id);

        const date = Date.now();
        const newReply = new Reply({
          text,
          created_on: date,
          bumped_on: date,
          delete_password: await hashPassword(delete_password),
        });

        thread.bumped_on = date;
        thread.replies.push(newReply);
        await foundBoard.save();

        res.json(thread);
      } catch (err) {
        res.send(err.message);
      }
    })
    .put(async (req, res) => {
      try {
        const { board } = req.params;
        const { thread_id, reply_id } = req.body;

        await Board.findOneAndUpdate(
          { name: board },
          { id: thread_id, 'replies._id': reply_id },
          { $set: { 'replies.$.reported': true } }
        );

        res.send('reported');
      } catch (err) {
        res.send(err.message);
      }
    })
    .delete(async (req, res) => {
      try {
        const { board } = req.params;
        const { thread_id, reply_id, delete_password } = req.body;

        const foundBoard = await Board.findOne({
          name: board,
          'threads._id': thread_id,
        });

        if (!foundBoard || !foundBoard.threads) {
          return res.send('thread not found');
        }

        const reply = foundBoard.threads.id(thread_id).replies.id(reply_id);
        if (!reply) {
          return res.send('reply not found');
        }

        const isCorrectPassword = await bcrypt.compare(
          delete_password,
          reply.delete_password
        );

        if (!isCorrectPassword) {
          return res.send('incorrect password');
        }

        reply.text = '[deleted]';
        await foundBoard.save();
        res.send('success');
      } catch (err) {
        res.send(err.message);
      }
    });
};
