const request = require('supertest');
const app = require('./app');

test('GET /health returns UP', async () => {
  const res = await request(app).get('/health');
  expect(res.statusCode).toBe(200);
  expect(res.body.status).toBe('UP');
});

test('POST /shorten without url returns 400', async () => {
  const res = await request(app).post('/shorten').send({});
  expect(res.statusCode).toBe(400);
});

test('POST /shorten with a bad url returns 400', async () => {
  const res = await request(app).post('/shorten').send({ url: 'not-a-url' });
  expect(res.statusCode).toBe(400);
});
