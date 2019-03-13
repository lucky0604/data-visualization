import {connect} from 'react-redux'
import cx from 'classnames'
import React from 'react'
import PropTypes from 'prop-types'
import withStyles from 'isomorphic-style-loader/lib/withStyles'
import {
  Navbar,
  Nav,
  NavItem,
  Button,
  Dropdown,
  DropdownToggle,
  DropdownMenu,
  DropdownItem,
  Input,
  InputGroup,
  InputGroupAddon
} from 'reactstrap'

import {NavLink} from 'react-router-dom'

import Icon from '../Icon'

import photo from '../../images/photo.jpg'
import {logoutUser} from '../../actions/user'
