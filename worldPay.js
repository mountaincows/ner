module.exports = {

	do: function (app, connection, request, postcode) {
		app.post('/postdata', function (req, res) {
			function dcc(a) { // function to work out delivery cost: every 15 units we charge £15. so 16 units = £30, 1 units = £15
				return (Math.ceil(a / 15) * 15);
			}
			var body = req.body;
			//information:
			var first_name = body.first_name,
				last_name = body.last_name,
				business = body.business,
				d_addr1 = body.deliveryAddress.address1,
				d_addr2 = body.deliveryAddress.address2,
				d_pc = body.deliveryAddress.postalCode,
				d_city = body.deliveryAddress.city,
				b_addr1 = body.billingAddress.address1,
				b_addr2 = body.billingAddress.address2,
				b_pc = body.billingAddress.postalCode,
				b_city = body.billingAddress.city,
				name = first_name + " " + last_name,
				expiryMonth = body.payment.expiryMonth,
				expiryYear = Number(body.payment.expiryYear),
				cardNumber = body.payment.cardNumber,
				cvc = body.payment.cvc,
				email = body.email,
				phone = body.phone,
				userid = 0,
				order = req.body.order,
				orderlength = order.length,
				objArr = [],
				contArr = [],
				sumTotal = 0,
				deliveryTotal = 0,
				whenThen = "",
				getCost = "",
				orderDesc = "";

			// id1, id2, id3, id4 (used to get costs with sql query);
			for (var i = 0; i < orderlength; i++) {

				whenThen += "WHEN " + order[i].id + " THEN " + (i + 1) + " ";
				if (i == orderlength - 1) {
					getCost += order[i].id;
				} else {
					getCost += order[i].id + ",";
				}
			}

			var pcode = new postcode(d_pc);
			if (pcode.valid() != true) {
				res.send({
					information: "postcode is not valid in the UK"
				});

				return;
			}

			var query = "SELECT uid,cost,name,delivery_unit from epas_products WHERE uid in (" + getCost + ") ORDER BY (CASE uid " + whenThen + " END)";

			try {
				connection.query(query, function (error, results) {

					console.log(JSON.stringify(req.body.order) + "\r\n" + results);
					if (error) throw error;

					if (results.length == 0 || results.length != orderlength) {
						res.status(400).send({
							information: "payment error",
							payment: "ERROR"
						});
						return;
					}
					for (var i = 0; i < orderlength; i++) { //contArr is used to post to db order_status
						if (order[i].quantity >= 1) { //check that order quantity gte 1
							objArr.push({
								id: order[i].id,
								quantity: order[i].quantity,
								cost_pu: results[i].cost,
								cost_total: (order[i].quantity * results[i].cost)
							});
							contArr.push({
								name: results[i].name,
								id: order[i].id,
								quantity: order[i].quantity,
								cost_pu: results[i].cost,
								cost_total: (order[i].quantity * results[i].cost),
								delivery_unit: results[i].delivery_unit
							});
						}
					}
					console.log(contArr);
					for (var i = 0; i < objArr.length; i++) {
						sumTotal += objArr[i].cost_total;
						deliveryTotal += contArr[i].quantity * Number(contArr[i].delivery_unit);
						orderDesc += (i + 1) + ") " + contArr[i].name + " x " + contArr[i].quantity + " = " + (Number(contArr[i].cost_pu) * Number(contArr[i].quantity)).toFixed(2) + "\r\n";
					}
					orderDesc += "Total pre-delivery: " + sumTotal.toFixed(2) + "\r\n" + "Delivery: " + dcc(deliveryTotal) + "\r\nTotal: " + (Number(sumTotal.toFixed(2)) + dcc(deliveryTotal));
					console.log(orderDesc);
					var jsonObj = { //obj to send off to WorldPay
						"paymentMethod": {
							"type": "Card",
							"name": name,
							"expiryMonth": expiryMonth,
							"expiryYear": expiryYear,
							"cardNumber": cardNumber,
							"cvc": cvc,
							"issueNumber": "1"
						},
						"orderType": "ECOM",
						"orderDescription": orderDesc,
						"customerOrderCode": 123,
						"amount": dcc(Number(deliveryTotal)) * 100 + Math.round(sumTotal * 100),
						"currencyCode": "GBP"
					}

					request({ // POST REQUEST TO WORLDPAY
						url: "https://api.worldpay.com/v1/orders",
						method: "POST",
						json: true,
						headers: {
							"Content-Type": "application/json",
							"Authorization": "T_S_73c02fe7-f9f6-4d07-a594-9d1774181890"

						},
						body: jsonObj
					}, function (error2, response2, body2) {


						switch (response2.body.paymentStatus) { //SWITCH OUT THE RESPONSE FROM WORLDPAY
							case "SUCCESS":
								console.log("Status: Success");
								var contentString = JSON.stringify(contArr);
								var q2 = "SELECT id FROM users WHERE email = '" + email + "'";
								connection.query(q2, function (e2, r2) {
									if (e2) throw e2;
									if (r2.length == 1) {
										var userid = r2[0]['id'];
										sendme(userid);
									} else {
										sendme(0);
									}
								});

								function sendme(a) {
									userid = a;
									var q3 = "INSERT INTO order_status (user_id, order_contents, business, email, phone, d_addr1, d_addr2, d_pc, d_city, b_addr1, b_addr2, b_pc, b_city, total_cost, delivery_cost) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)";
									sumTotal = String(Math.round(sumTotal * 100) / 100);
									connection.query(q3, [userid, contentString, business, email, phone, d_addr1, d_addr2, d_pc, d_city, b_addr1, b_addr2, b_pc, b_city, sumTotal, dcc(Number(deliveryTotal))], function (e3, r3) {
										if (e3) throw e3;
										res.status(200).send({
											information: "payment accepted",
											payment: "ACCEPTED",
											amount: (dcc(Number(deliveryTotal)) + (Math.round(sumTotal * 100)) / 100),
											orderid: r3.insertId
										});

									});
								}

								break;
							case "FAILED":
								console.log("Status: Failed");
								res.status(404).send({
									information: "payment failed",
									payment: "FAILED"
								});
								break;
							case "ERROR":
								console.log("Status: Error");
								res.status(400).send({
									information: "payment error",
									payment: "ERROR"
								});
								break;
							default:
								console.log("Status: Unknown");
								res.status(500).send({
									information: "unknown",
									payment: "UNKNOWN"
								});
						}
					});
				});
			} catch (e) { // try & catch
				console.log(e);
			}
		});
	}
}
