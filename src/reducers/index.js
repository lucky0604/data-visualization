import {combineReducers} from 'redux'

import auth from './auth'
import navigation from './navigation'
import posts from './posts'
import runtime from './runtime'

export default combineReducers({
  auth,
  runtime,
  posts,
  navigation
})
