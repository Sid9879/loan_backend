require('dotenv').config();
const config = {
    database: {
        dbConnectionString:process.env.MONGODB_CONNECTION_STRING
    },
    http: {
        port: 80
    },
    pagination:{
        limit:10,
        maxLimit:500
    },
    jwtSecret: {
        jwtSecret:process.env.JWT_SECRET,
        expiresIn: "10d"
    },
      wordpress: {
        baseUrl: "https://image.devloperhemant.com",
        username: "admin",
        appPassword: process.env.WORDPRESS_APP_PASSWORD
    }
    
};

module.exports = config;