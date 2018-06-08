var express = require('express');
var mysql = require('mysql');
var request = require('request');
var cors = require('cors');
var bodyParser = require('body-parser');
var postcode = require('postcode');
// Endpoints
var newPay = require('./new');

var app = express();
app.use(bodyParser.json());

var connection = mysql.createConnection({ //create connection
	connectionLimit: 20,
	host: '77.72.1.34',
	user: 'greasesh_nathan',
	password: 'EN~ql@TxBF%B',
	database: 'greasesh_couk'
});

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", '*');
    res.header("Access-Control-Allow-Credentials", true);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
    next();
});

var port = process.env.PORT || 8080;

newPay(app, connection, request, postcode);

app.listen(port, function() {
    console.log('Our app is running on http://localhost:' + port);
});

console.log("Server started...")
