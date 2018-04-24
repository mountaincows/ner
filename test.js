module.exports = {
	do: function(app, connection){
		app.get('/test/:id', function(req,res){

			var query = "SELECT * FROM epas_products"
			connection.query(query, function(error, response){
				res.send(req.params.id + " - " + JSON.stringify(response) + " len: " + response.length);
				console.log("response: " + JSON.stringify(response));
			})
		})
	}
}