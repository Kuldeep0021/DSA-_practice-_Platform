const seed = async () => {
  try {
    const res = await fetch('http://localhost:3000/api/seed', { method: 'POST' });
    const text = await res.text();
    console.log('STATUS', res.status);
    console.log('BODY', text);
  } catch (e) {
    console.error('ERROR', e.message || e);
  }
};

const createDemo = async () => {
  try {
    const res = await fetch('http://localhost:3000/api/create-demo-user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'demo@dsa-verse.test', password: 'password123' }),
    });
    const text = await res.text();
    console.log('STATUS', res.status);
    console.log('BODY', text);
  } catch (e) {
    console.error('ERROR', e.message || e);
  }
};

(async () => {
  console.log('\n--- CALL /api/seed ---');
  await seed();
  console.log('\n--- CALL /api/create-demo-user ---');
  await createDemo();
})();
