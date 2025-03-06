import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.send('Bot está activo');
});

function keepAlive() {
  app.listen(3000, () => {
    console.log('El bot está activo');
  });
}

export { keepAlive };
