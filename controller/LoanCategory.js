const BaseController = require('../core/BaseController');
const LoanCategory = require('../models/CategoryLoan');
const config = require('../config');

const loanCategoryController = new BaseController(LoanCategory,{
    name:"Category",
    get:{
        pagination:config.pagination,
        searchFields:["name"]
    },
});
module.exports = loanCategoryController;