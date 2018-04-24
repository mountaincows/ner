var express = require('express');
var mysql = require('mysql');
var request = require('request');
var cors = require('cors');
var bodyParser = require('body-parser');
var postcode = require('postcode');
// Endpoints
var worldPay = require('./worldPay');
var test = require('./test');
var app = express();
app.use(bodyParser.json());

var connection = mysql.createConnection({ //create connection
	connectionLimit: 20,
	host: '77.72.1.34',
	user: 'greasesh_nathan',
	password: 'EN~ql@TxBF%B',
	database: 'greasesh_couk'
});

app.get('/', function(req,res){
	res.send("hi");
})

app.use(cors());
var port = process.env.PORT || 8080;
//Endpoints
worldPay.do(app, connection, request, postcode);
test.do(app, connection);

app.listen(port, function() {
    console.log('Our app is running on http://localhost:' + port);
});

console.log("Server started...")
