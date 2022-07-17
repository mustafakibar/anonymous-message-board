const chaiHttp = require('chai-http');
const chai = require('chai');
const assert = chai.assert;
const server = require('../server');
const { suiteTeardown } = require('mocha');

const PATH_THREAD_URL = '/api/threads';
const PATH_REPLY_URL = '/api/replies';

chai.use(chaiHttp);

suite('Functional Tests', () => {
  let TEST_THREAD_ID;
  let TEST_REPLY_ID;
  const TEST_THREAD_TEXT = 'This is a test thread';
  const TEST_REPLY_TEXT = 'This is a test reply';
  const TEST_DELETE_PASSWORD = 'kibar.pro';

  suite(`Test ${PATH_THREAD_URL}/{board}`, () => {
    test('Creating a new thread', (done) => {
      chai
        .request(server)
        .post(`${PATH_THREAD_URL}/test`)
        .send({ text: TEST_THREAD_TEXT, delete_password: TEST_DELETE_PASSWORD })
        .end((err, res) => {
          if (err) return console.error(err);

          TEST_THREAD_ID = res.body._id;

          assert.equal(res.status, 200);
          assert.equal(res.body.text, TEST_THREAD_TEXT);
          assert.equal(res.body.created_on, res.body.bumped_on);
          assert.isFalse(res.body.reported);

          // password hashed with bcrypt so it's starting with $2b$
          assert.isTrue(res.body.delete_password.startsWith('$2b$'));
          assert.isArray(res.body.replies);
          done();
        });
    });

    test('Viewing the 10 most recent threads with 3 replies each', (done) => {
      chai
        .request(server)
        .get(`${PATH_THREAD_URL}/test`)
        .end((err, res) => {
          if (err) return console.error(err);

          assert.equal(res.status, 200);
          assert.isArray(res.body[0].replies, 'replies is array');
          assert.isAtMost(res.body.length, 10);
          assert.notProperty(res.body[0], 'delete_password');
          assert.notProperty(res.body[0], 'reported');
          res.body.forEach((thread) =>
            assert.isAtMost(thread.replies.length, 3)
          );
          done();
        });
    });

    test('Reporting a thread', (done) => {
      chai
        .request(server)
        .put(`${PATH_THREAD_URL}/test`)
        .send({ thread_id: TEST_THREAD_ID })
        .end((err, res) => {
          if (err) return console.error(err);

          assert.equal(res.status, 200);
          assert.equal(res.text, 'reported');
          done();
        });
    });

    test('Deleting a thread with the incorrect password', (done) => {
      chai
        .request(server)
        .delete(`${PATH_THREAD_URL}/test`)
        .send({ thread_id: TEST_THREAD_ID, delete_password: 'wrong' })
        .end((err, res) => {
          if (err) return console.error(err);

          assert.equal(res.status, 200);
          assert.equal(res.text, 'incorrect password');
          done();
        });
    });

    test('Deleting a thread with the correct password', (done) => {
      chai
        .request(server)
        .delete(`${PATH_THREAD_URL}/test`)
        .send({
          thread_id: TEST_THREAD_ID,
          delete_password: TEST_DELETE_PASSWORD,
        })
        .end((err, res) => {
          if (err) return console.error(err);

          assert.equal(res.status, 200);
          assert.equal(res.text, 'success');
          done();
        });
    });

    suiteTeardown(async () => {
      const { body } = await chai
        .request(server)
        .post(`${PATH_THREAD_URL}/test`)
        .send({
          text: TEST_THREAD_TEXT,
          delete_password: TEST_DELETE_PASSWORD,
        });

      TEST_THREAD_ID = body._id;
    });
  });

  suite(`Test ${PATH_REPLY_URL}/{board}`, () => {
    test('Creating a new reply', (done) => {
      chai
        .request(server)
        .post(`${PATH_REPLY_URL}/test`)
        .send({
          thread_id: TEST_THREAD_ID,
          text: TEST_REPLY_TEXT,
          delete_password: TEST_DELETE_PASSWORD,
        })
        .end((err, res) => {
          if (err) return console.error(err);

          assert.equal(res.status, 200);
          const replies = res.body.replies;
          TEST_REPLY_ID = replies[replies.length - 1]._id;
          assert.equal(replies[0].text, TEST_REPLY_TEXT);
          assert.isFalse(replies[0].reported);

          // password hashed with bcrypt so it's starting with $2b$
          assert.isTrue(replies[0].delete_password.startsWith('$2b$'));
          done();
        });
    });

    test('Viewing a single thread with all replies', (done) => {
      chai
        .request(server)
        .get(`${PATH_REPLY_URL}/test`)
        .send({ thread_id: TEST_THREAD_ID })
        .end((err, res) => {
          if (err) return console.error(err);

          assert.equal(res.status, 200);
          assert.equal(res.body._id, TEST_THREAD_ID);
          assert.equal(res.body.text, TEST_THREAD_TEXT);
          const replies = res.body.replies;
          assert.isArray(replies);
          done();
        });
    });

    test('Reporting a reply', (done) => {
      chai
        .request(server)
        .put(`${PATH_REPLY_URL}/test`)
        .send({ thread_id: TEST_THREAD_ID, reply_id: TEST_REPLY_ID })
        .end((err, res) => {
          if (err) return console.error(err);

          assert.equal(res.status, 200);
          assert.equal(res.text, 'reported');
          done();
        });
    });

    test('Deleting a reply with the incorrect password', (done) => {
      chai
        .request(server)
        .delete(`${PATH_REPLY_URL}/test`)
        .send({
          thread_id: TEST_THREAD_ID,
          reply_id: TEST_REPLY_ID,
          delete_password: 'wrong',
        })
        .end((err, res) => {
          if (err) return console.error(err);

          assert.equal(res.status, 200);
          assert.equal(res.text, 'incorrect password');
          done();
        });
    });

    test('Deleting a reply with the correct password', (done) => {
      chai
        .request(server)
        .delete(`${PATH_REPLY_URL}/test`)
        .send({
          thread_id: TEST_THREAD_ID,
          reply_id: TEST_REPLY_ID,
          delete_password: TEST_DELETE_PASSWORD,
        })
        .end((err, res) => {
          if (err) return console.error(err);

          assert.equal(res.status, 200);
          assert.equal(res.text, 'success');
          done();
        });
    });

    suiteTeardown(async () => {
      await chai.request(server).delete(`${PATH_THREAD_URL}/test`).send({
        thread_id: TEST_THREAD_ID,
        delete_password: TEST_DELETE_PASSWORD,
      });
    });
  });
});
