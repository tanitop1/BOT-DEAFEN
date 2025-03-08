import express from 'express';

const app = express();

app.all('/', (req, res) => {
  res.send('Bot is running');
});

const keepAlive = () => {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
};

export { keepAlive };