const BaseController = require('../core/BaseController');
const Banner = require('../models/Banner');
const config = require('../config');

const bannerController = new BaseController(Banner, {
  name: 'banner',
  access: 'admin',
  get: {
    pagination: config.pagination,
    query:["isPublished"],
  },
});

module.exports = bannerController;