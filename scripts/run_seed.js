const http = require('http');

function post(path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };

    const req = http.request(options, (res) => {
      let buf = '';
      res.on('data', (c) => (buf += c));
      res.on('end', () => resolve({ status: res.statusCode, body: buf }));
    });

    req.on('error', (err) => reject(err));
    if (data) req.write(data);
    req.end();
  });
}

(async () => {
  try {
    const create = await post('/api/create-demo-user', { email: 'demo@dsa-verse.test', password: 'password123' });
    console.log('CREATE-DEMO-USER', create.status);
    console.log(create.body);

    const seed = await post('/api/seed');
    console.log('SEED', seed.status);
    console.log(seed.body);
  } catch (e) {
    console.error('ERROR', e && e.message ? e.message : e);
    process.exitCode = 1;
  }
})();
