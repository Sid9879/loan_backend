const mongoose = require('mongoose');
const CategoryLoan = new mongoose.Schema({
    name:{
        type:String
    }
},{timestamps:true});
CategoryLoan.index({name:"text"})
module.exports = mongoose.model('loanCategory',CategoryLoan)