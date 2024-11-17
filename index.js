const http = require('http');
const fs = require('fs').promises;
const { Command } = require('commander');
const superagent = require('superagent'); // Підключаємо superagent для запитів

const program = new Command();

program
  .requiredOption('-h, --host <type>', 'Host address')
  .requiredOption('-p, --port <number>', 'Port number', parseInt)
  .requiredOption('-c, --cache <path>', 'Cache directory path');

program.parse(process.argv);
const options = program.opts();

async function ensureCacheDir(cachePath) {
  try {
    await fs.mkdir(cachePath, { recursive: true });
  } catch (error) {
    console.error(`Error creating cache directory: ${error.message}`);
  }
}

const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  const httpCode = url.slice(1); // Витягуємо код HTTP зі шляху URL
  const filePath = `${options.cache}/${httpCode}.jpg`;

  try {
    switch (method) {
      case 'GET': // Отримати картинку
        try {
          // Перевіряємо, чи є файл у кеші
          const data = await fs.readFile(filePath);
          res.writeHead(200, { 'Content-Type': 'image/jpeg' });
          res.end(data);
        } catch {
          // Якщо файлу немає, завантажуємо з https://http.cat
          try {
            const response = await superagent.get(`https://http.cat/${httpCode}`);
            const imageData = response.body;

            // Зберігаємо картинку в кеші
            await fs.writeFile(filePath, imageData);

            res.writeHead(200, { 'Content-Type': 'image/jpeg' });
            res.end(imageData);
          } catch (error) {
            // Якщо запит до http.cat невдалий
            res.writeHead(404, { 'Content-Type': 'text/plain' });
            res.end('Not Found');
          }
        }
        break;

      default:
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method Not Allowed');
        break;
    }
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

ensureCacheDir(options.cache).then(() => {
  server.listen(options.port, options.host, () => {
    console.log(`Server running at http://${options.host}:${options.port}/`);
  });
});
