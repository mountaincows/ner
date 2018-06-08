module.exports = function(app, connection, request, postcode){
    app.post('/payment', function(req,res){

        function deliveryCost(units){
            return (Math.ceil(units / 15) * 15);
        }

        var body = req.body;

        var name = body.name,
            business = body.business,
            phone = body.phone,
            email = body.email,
            addr1 = body.addr1,
            addr2 = body.addr2,
            pc = body.pc,
            city = body.city,
            cardNumber = body.cardNumber,
            cardExpMonth = body.cardExpMonth,
            cardExpYear = body.cardExpYear,
            cardCVC = body.cardCVC,
            order = body.order;

        var getCost = "";
        var whenThen = "";
        var objArr = [];
        var contArr = [];
        var sumTotal = 0;
        var deliveryTotal = 0;
        var orderDesc = "";

        for(let i = 0; i < order.length; i++){
            whenThen += "WHEN " + order[i].uid + " THEN " + (i + 1) + " ";
            if( i == order.length - 1){
                getCost += order[i].uid;
            }else{
                getCost += order[i].uid + ", ";
            }
        }

        var pCode = new postcode(pc);
        if(pCode.valid() != true){
            res.send({
                error : "Postcode is not valid in the UK"
            })
            console.log("invalid pc");
            return;
        }

        var query = "SELECT uid,cost,name,delivery_unit FROM epas_products WHERE uid in (" + getCost + ") ORDER BY (CASE uid " + whenThen + " END)";
        console.log(order);
        try{
            console.log("up to try");
            connection.query(query, function(error, results){
                if(error) throw error;
                // console.log(results);
                if(results.length == 0 || results.length != order.length){
                    res.status(400).send({
                        error : "payment error",
                        payment : "ERROR"
                    });
                    return;
                }
                for(var i = 0; i < order.length; i++){
                    // console.log(order)
                    if(order[i].quant >= 1){
                        objArr.push({
                            uid: order[i].uid,
                            id : order[i].id,
                            quantity: order[i].quant,
                            costPU : results[i].cost,
                            costTotal : (order[i].quant * Number(results[i].cost)).toFixed(2)
                        });
                        contArr.push({
                            uid: results[i].uid,
                            name: results[i].name,
                            id: order[i].id,
                            quantity: order[i].quant,
                            costPU : results[i].cost,
                            costTotal : (order[i].quantity * results[i].cost).toFixed(2),
                            deliveryUnit : results[i].delivery_unit
                        });
                    }
                }
                console.log("objArr" + "\r\n")
                console.log(objArr);

                for(var i = 0; i < objArr.length; i++){
                    sumTotal += Number(objArr[i].costTotal);
                    deliveryTotal += Number(contArr[i].quantity) * Number(contArr[i].deliveryUnit);
                    orderDesc += (i + 1) + ") " + contArr[i].name + " x " + contArr[i].quantity + " = " + (Number(contArr[i].costPU) * Number(contArr[i].quantity)).toFixed(2) + "\r\n";
                }
                var amount = Number(sumTotal) + deliveryCost(deliveryTotal); // This is 2 dec places
                var totalDelivery = Number(deliveryCost(deliveryTotal)).toFixed(2);
                orderDesc += "Total pre-delivery: " + sumTotal + "\r\n" + "Delivery" + deliveryCost(deliveryTotal) + "\r\nTotal: " + amount;
                // console.log(contArr);
                console.log("delivery Cost: " + totalDelivery)
                console.log("amount: " +  amount);
                if(orderDesc.length > 254){
                        orderDesc = orderDesc.substr(0, 253);
                }
                var paymentObj = { //obj to send off to WorldPay
                    "paymentMethod": {
                        "type": "Card",
                        "name": name,
                        "expiryMonth": cardExpMonth,
                        "expiryYear": "20" + cardExpYear,
                        "cardNumber": cardNumber,
                        "cvc": cardCVC,
                        "issueNumber": "1"
                    },
                    "orderType": "ECOM",
                    "orderDescription": orderDesc,
                    "customerOrderCode": 123,
                    "amount": (amount * 100).toFixed(0),
                    "currencyCode": "GBP"
                }
                console.log("up to request");
                request({
                    url : "https://api.worldpay.com/v1/orders",
                    method : "POST",
                    json: true,
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "T_S_73c02fe7-f9f6-4d07-a594-9d1774181890"
                    },
                    body: paymentObj
                }, function(err2, res2, body2){
                    // console.log(amount);
                    console.log(res2.body)
                    switch(res2.body.paymentStatus){
                        case "SUCCESS":
                            var contentString = JSON.stringify(contArr);
                            var query2 = "SELECT id FROM users WHERE email = '" + email + "'";
                            connection.query(query2, function(err3, res3){
                                if(err3) throw err3;
                                console.log(res3)
                                if(res3.length == 1){
                                    var userid = res3[0]['id'];
                                    insertID(userid, amount);
                                }else{
                                    insertID(0, amount);
                                }
                            });

                            function insertID(userid, amount){
                                var query3 = "INSERT INTO order_status (user_id, order_contents, business, email, phone, d_addr1, d_addr2, d_pc, d_city, total_cost, delivery_cost) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
                                var total_cost = sumTotal.toFixed(2);
                                connection.query(query3, [userid, contentString, business, email, phone, addr1, addr2, pc, city, sumTotal, totalDelivery], function(e4, r4){
                                    if (e4) throw e4;
                                    res.status(200).send({
                                        payment : "ACCEPTED",
                                        amount,
                                        orderid: r4.insertId
                                    });
                                    console.log(r4.insertId);
                                });
                            }
                        break;
                        case "FAILED":
                            res.status(404).send({
                                error : "Payment Failed",
                                payment: "FAILED"
                            });
                        break;
                        case "ERROR":
                            res.status(400).send({
                                error : "Payment Error",
                                payment : "ERROR"
                            });
                        break;
                        default:
                            res.status(500).send({
                                error : "UNKNOWN",
                                payment : "UNKNOWN"
                            });
                    }

                });
                })

            }catch(e){
                console.log(e);
            }
        });
    }
