/**
 * a custom jest transformer turning file imports into filenames
 */

const path = require('path')
module.exports = {
  process(src, filename) {
    return `module.exports = ${JSON.stringify(
      path.basename(filename),
    )}`
  }
}
