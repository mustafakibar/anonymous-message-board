'use strict';

const { Board, Thread, Reply } = require('../db');
const bcrypt = require('bcrypt');

module.exports = (app) => {
  const hashPassword = async (password) => {
    const salt = await bcrypt.genSalt(10);
    return await bcrypt.hash(password, salt);
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
    reported: reply.reported,
  });

  const getBoardOrThrow = async (name) => {
    const board = await Board.findOne({ name });
    if (!board) {
      throw new Error('Board not found');
    }

    return board;
  };

  const getThreadFromBoardOrThrow = async (board, threadId) => {
    const thread = board.threads.id(threadId);
    if (!thread) {
      throw new Error('Thread not found');
    }

    return thread;
  };

  const getReplyFromThreadThrow = async (thread, replyId) => {
    const reply = thread.replies.id(replyId);
    if (!reply) {
      throw new Error('Reply not found');
    }

    return reply;
  };

  app
    .route('/api/threads/:board')
    .get(async (req, res) => {
      try {
        const { board } = req.body;

        const foundBoard = await getBoardOrThrow(board);
        const threads = foundBoard.threads
          .sort((t1, t2) => t2.bumped_on - t1.bumped_on)
          .map((thread) => {
            const replies = thread.replies
              .sort((r1, r2) => r2.created_on - r1.created_on)
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
        const { board, text, delete_password } = req.body;

        const thread = await Thread.create({
          text,
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
        const { board, thread_id } = req.body;

        const foundBoard = await getBoardOrThrow(board);
        const foundThread = await getThreadFromBoardOrThrow(
          foundBoard,
          thread_id
        );

        if (foundThread.reported) {
          res.send('Thread already reported');
        } else {
          foundThread.reported = true;
          await foundBoard.save();
          res.send('Thread reported');
        }
      } catch (err) {
        res.send(err.message);
      }
    })
    .delete(async (req, res) => {
      try {
        const { board, thread_id, delete_password } = req.body;

        const foundBoard = await getBoardOrThrow(board);
        const foundThread = await getThreadFromBoardOrThrow(
          foundBoard,
          thread_id
        );

        const isValidPassword = await bcrypt.compare(
          delete_password,
          foundThread.delete_password
        );
        if (!isValidPassword) {
          res.send('Incorrect password');
        } else {
          foundThread.remove();
          await foundBoard.save();
          res.send('Thread deleted');
        }
      } catch (err) {
        res.send(err.message);
      }
    });

  app
    .route('/api/replies/:board')
    .get(async (req, res) => {
      try {
        const { board, thread_id } = req.body;

        const foundBoard = await getBoardOrThrow(board);
        const foundThread = await getThreadFromBoardOrThrow(
          foundBoard,
          thread_id
        );

        res.json({
          ...createThreadPayload(foundThread),
          ...foundThread.replies.map((reply) => createReplyPayload(reply)),
        });
      } catch (err) {
        res.send(err.message);
      }
    })
    .post(async (req, res) => {
      try {
        const { board, text, thread_id, delete_password } = req.body;

        const foundBoard = await getBoardOrThrow(board);
        const foundThread = await getThreadFromBoardOrThrow(
          foundBoard,
          thread_id
        );

        const newReply = new Reply({
          text,
          delete_password: await hashPassword(delete_password),
          created_on: Date.now(),
        });

        foundThread.bumped_on = newReply.created_on;
        foundThread.replies.push(newReply);
        await foundBoard.save();

        res.json(foundThread);
      } catch (err) {
        res.send(err.message);
      }
    })
    .put(async (req, res) => {
      try {
        const { board, thread_id, reply_id } = req.body;

        const foundBoard = await getBoardOrThrow(board);
        const foundThread = await getThreadFromBoardOrThrow(
          foundBoard,
          thread_id
        );
        const foundReply = await getReplyFromThreadThrow(foundThread, reply_id);
        if (foundReply.reported) {
          res.send('Reply already reported');
        } else {
          foundReply.reported = true;
          await foundBoard.save();
          res.send('Reply reported');
        }
      } catch (err) {
        res.send(err.message);
      }
    })
    .delete(async (req, res) => {
      try {
        const { board, thread_id, reply_id, delete_password } = req.body;

        const foundBoard = await getBoardOrThrow(board);
        const foundThread = await getThreadFromBoardOrThrow(
          foundBoard,
          thread_id
        );
        const foundReply = await getReplyFromThreadThrow(foundThread, reply_id);

        const isValidPassword = await bcrypt.compare(
          delete_password,
          foundReply.delete_password
        );
        if (!isValidPassword) {
          return res.send('Incorrect password');
        }

        foundReply.text = '[deleted]';
        await foundBoard.save();
        res.send('Reply deleted');
      } catch (err) {
        res.send(err.message);
      }
    });
};
