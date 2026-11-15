// Shared by the tests: where the built page is, and how to start the browser.
const { chromium, devices } = require('playwright');
const path = require('path'), fs = require('fs');
const file = path.join(__dirname, '..', 'out', 'preview.html');
if (!fs.existsSync(file)) { console.error('No built page. Run: sh build.sh'); process.exit(2); }
async function launch() {
  const proxy = process.env.HTTPS_PROXY || process.env.https_proxy;
  return chromium.launch(proxy ? { proxy: { server: proxy } } : {});
}
module.exports = { PAGE: 'file://' + file, launch, devices };
