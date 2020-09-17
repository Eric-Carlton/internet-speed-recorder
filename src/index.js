const puppeteer = require('puppeteer');
const winston = require('winston');
const timestamp = generateTimestamp();
const logger = winston.createLogger({
  levels: winston.config.syslog.levels,
  format: winston.format.combine(
    winston.format.timestamp({
      format: 'YYYY-MM-DD HH:mm:ss'
    }),
    winston.format.printf(({ level, message, timestamp }) => {
      return `${timestamp} [${level}]: ${message}`;
    })
  ),
  transports: [
    new winston.transports.Console({ level: 'debug' }),
    new winston.transports.File({
      filename: `logs/${timestamp}.log`,
      level: 'debug'
    })
  ]
});

function zeroPad(num) {
  return num.toString().padStart(2, '0');
}

function generateTimestamp() {
  const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sept',
    'Oct',
    'Nov',
    'Dec'
  ];
  const now = new Date();

  const month = months[now.getMonth()];
  const day = now.getDate();
  const year = now.getFullYear();
  const hours = zeroPad(now.getHours());
  const minutes = zeroPad(now.getMinutes());
  const seconds = zeroPad(now.getSeconds());

  return `${month}-${day}-${year} ${hours}:${minutes}:${seconds}`;
}

async function main() {
  let browser;

  try {
    logger.debug('attempting to launch browser');
    browser = await puppeteer.launch({
      defaultViewport: { width: 1440, height: 700 }
    });
    logger.debug('launched browser - attempting to create page');
    const page = await browser.newPage();
    logger.debug('created page');

    await page.goto('https://www.speedtest.net');
    logger.debug('navigated to speed test - waiting for start button');

    const startBtn = await page.waitForSelector('a.js-start-test');
    logger.debug('start button found');
    startBtn.click();
    logger.info('test started');

    await page.waitForSelector('div.eot-info', {
      visible: true,
      timeout: 120000
    });
    logger.info('test completed');

    logger.debug('looking for modal close button');
    const desktopAppModalCloseBtn = await page.$('a.notification-dismiss');
    if (await desktopAppModalCloseBtn.boundingBox()) {
      logger.debug('modal close button found and visible');
      await desktopAppModalCloseBtn.click();
      logger.info('modal close button clicked');
    }

    logger.debug('generating screenshot');
    const screenshotFilename = `results/${timestamp}.png`;
    await page.screenshot({
      path: screenshotFilename
    });
    logger.info('screenshot generated, process complete');
  } catch (e) {
    logger.error(e);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

main();
