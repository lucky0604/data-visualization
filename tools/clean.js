import {cleanDir} from './lib/fs'

// cleans up the output (build) directory
function clean() {
  return Promise.all([
    cleanDir('build/*', {
      nosort: true,
      dot: true,
      ignore: ['build/.git']
    })
  ])
}

export default clean
