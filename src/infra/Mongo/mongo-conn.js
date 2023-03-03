"use strict";
const mongoose = require("mongoose");
require('dotenv').config();
const URI = process.env.MONGO_URL;
const options = {
     // bufferMaxEntries: 0,
     autoIndex: false,
     // poolSize: 5,
     useNewUrlParser: true,
     // useCreateIndex: true,
     // useFindAndModify: false,
     useUnifiedTopology: true
};
// mongoose.set('useFindAndModify', false);
// mongoose.set('useNewUrlParser', true);
// mongoose.set('useCreateIndex', true);
console.log(URI)
mongoose.connect(URI.toString(), options).then(() => {
     console.info(`Successful connected to mongo `, { scope: 'startup' })

}).catch(err => {
     console.error(`Error while connectting to mongo on`, err, { scope: 'startup' })
     process.exit(1)
})



module.exports = mongoose;