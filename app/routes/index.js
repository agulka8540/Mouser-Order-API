var fs = require('fs');
var formidable = require('formidable');
var csv = require('csvtojson');
var request = require('request');
var express = require('express');
var router = express.Router();

const partNrField = "field4";
const max_query_items = 50;

var bodyParser = require('body-parser');

var keys = require('./keys.json');

router.use(bodyParser.json());
router.use(bodyParser.urlencoded({extended: false}));

router.get('/', function(req, res) {
    res.render('index');
});
//Search API
router.post('/', function (req, res, next) {//download file from browser
    var form = new formidable.IncomingForm();
    form.parse(req);
    form.on('fileBegin', function (name, file) {
        res.locals.BOMname = file.name;
        file.path = __dirname + '/uploads/' + res.locals.BOMname;
    });
    form.on('file', function (name, file) {
        console.log('2. Uploaded ' + res.locals.BOMname);
        next();
    });
}, function (req, res, next) {//convert from csv to JSON and parse relevant rows
    const csvFilePath = __dirname + '/uploads/' + res.locals.BOMname;
    csv({noheader: true})
    .fromFile(csvFilePath)
    .then((jsonObj)=>{
        var parsedBOM = {};
        var parsedBOM_n = 0;
        for (var key in jsonObj) {
            var item = jsonObj[key];
            if (item.field2 == "x" || item.field2 == "w") {
                parsedBOM[key] = {"quantity": item.field1, "part number": item[partNrField]};        
                ++parsedBOM_n;
            }
        }
        res.locals.parsedBOM = parsedBOM;
        res.locals.parsedBOM_n = parsedBOM_n;
        fs.unlink(csvFilePath,function (err) {
            if (err) throw err;
        });
        next();     
    });
}, function (req, res, next) {//send requests to Mouser Search API
    console.log('send requests to Mouser Search API');
    var n_requests_sent = 0;
    var n_requests_done = 0;
    var n_requests_total = Math.min(max_query_items, res.locals.parsedBOM_n);
    var mouser_resp={};
    for (var key in res.locals.parsedBOM) {
        var item = res.locals.parsedBOM[key];
        console.log(key);
        (function(key,item){  // preserve key and item for post() callback
        ++n_requests_sent;
        request.post('https://api.mouser.com/api/v1/search/keyword?apiKey='+ keys.searchApiKey,
        {json: {"SearchByKeywordRequest": {
              "keyword": item["part number"],
              "records": 10,  //item.quantity,
              "startingRecord": 0,
              "searchOptions": "",
              "searchWithYourSignUpLanguage": ""
            }}}, function (error, mouser_res, body) {
                if (error) {
                    console.error(error);
                    console.log('error here');
                } else {
                    console.log(`statusCode: ${mouser_res.statusCode} for ${key}`);
                    body.SearchResults.Parts = body.SearchResults.Parts.filter(function(part) {//filter response array
                        return part.MouserPartNumber !== "N/A" && part.PriceBreaks.length > 0;
                    });
                    
                    mouser_resp[key] = body;
                }
                ++n_requests_done;
                if(n_requests_done == n_requests_total) {
                    console.log(`done retrieving all ${n_requests_total} responses`);
                    res.locals.mouser_resp = mouser_resp;
                    next();
                }                
            }
        )})(key, item);

        if(n_requests_sent >= n_requests_total) {
            break;
        }
    }

    //res.json(res.locals.parsedBOM);
}, function (req, res, next) {//generate web page with results
    //res.json(res.locals.mouser_resp);
    res.render('results', {
        mouserObj: res.locals.mouser_resp,
        BOMObj: res.locals.parsedBOM
    });   
});

//Cart API
router.post('/cart', function (req, res, next) {//insert one part into cart (firstI) to get CartKey
    var cartItemsObj = JSON.parse(req.body.cartItems);
    var firstI = cartItemsObj[0];

    request.post('https://api.mouser.com/api/v1/cart/items/insert?apiKey='+ keys.cartApiKey,
    {
        json: firstI
    }, function(error, response, body) {
        if (error) {
            console.error(error);
            return;
        }
        console.log(`statusCode: ${response.statusCode}`);
        res.locals.CartKey = body.CartKey;
        next();
    });

}, function(req, res, next) {//update cart with all the BOM parts
    request.post('https://api.mouser.com/api/v1/cart?apiKey='+ keys.cartApiKey,
    {
        json: {
            "CartKey": res.locals.CartKey,
            "CartItems": JSON.parse(req.body.cartItems)
        }
    }, function (error, response, body) {
        if (error) {
            console.error('My error'+error);
            return;
        }
        console.log(`statusCode: ${response.statusCode}`);
        res.json(body);
    });
});

module.exports = router;

