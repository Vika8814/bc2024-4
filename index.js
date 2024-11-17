const http = require('http');
const fs = require('fs').promises; // Модуль fs для роботи з файлами
const { Command } = require('commander');

const program = new Command();

program
  .requiredOption('-h, --host <type>', 'Host address')
  .requiredOption('-p, --port <number>', 'Port number', parseInt)
  .requiredOption('-c, --cache <path>', 'Cache directory path');

program.parse(process.argv);
const options = program.opts();

// Функція для створення кешу, якщо його ще немає
async function ensureCacheDir(cachePath) {
  try {
    await fs.mkdir(cachePath, { recursive: true });
  } catch (error) {
    console.error(`Error creating cache directory: ${error.message}`);
  }
}

// HTTP сервер
const server = http.createServer(async (req, res) => {
  const { method, url } = req;

  // Витягуємо код із URL
  const httpCode = url.slice(1); // Наприклад: '/200' -> '200'
  const filePath = `${options.cache}/${httpCode}.jpg`;

  try {
    switch (method) {
      case 'GET': // Отримати картинку
        try {
          const data = await fs.readFile(filePath);
          res.writeHead(200, { 'Content-Type': 'image/jpeg' });
          res.end(data);
        } catch {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        }
        break;

      case 'PUT': // Записати картинку
        let body = [];
        req.on('data', chunk => body.push(chunk));
        req.on('end', async () => {
          try {
            await fs.writeFile(filePath, Buffer.concat(body));
            res.writeHead(201, { 'Content-Type': 'text/plain' });
            res.end('Created');
          } catch (error) {
            res.writeHead(500, { 'Content-Type': 'text/plain' });
            res.end('Internal Server Error');
          }
        });
        break;

      case 'DELETE': // Видалити картинку
        try {
          await fs.unlink(filePath);
          res.writeHead(200, { 'Content-Type': 'text/plain' });
          res.end('Deleted');
        } catch {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Not Found');
        }
        break;

      default: // Метод не дозволено
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end('Method Not Allowed');
        break;
    }
  } catch (error) {
    res.writeHead(500, { 'Content-Type': 'text/plain' });
    res.end('Internal Server Error');
  }
});

// Старт сервера
ensureCacheDir(options.cache).then(() => {
  server.listen(options.port, options.host, () => {
    console.log(`Server running at http://${options.host}:${options.port}/`);
  });
});
