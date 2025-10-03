import params from '../../params.js'
import { start } from './index.js'

start(params.server).then(() => {
  console.log('Server is ready to play Tetris with you!')
}).catch((err) => {
  console.error('Failed to start server:', err)
})
