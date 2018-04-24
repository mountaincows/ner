var express = require('express');
var mysql = require('mysql');
var request = require('request');
var cors = require('cors');
var bodyParser = require('body-parser');
var postcode = require('postcode');
// Endpoints
var worldPay = require('./worldPay');
//var test = require('./test');
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

app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", '*');
    res.header("Access-Control-Allow-Credentials", true);
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header("Access-Control-Allow-Headers", 'Origin,X-Requested-With,Content-Type,Accept,content-type,application/json');
    next();
});
var port = process.env.PORT || 8080;
//Endpoints
worldPay.do(app, connection, request, postcode);
//test.do(app, connection);


app.get('/test/:id', function(req,res){
	res.send(req.params.id);
	var query = "SELECT * FROM epas_products";
	connection.query(query, function(error, response){
//		res.send(req.params.id + " - " + JSON.stringify(response) + " len: " + response.length);
//		console.log("response: " + JSON.stringify(response));
	})
})

app.listen(port, function() {
    console.log('Our app is running on http://localhost:' + port);
});

console.log("Server started...")
